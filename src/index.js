require('dotenv').config();
const { itemIds } = require('./config');
const TransactionService = require('./services/transactionService');

const transactionService = new TransactionService(
  process.env.PLUGGY_CLIENT_ID,
  process.env.PLUGGY_CLIENT_SECRET
);

async function main() {
  
  // Fetch and display transactions
  console.log('\nTransactions:');
  await transactionService.fetchTransactions(itemIds);

  // Get unique categories
  const categories = await transactionService.getUniqueCategories(itemIds);
  console.log('\nUnique Categories:');
  console.log(categories.join('\n'));
  
}

// Run the application
main(); 