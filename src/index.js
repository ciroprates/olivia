require('dotenv').config();
const path = require('path');
const { banks, options } = require('../config');
const TransactionService = require('./services/transactionService');
const { generateCSV, getTransactionsArray } = require('./utils/csvUtils');
const { updateSheet } = require('./services/googleSheetsService');

const transactionService = new TransactionService(
  process.env.PLUGGY_CLIENT_ID,
  process.env.PLUGGY_CLIENT_SECRET
);

async function main() {
  try {
    // Fetch and display transactions

    const transactions = await transactionService.fetchTransactions(banks, options);
    const transactionsWithInstallments = transactionService.createInstallmentTransactions(transactions);
    const { result: deduplicatedTransactions, removed } = await transactionService.deduplicateTransactions(transactionsWithInstallments);
    const csvPath = generateCSV(deduplicatedTransactions);

    if (process.env.GOOGLE_SPREADSHEET_ID) {
      const sheetData = getTransactionsArray(deduplicatedTransactions);
      await updateSheet(process.env.GOOGLE_SPREADSHEET_ID, 'Homologação', sheetData);
    }
    if (removed && removed.length > 0) {
      const removedCsvPath = generateCSV(removed, { prefix: 'transactions_removed' });
    }
  } catch (error) {
    console.error('Erro:', error.message);
  }

  /* 
  const transactionDetails1 = await transactionService.fetchTransactionById('ade2427e-dbb0-467c-b5e6-b5745f8263f6');
  console.log(transactionDetails1);

  const transactionDetails2 = await transactionService.fetchTransactionById('51fe424e-4535-47a5-b293-8171a8be62d9');
  console.log(transactionDetails2);
  
  const transactionDetails3 = await transactionService.fetchTransactionById('854db86a-1958-4da8-9464-cfa96cb2828e');
  console.log(transactionDetails3);
  
  const transactionDetails4 = await transactionService.fetchTransactionById('69d92105-9995-488c-81db-424e30a0e66d');
  console.log(transactionDetails4);
  */

}

// Run the application
main();
