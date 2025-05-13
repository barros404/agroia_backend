const express = require('express');
const router = express.Router();
const agenteController = require('../controllers/agenteController');
const { protect } = require('../middlewares/authMiddleware');

// Rotas de atividades
router.post('/atividades', protect, agenteController.criarAtividade);
router.put('/atividades/:idFormulario', protect, agenteController.atualizarAtividade);
router.post('/atividades/:idFormulario/submeter', protect, agenteController.submeterAtividade);

// Rotas de sincronização
router.post('/sincronizar', protect, agenteController.sincronizar);
router.get('/sincronizar/estado', protect, agenteController.sincronizar);

// Rotas de custos
router.get('/custos/parcela/:idParcela', protect, agenteController.obterCustosParcela);
router.get('/custos/cultura/:idCultura', protect, agenteController.obterCustosCultura);

// Rota de estado do sistema
router.get('/estado', protect, agenteController.obterEstadoSistema);

// Rotas de atividades (admin e gestor)
router.get('/atividades', protect, agenteController.listarAtividades);

// Rotas de equipamentos (admin e gestor)
router.get('/equipamentos', protect, agenteController.listarEquipamentos);


module.exports = router;
