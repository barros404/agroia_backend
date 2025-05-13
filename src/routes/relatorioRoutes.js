// routes/relatoriosRoutes.js

const express = require('express');
const router = express.Router();
const relatoriosController = require('../controllers/relatoriosController');
const { protect } = require('../middlewares/authMiddleware');

// Rotas específicas primeiro
router.get('/custos/parcela/:id', protect, relatoriosController.gerarRelatorioCustos);
router.get('/produtividade/parcela/:id', protect, relatoriosController.gerarRelatorioProdutividade);

// Rotas genéricas depois
router.get('/custos/:tipo/:id?', protect, relatoriosController.gerarRelatorioCustos);
router.get('/produtividade/:tipo/:id', protect, relatoriosController.gerarRelatorioProdutividade);

// Outras rotas...
router.get('/atividades', protect, relatoriosController.gerarRelatorioAtividades);
router.get('/equipamentos', protect, relatoriosController.gerarRelatorioEquipamentos);
router.get('/produtos', protect, relatoriosController.gerarRelatorioProdutos);
router.get('/personalizado/:tipo', protect, relatoriosController.gerarRelatorioPersonalizado);
router.get('/disponiveis', protect, relatoriosController.listarRelatoriosDisponiveis);
router.get('/gerados/:id', protect, relatoriosController.obterRelatorioGerado);

module.exports = router;