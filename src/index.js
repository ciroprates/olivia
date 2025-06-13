require('dotenv').config();
const { itemIds } = require('./config');
const TransactionService = require('./services/transactionService');

const transactionService = new TransactionService(
  process.env.PLUGGY_CLIENT_ID,
  process.env.PLUGGY_CLIENT_SECRET
);

// Run the application
transactionService.fetchTransactions(itemIds); 