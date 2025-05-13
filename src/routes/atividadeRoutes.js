const express = require('express');
const router = express.Router();
const {
  criarAtividade,
  listarAtividades,
  obterAtividade,
  atualizarAtividade,
  deletarAtividade
} = require('../controllers/atividadeController');
const { protect, admin } = require('../middleware/authMiddleware');

// Rotas protegidas que requerem autenticação
router.use(protect);

// Rotas para atividades
router.route('/')
  .post(admin, criarAtividade)
  .get(listarAtividades);

router.route('/:id')
  .get(obterAtividade)
  .put(admin, atualizarAtividade)
  .delete(admin, deletarAtividade);

module.exports = router; 