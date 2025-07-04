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



  async fetchTransactions(banks, options = {}) {
    try {
      const { excludeCategories = null, startDate = null } = options;
      const allTransactions = [];
      const pageSize = 100; // Tamanho máximo de página da API

      const effectiveStartDate = determineStartDate(startDate);
      
      for (const bank of banks) {
        let item = await this.client.fetchItem(bank.id);
        const bankName = bank.name;

        console.log(`Recuperado item=[${bank.id} - ${bankName}]. Status: ${item.status}. Última atualização: ${item.updatedAt.toLocaleDateString()}.`);

        // Caso última atualização seja anterior a 1 dia, atualiza o item
        const oneDayInMs = 24 * 60 * 60 * 1000;
        if (item.updatedAt && (Date.now() - item.updatedAt) > oneDayInMs) { 
          await this.client.updateItem(bank.id);

          while (item.status === 'UPDATING' || item.updatedAt && (Date.now() - item.updatedAt) > oneDayInMs) {
            // wait a few seconds before next request (to prevent 429 error response)
            await sleep(2000)

            // retrieve item status
            item = await this.client.fetchItem(bank.id)
            console.log(`Item [${bank.id} - ${bankName}] status: ${item.status}, status da execução: ${item.executionStatus}`)
          }
            
          console.log(`Atualização do item=[${bank.id} - ${bankName}] realizada. Última atualização: ${item.updatedAt.toLocaleDateString()}.`);
        }

        const accountTypes = [ACCOUNT_TYPES.BANK, ACCOUNT_TYPES.CREDIT];
        
        for (const accountType of accountTypes) {
          const accountsResponse = await this.client.fetchAccounts(bank.id, accountType);
          
          for (const account of accountsResponse.results) {
            let page = 1;
            let hasMore = true;
            
            while (hasMore) {
              const transactions = await this.client.fetchTransactions(account.id, {
                from: effectiveStartDate,
                page,
                pageSize
              });
              
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
      
    } catch (error) {
      console.error('Error:', error.message);
      return [];
    }
  }
}

module.exports = TransactionService; 