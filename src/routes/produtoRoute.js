const express = require('express');
const router = express.Router();
const { 
  getProduto, 
  getProdutoById, 
  atualizarProduto, 
  excluirProduto,
  getProdutoByTipo
} = require('../controllers/produtoController');
const { protect } = require('../middlewares/authMiddleware');

// Todas as rotas requerem autenticação
router.use(protect);

router.route('/')
  .get(getProduto);

router.get('/tipo/:tipo', getProdutoByTipo);

router.route('/:id')
  .get(getProdutoById)
  .put(atualizarProduto)
  .delete(excluirProduto);

module.exports = router;