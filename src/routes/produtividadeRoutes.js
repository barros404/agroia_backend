const express = require('express');
const router = express.Router();
const produtividadeController = require('../controllers/produtividadeController');
const { protect } = require('../middlewares/authMiddleware');

// Rotas de análise de produtividade
router.get('/parcela/:idParcela',protect, produtividadeController.analisarProdutividadeParcela);
router.get('/cultura/:idCultura',protect, produtividadeController.analisarProdutividadeCultura);
router.get('/eficiencia',protect, produtividadeController.analisarEficienciaOperacional);
router.get('/tendencias/:idParcela',protect, produtividadeController.analisarTendenciasProdutividade);

// Rota de comparação genérica
router.get('/comparar/:tipoComparacao',protect, produtividadeController.compararDesempenho);

// Rotas de alertas e insights
router.post('/alertas',protect, produtividadeController.gerarAlertasProdutividade);
router.post('/insights',protect, produtividadeController.gerarInsightsProdutividade);

module.exports = router;