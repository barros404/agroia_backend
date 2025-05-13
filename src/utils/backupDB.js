const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const backupDir = path.join(__dirname, "..", "..", "backups");

// Garantir que o diretório de backups existe
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/:/g, "-");
const backupFileName = `agro_ia_backup_${timestamp}.gz`;
const backupFilePath = path.join(backupDir, backupFileName);

// Obter a string de conexão do MongoDB das variáveis de ambiente
const mongoUri = process.env.MONGODB_URI;
// Extrair nome do banco de dados da URI
const dbName = mongoUri.split("/").pop().split("?")[0];

// Comando do mongodump
const cmd = `mongodump --uri="${mongoUri}" --archive="${backupFilePath}" --gzip`;

console.log("Iniciando backup do banco de dados...");
exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.error(`Erro ao realizar backup: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
    return;
  }
  console.log(`Backup realizado com sucesso: ${backupFilePath}`);
});
