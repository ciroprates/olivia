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

  /**
   * Atualiza um item e aguarda até que a atualização seja concluída
   * @param {string} itemId - ID do item a ser atualizado
   * @param {string} itemName - Nome do item para logs
   * @param {number} oneDayInMs - Tempo em milissegundos que define um dia
   * @returns {Promise<Object|null>} O item atualizado ou null em caso de erro
   * @private
   */
  async _updateAndWaitForItem(itemId, itemName, oneDayInMs) {
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
      } while (item.status === 'UPDATING' || (item.updatedAt && (Date.now() - item.updatedAt) > oneDayInMs));

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

    const effectiveStartDate = determineStartDate(startDate);

    for (const bank of banks) {
      let item;
      try {
        item = await this.client.fetchItem(bank.id);
      } catch (error) {
        console.error(`Erro ao buscar item do banco ${bank.id}:`, error.message);
        continue;
      }

      const bankName = bank.name;

      console.log(`Recuperado item=[${bank.id} - ${bankName}]. Status: ${item.status}. Última atualização: ${item.updatedAt.toLocaleDateString()}.`);

      // Caso última atualização seja anterior a 1 dia, atualiza o item
      const oneDayInMs = 24 * 60 * 60 * 1000;
      if (item.updatedAt && (Date.now() - item.updatedAt) > oneDayInMs) {
        try {
          item = await this._updateAndWaitForItem(bank.id, bankName, oneDayInMs);
          if (item) {
            console.log(`Atualização do item=[${bank.id} - ${bankName}] realizada. Última atualização: ${item.updatedAt.toLocaleDateString()}.`);
          }
        } catch (error) {
          console.error(`Erro ao atualizar item ${bank.id}:`, error.message);
          continue;
        }
      }

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
            });

            hasMore = transactions.page < transactions.totalPages;
            page++;
          }
        }
      }
    }

    console.log(`Recuperadas ${allTransactions.length} transações a partir da data ${effectiveStartDate}.`);
    return allTransactions;
 }
}

module.exports = TransactionService;