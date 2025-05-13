const express = require('express');
const router = express.Router();
const { 
  sincronizarAtividadesDispositivo,
  obterAtividadesSync
} = require('../controllers/syncController');
const { protect } = require('../middlewares/authMiddleware');

// Todas as rotas requerem autenticação
router.use(protect);

// Rotas de sincronização
router.route('/atividades')
  .post(sincronizarAtividadesDispositivo)
  .get(obterAtividadesSync);

module.exports = router;
