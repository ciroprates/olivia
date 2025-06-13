const { PluggyClient } = require('pluggy-sdk');
const {
  formatAmount,
  formatDate,
  formatAccountType,
  formatRecurringTransaction,
  formatDescription
} = require('../utils/formatters');

class TransactionService {
  constructor(clientId, clientSecret) {
    this.client = new PluggyClient({
      clientId,
      clientSecret
    });
  }

  async _fetchTransactionsData(itemIds) {
    const allTransactions = [];
    
    for (const itemId of itemIds) {
      const item = await this.client.fetchItem(itemId);
      const bankName = item.connector.name;
      const accountTypes = ['BANK', 'CREDIT'];
      
      for (const accountType of accountTypes) {
        const accountsResponse = await this.client.fetchAccounts(itemId, accountType);
        
        for (const account of accountsResponse.results) {
          const transactions = await this.client.fetchTransactions(account.id);
          transactions.results.forEach(transaction => {
            allTransactions.push({
              transaction,
              account,
              bankName,
              accountType
            });
          });
        }
      }
    }
    
    return allTransactions;
  }

  async fetchTransactions(itemIds) {
    try {
      const allTransactions = await this._fetchTransactionsData(itemIds);
      
      allTransactions.forEach(({ transaction, account, bankName, accountType }) => {
        const classification = transaction.type === 'DEBIT' ? 'Saída' : 'Entrada';
        const date = formatDate(transaction.date);
        const amount = formatAmount(transaction);
        const accountTypeFormatted = formatAccountType(accountType);
        const recurringTransaction = formatRecurringTransaction(transaction);
        const descriptionFormatted = formatDescription(transaction, recurringTransaction);
        
        console.log(`${classification}, ${date}, ${descriptionFormatted},  ${amount}, ${transaction.category},  ${account.owner}, ${bankName}, ${accountTypeFormatted}, ${recurringTransaction}`);
      });
    } catch (error) {
      console.error('Error:', error.message);
    }
  }

  async getUniqueCategories(itemIds) {
    try {
      const allTransactions = await this._fetchTransactionsData(itemIds);
      const categories = new Set();
      
      allTransactions.forEach(({ transaction }) => {
        if (transaction.category) {
          categories.add(transaction.category);
        }
      });
      
      return Array.from(categories).sort();
    } catch (error) {
      console.error('Error getting unique categories:', error.message);
      return [];
    }
  }
}

module.exports = TransactionService; 