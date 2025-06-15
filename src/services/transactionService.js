const { PluggyClient } = require('pluggy-sdk');
const fs = require('fs');
const path = require('path');
const {
  formatAmount,
  formatDate,
  formatAccountType,
  formatRecurringTransaction,
  formatDescription,
  formatOwner,
  formatCategory,
  formatClassification
} = require('../utils/formatters');
const { CSV_HEADER, ACCOUNT_TYPES } = require('../constants');

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

  async fetchAccounts (itemId) {
    const item = await this.client.fetchItem(itemId);
    const bankName = item.connector.name;
    const accountTypes = [ACCOUNT_TYPES.BANK, ACCOUNT_TYPES.CREDIT];
    const accounts = [];

    for (const accountType of accountTypes) {
      const accountsResponse = await this.client.fetchAccounts(itemId, accountType);
      
      for (const account of accountsResponse.results) {
        // Cria lista de contas
        accounts.push({
          account,
          bankName,
          accountType
        });
      }
    }
    
    return accounts;
  }
  
  async formatTransactions(transactions) {
    const header = CSV_HEADER + '\n';
    const rows = transactions.map(({ transaction, account, bankName, accountType }) => {
      const classification = formatClassification(transaction.type);
      const date = formatDate(transaction.date);
      const amount = formatAmount(transaction);
      const accountTypeFormatted = formatAccountType(accountType);
      const recurringTransaction = formatRecurringTransaction(transaction);
      const descriptionFormatted = formatDescription(transaction);
      const categoryFormatted = formatCategory(transaction.category);
      const ownerFormatted = formatOwner(account.owner);
      
      return `"${classification}", "${date}", "${descriptionFormatted}", "${amount}", "${categoryFormatted}", "${ownerFormatted}", "${bankName}", "${accountTypeFormatted}", "${recurringTransaction}"`;
    });

    return header + rows.join('\n');
  }

  

  async fetchTransactions(itemIds, options = {}) {
    try {
      const { excludeCategories = null, startDate = this.getFirstDayOfPreviousMonth() } = options;
      const allTransactions = [];
      const pageSize = 100; // Tamanho máximo de página da API
      
      for (const itemId of itemIds) {
        const accounts = await this.fetchAccounts(itemId);
          
        for (const account of accounts) {
          let page = 1;
          let hasMore = true;
          
          while (hasMore) {
            const transactions = await this.client.fetchTransactions(account.account.id, {
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
                  account: account.account,
                  bankName: account.bankName,
                  accountType: account.accountType
                });
              }
            });
            
            hasMore = transactions.page < transactions.totalPages;
            page++;
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