const express = require('express');
const router = express.Router();

// Importar todas as rotas
const authRoutes = require('./authRoutes');
const usuarioRoutes = require('./usuarioRoutes');
const atividadeRoutes = require('./atividadeRoutes');

// Usar as rotas
router.use('/auth', authRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/atividades', atividadeRoutes);

module.exports = router; 