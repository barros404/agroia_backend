const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Verificar se o arquivo de backup foi fornecido
const backupFile = process.argv[2];
if (!backupFile) {
  console.error('Uso: node restoreDB.js <nome_arquivo_backup>');
  process.exit(1);
}

const backupDir = path.join(__dirname, '..', '..', 'backups');
const backupFilePath = path.join(backupDir, backupFile);

// Verificar se o arquivo existe
if (!fs.existsSync(backupFilePath)) {
  console.error(`Arquivo de backup não encontrado: ${backupFilePath}`);
  process.exit(1);
}

// Obter a string de conexão do MongoDB das variáveis de ambiente
const mongoUri = process.env.MONGODB_URI;

// Comando do mongorestore
const cmd = `mongorestore --uri="${mongoUri}" --archive="${backupFilePath}" --gzip`;

console.log('Iniciando restauração do banco de dados...');
console.log(`ATENÇÃO: Isso substituirá os dados existentes no banco!`);
console.log('Pressione Ctrl+C para cancelar ou espere 5 segundos para continuar...');

// Aguardar 5 segundos antes de prosseguir
setTimeout(() => {
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`Erro ao restaurar backup: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return;
    }
    console.log(`Restauração realizada com sucesso a partir de: ${backupFilePath}`);
  });
}, 5000);
