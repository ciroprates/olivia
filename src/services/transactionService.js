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
const { CSV_HEADER } = require('../constants');

class TransactionService {
  constructor(clientId, clientSecret) {
    this.client = new PluggyClient({
      clientId,
      clientSecret
    });
  }

  async _fetchTransactionsData(itemIds, options = {}) {
    const { includeCategories = null, excludeCategories = null } = options;
    const allTransactions = [];
    const startDate = '2025-04-01';
    const pageSize = 100; // Tamanho máximo de página da API
    
    for (const itemId of itemIds) {
      const item = await this.client.fetchItem(itemId);
      const bankName = item.connector.name;
      const accountTypes = ['BANK', 'CREDIT'];
      
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
              const shouldInclude = !includeCategories || (category && includeCategories.includes(category));
              const shouldExclude = excludeCategories && category && excludeCategories.includes(category);
              
              if (shouldInclude && !shouldExclude) {
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
  }

  _formatTransactions(transactions) {
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

  _generateCSV(content) {
    // Cria o diretório de saída se não existir
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Gera nome do arquivo com data e hora
    const now = new Date();
    const fileName = `transactions_${now.toISOString().slice(0,19).replace(/[:]/g, '-')}.csv`;
    const filePath = path.join(outputDir, fileName);

    // Prepara e escreve o conteúdo do CSV
    
    fs.writeFileSync(filePath, content);
    
    return filePath;
  }

  async fetchTransactions(itemIds, options = {}) {
    try {
      const allTransactions = await this._fetchTransactionsData(itemIds, options);
      const content = this._formatTransactions(allTransactions);
      const filePath = this._generateCSV(content);
      console.log(`\nArquivo CSV gerado: ${filePath}`);
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