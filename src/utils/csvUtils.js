const fs = require('fs');
const path = require('path');


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
  generateCSV
}; 