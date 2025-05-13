const asyncHandler = require('express-async-handler');
const { 
  sincronizarAtividades, 
  obterAtividadesParaSincronizacao 
} = require('../services/syncService');

// @desc    Sincronizar atividades do dispositivo
// @route   POST /api/sync/atividades
// @access  Private
exports.sincronizarAtividadesDispositivo = asyncHandler(async (req, res) => {
  const { atividades } = req.body;
  const userId = req.user.id;
  
  const resultado = await sincronizarAtividades(userId, atividades);
  
  if (resultado.sucesso) {
    res.status(200).json(resultado);
  } else {
    res.status(400).json(resultado);
  }
});

// @desc    Obter atividades para sincronização
// @route   GET /api/sync/atividades
// @access  Private
exports.obterAtividadesSync = asyncHandler(async (req, res) => {
  const { ultimaSincronizacao } = req.query;
  const userId = req.user.id;
  
  const resultado = await obterAtividadesParaSincronizacao(userId, ultimaSincronizacao);
  
  if (resultado.sucesso) {
    res.status(200).json(resultado);
  } else {
    res.status(400).json(resultado);
  }
});
