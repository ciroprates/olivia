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
    
    return `"${classification}", "${date}", "${descriptionFormatted}", "${amount}", "${categoryFormatted}", "${ownerFormatted}", "${bankName}", "${accountTypeFormatted}", "${recurringTransaction}", "${transaction.id}"`;
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
  return match[1].split('T')[0];;
}

function determineStartDate(startDate = null, updatedAt = null) {
  // Se já tivermos uma data de início, retorna ela
  if (startDate) {
    return startDate; 
  }

  // Tenta obter a data do último CSV
  const lastCSVDate = getLastCSVDate();
  
  // Converte as datas para poder comparar
  const lastCSVDateObj = lastCSVDate ? new Date(lastCSVDate) : null;
  const updatedAtObj = updatedAt ? new Date(updatedAt) : null;

  // Escolhe a data mais antiga entre as disponíveis
  if (lastCSVDateObj && updatedAtObj) {
    return lastCSVDateObj < updatedAtObj ? lastCSVDate : updatedAt.toISOString().split('T')[0];
  } else if (lastCSVDateObj) {
    return lastCSVDate;
  } else if (updatedAtObj) {
    return updatedAt.toISOString().split('T')[0];
  } else {
    // Se não tivermos data do CSV nem data de atualização, usa ontem
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
}

function today() {
  const now = new Date();
  // Usa o fuso horário de Brasília
  const brazilNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  // Retorna no formato YYYY-MM-DD
  return brazilNow.toISOString().split('T')[0];
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
    return null;
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
  determineStartDate,
  today
}; 