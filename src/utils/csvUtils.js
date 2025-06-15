const fs = require('fs');
const path = require('path');

function getLastCsvDate() {
  const csvPath = path.join(__dirname, '..', 'transactions.csv');
  if (fs.existsSync(csvPath)) {
    const stats = fs.statSync(csvPath);
    return new Date(stats.mtime);
  }
  return null;
}

function shouldUpdateItem(lastCsvDate) {
  if (!lastCsvDate) return true;
  
  const currentDate = new Date();
  const oneDayInMs = 24 * 60 * 60 * 1000;
  return (currentDate - lastCsvDate) > oneDayInMs;
}

function generateCSV(content) {
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
  
  fs.writeFileSync(filePath, content);
  
  return filePath;
}

module.exports = {
  getLastCsvDate,
  shouldUpdateItem,
  generateCSV
}; 