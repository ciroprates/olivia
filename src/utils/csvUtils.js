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
} = require('./formatters');
const { CSV_HEADER } = require('../constants');

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

function getLastCSVContent() {
  const outputDir = path.join(process.cwd(), 'output');
  if (!fs.existsSync(outputDir)) {
    return '';
  }

  const files = fs.readdirSync(outputDir)
    .filter(file => file.startsWith('transactions_'))
    .sort()
    .reverse();

  if (files.length === 0) {
    return '';
  }

  const lastFile = path.join(outputDir, files[0]);
  return fs.readFileSync(lastFile, 'utf8');
}

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

  // Lê o conteúdo do último CSV
  const lastCSVContent = getLastCSVContent();
  const lastTransactions = new Set(lastCSVContent.split('\n').slice(1)); // Ignora o header

  // Filtra apenas as transações que não existem no último CSV
  const newTransactions = transactions.filter(({ transaction, account, bankName, accountType }) => {
    const row = formatTransactions([{ transaction, account, bankName, accountType }]).split('\n')[1];
    return !lastTransactions.has(row);
  });

  // Se não houver novas transações, retorna o caminho do último arquivo
  if (newTransactions.length === 0) {
    console.log('Nenhuma nova transação encontrada.');
    return path.join(outputDir, fs.readdirSync(outputDir)
      .filter(file => file.startsWith('transactions_'))
      .sort()
      .reverse()[0]);
  }

  // Prepara e escreve o conteúdo do CSV
  const content = formatTransactions(newTransactions);
  fs.writeFileSync(filePath, content);

  console.log(`\nArquivo CSV gerado: ${filePath}`);
  
  return filePath;
}

module.exports = {
  formatTransactions,
  generateCSV
}; 