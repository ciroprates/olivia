require('dotenv').config();
const { itemIds } = require('./config');
const TransactionService = require('./services/transactionService');

const transactionService = new TransactionService(
  process.env.PLUGGY_CLIENT_ID,
  process.env.PLUGGY_CLIENT_SECRET
);

async function main() {
  const options = {
    includeCategories: [      
      'Services',
      'Education',
      'Transfers'
    ],
    excludeCategories: [
     'Investments',
     'Same person transfer'
    ]
  };
  
  // Fetch and display transactions
  await transactionService.fetchTransactions(itemIds, options);

  // Get unique categories
  /*
  const uniqueCategories = await transactionService.getUniqueCategories(itemIds);
  console.log('\nUnique Categories:');
  console.log(uniqueCategories.join('\n'));
  */
}

// Run the application
main(); 