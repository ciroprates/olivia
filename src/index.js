require('dotenv').config();
const { itemIds } = require('./config');
const TransactionService = require('./services/transactionService');

const transactionService = new TransactionService(
  process.env.PLUGGY_CLIENT_ID,
  process.env.PLUGGY_CLIENT_SECRET
);

async function main() {
  const options = {    
    excludeCategories: [
     'Same person transfer',
     'Credit card payment'
    ],
    startDate: '2025-06-13'
  };
  
  try {
    // Fetch and display transactions
    await transactionService.fetchTransactions(itemIds, options);
  
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

// Run the application
main(); 