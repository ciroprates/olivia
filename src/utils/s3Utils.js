// Faz upload de 1 arquivo para o S3
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Cria o cliente S3 com as credenciais da AWS
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1'
});

async function uploadFile(filePath, bucketName, key) {
  try {
    const fileContent = fs.readFileSync(filePath);
    const params = {
      Bucket: bucketName,
      Key: key,
      Body: fileContent
    };

    const command = new PutObjectCommand(params);
    const response = await s3Client.send(command);
    console.log('Arquivo enviado com sucesso para o S3:', `https://${bucketName}.s3.amazonaws.com/${key}`);
    return response;
  } catch (err) {
    console.error('Erro ao fazer upload do arquivo para o S3:', err);
    throw err;
  }
}

// recupera o nome do arquivo a partir do path
function getFileNameFromPath(path) {
  return path.split('/').pop();
}

module.exports = {
  uploadFile
}