const express = require('express');
const router = express.Router();
const { 
  getEquipamento, 
  getEquipamentoById, 
  atualizarEquipamento, 
  excluirEquipamento,
  getEquipamentoByTipo
} = require('../controllers/equipamentoController');
const { protect } = require('../middlewares/authMiddleware');

// Todas as rotas requerem autenticação
router.use(protect);

router.route('/')
  .get(getEquipamento);

router.get('/tipo/:tipo', getEquipamentoByTipo);

router.route('/:id')
  .get(getEquipamentoById)
  .put(atualizarEquipamento)
  .delete(excluirEquipamento);

module.exports = router;