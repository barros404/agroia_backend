const asyncHandler = require('express-async-handler');
const Cultura = require('../models/culturaModel');
const User = require('../models/userModel');
const ExploracaoAgricola = require('../models/exploracaoAgricolaModel');

// @desc    Criar uma nova cultura
// @route   POST /api/culturas
// @access  Private
exports.criarCultura = asyncHandler(async (req, res) => {
  const { nome, tipo, cicloCrescimento, exploracaoAgricola } = req.body;

  const cultura = await Cultura.create({
    nome,
    tipo,
    cicloCrescimento,
    exploracaoAgricola,
    usuario: req.user.id
  });

  res.status(201).json(cultura);
});

// @desc    Obter todas as culturas do usuário
// @route   GET /api/culturas
// @access  Private
exports.getCulturas = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  let query = {};
  
  // Se não for admin, só pode ver suas próprias culturas
  if (user.funcao !== 'admin') {
    query.usuario = req.user.id;
  }
  
  const culturas = await Cultura.find(query)
    .populate('exploracaoAgricola', 'nome');
  
  res.json(culturas);
});

// @desc    Obter uma cultura pelo ID
// @route   GET /api/culturas/:id
// @access  Private
exports.getCulturaById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const cultura = await Cultura.findById(req.params.id)
    .populate('exploracaoAgricola', 'nome');

  // Verificar se a cultura existe
  if (!cultura) {
    res.status(404);
    throw new Error('Cultura não encontrada');
  }

  // Se não for admin, verificar se a cultura pertence ao usuário
  if (user.funcao !== 'admin' && cultura.usuario.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Não autorizado a acessar esta cultura');
  }

  res.json(cultura);
});

// @desc    Atualizar uma cultura
// @route   PUT /api/culturas/:id
// @access  Private
exports.atualizarCultura = asyncHandler(async (req, res) => {
  const cultura = await Cultura.findById(req.params.id);

  if (cultura && cultura.usuario.toString() === req.user.id) {
    cultura.nome = req.body.nome || cultura.nome;
    cultura.tipo = req.body.tipo || cultura.tipo;
    cultura.cicloCrescimento = req.body.cicloCrescimento || cultura.cicloCrescimento;
    cultura.exploracaoAgricola = req.body.exploracaoAgricola || cultura.exploracaoAgricola;

    const updatedCultura = await cultura.save();
    res.json(updatedCultura);
  } else {
    res.status(404);
    throw new Error('Cultura não encontrada');
  }
});

// @desc    Excluir uma cultura
// @route   DELETE /api/culturas/:id
// @access  Private
exports.excluirCultura = asyncHandler(async (req, res) => {
  const cultura = await Cultura.findById(req.params.id);

  if (cultura && cultura.usuario.toString() === req.user.id) {
    await cultura.remove();
    res.json({ message: 'Cultura removida' });
  } else {
    res.status(404);
    throw new Error('Cultura não encontrada');
  }
});

// @desc    Obter culturas por tipo
// @route   GET /api/culturas/tipo/:tipo
// @access  Private
exports.getCulturasByTipo = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  let query = { tipo: req.params.tipo };
  
  if (user.funcao !== 'admin') {
    query.usuario = req.user.id;
  }
  
  const culturas = await Cultura.find(query)
    .populate('exploracaoAgricola', 'nome');
  
  res.json(culturas);
});