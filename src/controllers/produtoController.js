const asyncHandler = require('express-async-handler');
const Cultura = require('../models/produtoModel');
const User = require('../models/userModel');
const ExploracaoAgricola = require('../models/exploracaoAgricolaModel');
const Produto = require('../models/produtoModel');

// @desc    Criar uma nova cultura
// @route   POST /api/culturas
// @access  Private
// exports.criarCultura = asyncHandler(async (req, res) => {
//   const { nome, tipo, cicloCrescimento, exploracaoAgricola } = req.body;

//   const cultura = await Cultura.create({
//     nome,
//     tipo,
//     cicloCrescimento,
//     exploracaoAgricola,
//     usuario: req.user.id
//   });

//   res.status(201).json(cultura);
// });

// @desc    Obter todas as culturas do usuário
// @route   GET /api/culturas
// @access  Private
exports.getProduto = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  let query = {};
  
  // Se não for admin, só pode ver suas próprias culturas
  if (user.funcao !== 'admin') {
    query.usuario = req.user.id;
  }
  
  const produtos = await Produto.find(query);
  
  res.json(produtos);
});

// @desc    Obter uma cultura pelo ID
// @route   GET /api/culturas/:id
// @access  Private
exports.getProdutoById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const cultura = await Produto.findById(req.params.id)

  // Verificar se a cultura existe
  if (!cultura) {
    res.status(404);
    throw new Error('Produto não encontrada');
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
exports.atualizarProduto = asyncHandler(async (req, res) => {
  const cultura = await Produto.findById(req.params.id);

  if (cultura && cultura.Produto.toString() === req.user.id) {
    cultura.nome = req.body.nome || cultura.nome;
    cultura.tipo = req.body.categoria || cultura.categoria;
    cultura.cicloCrescimento = req.body.unidadeMedida || cultura.unidadeMedida;
    cultura.cicloCrescimento = req.body.precoPorUnidade || cultura.precoPorUnidade;
    cultura.cicloCrescimento = req.body.detalhes || cultura.detalhes;
    cultura.exploracaoAgricola = req.body.exploracaoAgricola || cultura.exploracaoAgricola;

    const updatedCultura = await Produto.save();
    res.json(updatedCultura);
  } else {
    res.status(404);
    throw new Error('Produto não encontrada');
  }
});

// @desc    Excluir uma cultura
// @route   DELETE /api/culturas/:id
// @access  Private
exports.excluirProduto = asyncHandler(async (req, res) => {
  const cultura = await Produto.findById(req.params.id);

  if (cultura && cultura.usuario.toString() === req.user.id) {
    await cultura.remove();
    res.json({ message: 'Produto removida' });
  } else {
    res.status(404);
    throw new Error('Produto não encontrada');
  }
});

// @desc    Obter culturas por tipo
// @route   GET /api/culturas/tipo/:tipo
// @access  Private
exports.getProdutoByTipo = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  let query = { categoria: req.params.categoria };
  
  if (user.funcao !== 'admin') {
    query.usuario = req.user.id;
  }
  
  const culturas = await Produto.find(query)
    .populate('exploracaoAgricola', 'nome');
  
  res.json(culturas);
});