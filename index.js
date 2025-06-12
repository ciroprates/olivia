require('dotenv').config();
const { PluggyClient } = require('pluggy-sdk');
const { itemIds } = require('./config');

// Initialize the Pluggy client with your API key
const client = new PluggyClient({
  clientId: process.env.PLUGGY_CLIENT_ID,
  clientSecret: process.env.PLUGGY_CLIENT_SECRET,
});

async function fetchTransactions(itemIds) {
  try {
    for (const itemId of itemIds) {
      const item = await client.fetchItem(itemId);
      const bankName = item.connector.name;      
  
      const accountTypes = ['BANK', 'CREDIT'];
  
      for (const accountType of accountTypes) {
        const accountsResponse = await client.fetchAccounts(itemId, accountType);        
  
        for (const account of accountsResponse.results) {
          const transactions = await client.fetchTransactions(account.id);          
          transactions.results.forEach(transaction => {
            const date = new Date(transaction.date).toLocaleDateString();
            const amount = transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            console.log(`${date} | ${amount} | ${transaction.description} | ${accountType} | ${bankName} | ${account.owner}`);
          });
        }
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the application
fetchTransactions(itemIds); 