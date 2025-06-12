require('dotenv').config();
const { PluggyClient } = require('pluggy-sdk');
const { itemIds } = require('./config');

// Initialize the Pluggy client with your API key
const client = new PluggyClient({
  clientId: process.env.PLUGGY_CLIENT_ID,
  clientSecret: process.env.PLUGGY_CLIENT_SECRET,
});

function formatAmount(transaction) {
  const amount = transaction.amountInAccountCurrency !== null && transaction.amountInAccountCurrency !== undefined 
    ? transaction.amountInAccountCurrency 
    : transaction.amount;
    
  return Math.abs(amount).toLocaleString('en-US', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).replace('BRL', 'R$');
}

function formatDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function formatAccountType(accountType) {
  return accountType === 'BANK' ? 'Conta Corrente' : 'Cartão de Crédito';
}

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
            const classification = transaction.type === 'DEBIT' ? 'Saída' : 'Entrada';
            const date = formatDate(transaction.date);
            const amount = formatAmount(transaction);
            const accountTypeFormatted = formatAccountType(accountType);
            console.log(`${classification}, ${date},${transaction.description},  ${amount}, ${transaction.category},  ${account.owner}, ${bankName}, ${accountTypeFormatted}`);
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