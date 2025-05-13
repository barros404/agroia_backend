const connectDB = require('../config/database');
const seedData = require('../utils/seedData');

// Conectar ao banco de dados e executar o seed
connectDB()
  .then(() => {
    return seedData();
  })
  .then(() => {
    console.log('Seed completo');
    process.exit();
  })
  .catch((error) => {
    console.error(`Erro: ${error.message}`);
    process.exit(1);
  });
