const { PluggyClient } = require('pluggy-sdk');
const { ACCOUNT_TYPES } = require('../constants');
const { determineStartDate } = require('../utils/csvUtils');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class TransactionService {
  constructor(clientId, clientSecret) {
    this.client = new PluggyClient({
      clientId,
      clientSecret
    });
  }

  _adjustInstallmentDescription(description, installmentNumber, totalInstallments) {
    if (!description) return description;

    // Try to find pattern like "01/12" or "1/12" (meaning 1 of N) and replace it with current installment
    const totalStr = totalInstallments.toString();
    const currentStr = installmentNumber.toString();
    // Regex matches "1/Total" or "01/Total" with optional padding on Total
    const regex = new RegExp(`\\b(0?)1\/(0?${totalStr})\\b`);

    if (regex.test(description)) {
      return description.replace(regex, (match, prefix, totalPart) => {
        // Maintain zero padding if present and needed
        const newCurrent = (prefix === '0' && installmentNumber < 10) ? '0' + currentStr : currentStr;
        return `${newCurrent}/${totalPart}`;
      });
    }

    // Fallback: append suffix if not present
    const suffix = `${installmentNumber}/${totalInstallments}`;
    return description.includes(suffix) ? description : `${description} - ${suffix}`;
  }

  /**
   * Cria transações futuras para compras parceladas que só retornaram a 1ª parcela
   * mantendo as mesmas informações de conta/banco, ajustando o número da parcela,
   * data (via formatter) e descrição.
   */
  createInstallmentTransactions(transactions) {
    const synthetic = [];

    transactions.forEach(item => {
      const tx = item.transaction || item;
      const meta = tx.creditCardMetadata;

      if (!meta || meta.totalInstallments <= 1 || meta.installmentNumber !== 1) return;

      for (let installmentNumber = 2; installmentNumber <= meta.totalInstallments; installmentNumber++) {
        const transactionWithInstallment = {
          ...tx,
          id: 'synthetic-parcel-' + tx.id + '-' + installmentNumber + '/' + meta.totalInstallments,
          description: this._adjustInstallmentDescription(tx.description, installmentNumber, meta.totalInstallments),
          descriptionRaw: this._adjustInstallmentDescription(tx.descriptionRaw, installmentNumber, meta.totalInstallments),
          creditCardMetadata: {
            ...meta,
            installmentNumber
          }
        };

        synthetic.push({
          ...item,
          transaction: transactionWithInstallment
        });
      }
    });

    return [...transactions, ...synthetic];
  }

  /**
   * Atualiza um item e aguarda até que a atualização seja concluída
   * @param {string} itemId - ID do item a ser atualizado
   * @param {string} itemName - Nome do item para logs
   * @param {number} oneHourInMs - Tempo em milissegundos que define uma hora
   * @returns {Promise<Object|null>} O item atualizado ou null em caso de erro
   * @private
   */
  async _updateAndWaitForItem(itemId, itemName, oneHourInMs) {
    try {
      await this.client.updateItem(itemId);

      let item;
      do {
        // Aguarda alguns segundos antes da próxima requisição (para evitar erro 429)
        await sleep(2000);

        // Busca o status do item
        try {
          item = await this.client.fetchItem(itemId);
          console.log(`Item [${itemId} - ${itemName}] status: ${item.status}, status da execução: ${item.executionStatus}`);
        } catch (error) {
          console.error(`Erro ao verificar status do item ${itemId}:`, error.message);
          return null;
        }
      } while (item.status === 'UPDATING' || (item.updatedAt && (Date.now() - item.updatedAt) >= oneHourInMs));

      console.log(`Atualização do item=[${bank.id} - ${bankName}] realizada. Última atualização: ${item.updatedAt.toLocaleDateString()}.`);
      return item;
    } catch (error) {
      console.error(`Erro ao atualizar item ${itemId}:`, error.message);
      throw error;
    }
  }

  async fetchTransactions(banks, options = {}) {
    const { excludeCategories = null, startDate = null } = options;
    const allTransactions = [];
    const pageSize = 100; // Tamanho máximo de página da API


    for (const bank of banks) {
      let item;
      try {
        item = await this.client.fetchItem(bank.id);
      } catch (error) {
        console.error(`Erro ao buscar item do banco ${bank.id}:`, error.message);
        continue;
      }

      let bankName = bank.name;

      // Ensure we have a valid date in ISO 8601 format
      const effectiveStartDate = determineStartDate(startDate, item.updatedAt);

      const accountTypes = [ACCOUNT_TYPES.BANK, ACCOUNT_TYPES.CREDIT];

      for (const accountType of accountTypes) {
        let accountsResponse;
        try {
          accountsResponse = await this.client.fetchAccounts(bank.id, accountType);
        } catch (error) {
          console.error(`Erro ao buscar contas do tipo ${accountType} para o banco ${bank.id}:`, error.message);
          continue;
        }

        for (const account of accountsResponse.results) {
          let page = 1;
          let hasMore = true;
          let accountTransactionsCount = 0;

          while (hasMore) {
            let transactions;
            try {
              transactions = await this.client.fetchTransactions(account.id, {
                from: effectiveStartDate,
                page,
                pageSize
              });
            } catch (error) {
              console.error(`Erro ao buscar transações da conta ${account.id}, página ${page}:`, error.message);
              hasMore = false;
              continue;
            }

            transactions.results.forEach(transaction => {
              const category = transaction.category;
              const shouldExclude = excludeCategories && category && excludeCategories.includes(category);

              if (!shouldExclude) {
                allTransactions.push({
                  transaction,
                  account,
                  bankName,
                  accountType
                });
              }
              accountTransactionsCount++;
            });

            hasMore = transactions.page < transactions.totalPages;
            page++;
          }

          console.log(`Recuperadas ${accountTransactionsCount} transações da conta ${account.name} do tipo ${accountType} do(a) ${bank.owner} a partir da data ${effectiveStartDate}. Última atualização: ${item.updatedAt.toLocaleDateString()}.`);
        }
      }
    }

    console.log(`Recuperadas um total de ${allTransactions.length} transações`);
    return allTransactions;
  }



  async fetchTransactionById(transactionId) {
    try {
      const transaction = await this.client.fetchTransaction(transactionId);
      return transaction;
    } catch (error) {
      console.error(`Erro ao buscar transação ${transactionId}:`, error.message);
      throw error;
    }
  }

  async deduplicateTransactions(items) {
    const bestByKey = new Map();
    const allByKey = new Map();

    for (const item of items) {
      const tx = item.transaction || item;
      if (!tx) continue;

      const dateVal = tx.date?.toISOString
        ? tx.date.toISOString().slice(0, 10)
        : (typeof tx.date === 'string' ? tx.date.slice(0, 10) : '');

      const key = [
        tx.accountId,
        tx.amount,
        dateVal,
        (tx.descriptionRaw || tx.description || '')
        // billId removed from key to allow matching across months
      ].join('|');

      if (!allByKey.has(key)) allByKey.set(key, []);
      allByKey.get(key).push(item);

      const currentUpdated = new Date(tx.updatedAt || 0);
      const existing = bestByKey.get(key);
      if (!existing) {
        bestByKey.set(key, item);
      } else {
        const existingTx = existing.transaction || existing;
        const existingUpdated = new Date(existingTx?.updatedAt || 0);
        if (currentUpdated > existingUpdated) {
          bestByKey.set(key, item);
        }
      }
    }

    const result = Array.from(bestByKey.values());
    const removed = [];
    for (const [key, list] of allByKey.entries()) {
      const best = bestByKey.get(key);
      for (const it of list) {
        if (it !== best) removed.push(it);
      }
    }

    console.log(`Deduplicadas ${removed.length} transações`);
    return { result, removed };
  }

}

module.exports = TransactionService;
