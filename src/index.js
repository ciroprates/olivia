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
    
  return Math.abs(amount).toFixed(2);
}

function formatDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function formatAccountType(accountType) {
  return accountType === 'BANK' ? 'Conta Corrente' : 'Cartão de Crédito';
}

function formatRecurringTransaction(transaction) {
  const totalInstallments = transaction.creditCardMetadata && transaction.creditCardMetadata.totalInstallments;
  return totalInstallments > 1 ? 'Sim' : 'Não';
}

function formatDescription(transaction, recurringTransaction) {
  const description = transaction.description;
  if (recurringTransaction === 'Sim' && transaction.creditCardMetadata) {
    const installmentSufix = `${transaction.creditCardMetadata.installmentNumber}/${transaction.creditCardMetadata.totalInstallments}`;
    if (!description.includes(installmentSufix)) {
      return `${description} - ${installmentSufix}`;  
    }
  }
  return description;
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
            const recurringTransaction = formatRecurringTransaction(transaction);
            const descriptionFormatted = formatDescription(transaction, recurringTransaction);
            console.log(`${classification}, ${date}, ${descriptionFormatted},  ${amount}, ${transaction.category},  ${account.owner}, ${bankName}, ${accountTypeFormatted}, ${recurringTransaction}`);
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