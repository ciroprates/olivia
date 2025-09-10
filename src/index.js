require('dotenv').config();
const path = require('path');
const { banks, options } = require('../config');
const TransactionService = require('./services/transactionService');
const { generateCSV } = require('./utils/csvUtils');
const { uploadFile } = require('./utils/s3Utils');
const { BUCKET_NAME } = require('./constants');

const transactionService = new TransactionService(
  process.env.PLUGGY_CLIENT_ID,
  process.env.PLUGGY_CLIENT_SECRET
);

async function main() {  
  try {
    // Fetch and display transactions
    const transactions = await transactionService.fetchTransactions(banks, options);
    const csvPath = generateCSV(transactions);
    if (csvPath) {
      const fileName = path.basename(csvPath);
      await uploadFile(csvPath, BUCKET_NAME, fileName);
    }
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

// Run the application
main(); 