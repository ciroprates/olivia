const fs = require('fs');
const path = require('path');
const {
  formatAmount,
  formatDate,
  formatOwner,
  formatClassification,
  formatAccountType,
  formatRecurringTransaction,
  formatDescription,
  formatCategory
} = require('../utils/formatters');
const { CSV_HEADER } = require('../constants');

function generateCSV(transactions) {
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
  const content = formatTransactions(transactions);
  fs.writeFileSync(filePath, content);
  
  return filePath;
}

function formatTransactions(transactions) {
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



module.exports = {  
  generateCSV
}; 