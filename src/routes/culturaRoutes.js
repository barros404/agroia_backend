const express = require('express');
const router = express.Router();
const { 
  criarCultura, 
  getCulturas, 
  getCulturaById, 
  atualizarCultura, 
  excluirCultura,
  getCulturasByTipo
} = require('../controllers/culturaController');
const { protect } = require('../middlewares/authMiddleware');

// Todas as rotas requerem autenticação
router.use(protect);

router.route('/')
  .post(criarCultura)
  .get(getCulturas);

router.get('/tipo/:tipo', getCulturasByTipo);

router.route('/:id')
  .get(getCulturaById)
  .put(atualizarCultura)
  .delete(excluirCultura);

module.exports = router;