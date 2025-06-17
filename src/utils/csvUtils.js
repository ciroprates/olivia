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

function getLastCSVFile() {
  const outputDir = path.join(process.cwd(), 'output');
  if (!fs.existsSync(outputDir)) {
    return null;
  }

  const files = fs.readdirSync(outputDir)
    .filter(file => file.startsWith('transactions_'))
    .sort()
    .reverse();

  if (files.length === 0) {
    return null;
  }

  return path.join(outputDir, files[0]);
}

function getLastCSVContent() {
  const lastFile = getLastCSVFile();
  if (!lastFile) {
    return '';
  }
  return fs.readFileSync(lastFile, 'utf8');
}

// Recupera data do último arquivo CSV
function getLastCSVDate() {
  const lastFile = getLastCSVFile();
  if (!lastFile) {
    return '';
  }
  // extrai data do nome do arquivo no formato ISO
  const match = lastFile.match(/transactions_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
  if (!match) {
    console.warn(`Formato de data não reconhecido no arquivo: ${lastFile}`);
    return '';
  }
  return match[1];
}

function determineStartDate(startDate = null) {
  // caso startDate não seja informado, usa a data do último arquivo CSV
  if (!startDate) {
    const lastCSVDate = getLastCSVDate();
    // Se não há arquivo CSV anterior, usa a data de ontem (no fuso de Brasília)
    if (!lastCSVDate) {
      const now = new Date();
      const brazilNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      brazilNow.setDate(brazilNow.getDate() - 1);
      startDate = brazilNow.toISOString().slice(0,10); // YYYY-MM-DD
    } else {
      // Pega apenas a parte da data (YYYY-MM-DD)
      const datePart = lastCSVDate.split('T')[0];
      // caso lastCSVDate seja hoje, usa a data de ontem
      const now = new Date();
      const brazilNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      const today = brazilNow.toISOString().slice(0,10);
      if (datePart === today) {
        brazilNow.setDate(brazilNow.getDate() - 1);
        startDate = brazilNow.toISOString().slice(0,10);
      } else {
        startDate = datePart;
      }
    }
  }
  return startDate;
}

function generateCSV(transactions) {
  // Cria o diretório de saída se não existir
  const outputDir = path.join(process.cwd(), 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Gera nome do arquivo com data e hora no formato ISO (fuso de Brasília)
  const now = new Date();
  const brazilNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const isoString = brazilNow.toISOString().slice(0,19).replace(/:/g, '-');
  const fileName = `transactions_${isoString}.csv`;
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
  generateCSV,  
  determineStartDate
}; 