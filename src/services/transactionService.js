const { PluggyClient } = require('pluggy-sdk');
const { ACCOUNT_TYPES } = require('../constants');

class TransactionService {
  constructor(clientId, clientSecret) {
    this.client = new PluggyClient({
      clientId,
      clientSecret
    });
  }

  getFirstDayOfPreviousMonth() {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    date.setDate(1);
    return date.toISOString().split('T')[0];
  }
  

  async fetchTransactions(itemIds, options = {}) {
    try {
      const { excludeCategories = null, startDate = this.getFirstDayOfPreviousMonth() } = options;
      const allTransactions = [];
      const pageSize = 100; // Tamanho máximo de página da API
      
      for (const itemId of itemIds) {
        const item = await this.client.fetchItem(itemId);
        const bankName = item.connector.name;

        console.log(`Recuperado item=[${itemId} - ${bankName}]. Status: ${item.status}.`);

        // Caso última atualização seja anterior a 1 dia, atualiza o item
        const oneDayInMs = 24 * 60 * 60 * 1000;
        if (item.updatedAt && (Date.now() - item.updatedAt) > oneDayInMs) { 
          await this.client.updateItem(itemId);
          console.log(`Atualização do item=[${itemId} - ${bankName}] solicitada. Última atualização: ${item.updatedAt.toLocaleDateString()}.`);
        }

        const accountTypes = [ACCOUNT_TYPES.BANK, ACCOUNT_TYPES.CREDIT];
        
        for (const accountType of accountTypes) {
          const accountsResponse = await this.client.fetchAccounts(itemId, accountType);
          
          for (const account of accountsResponse.results) {
            let page = 1;
            let hasMore = true;
            
            while (hasMore) {
              const transactions = await this.client.fetchTransactions(account.id, {
                from: startDate,
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
      
      return allTransactions;
      
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
}

module.exports = TransactionService; 