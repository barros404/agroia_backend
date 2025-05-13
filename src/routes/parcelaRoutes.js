const express = require('express');
const router = express.Router();
const { 
  criarParcela, 
  getParcelas, 
  getParcelaById, 
  atualizarParcela, 
  excluirParcela,
  getParcelasNearby,
  listarProdutos
} = require('../controllers/parcelaController');
const { protect } = require('../middlewares/authMiddleware');

// Todas as rotas requerem autenticação
router.use(protect);

router.route('/')
  .post(criarParcela)
  .get(getParcelas);

router.get('/nearby', getParcelasNearby);

router.route('/:id')
  .get(getParcelaById)
  .put(atualizarParcela)
  .delete(excluirParcela);



module.exports = router;
