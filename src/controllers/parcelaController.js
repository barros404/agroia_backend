const asyncHandler = require('express-async-handler');
const Parcela = require('../models/parcelaModel');
const User = require('../models/userModel');
const Cultura = require('../models/culturaModel');
const Produto = require('../models/produtoModel');

// @desc    Criar uma nova parcela
// @route   POST /api/parcelas
// @access  Private
exports.criarParcela = asyncHandler(async (req, res) => {
  const { nome, area, tipoSolo, cultura, coordenadas } = req.body;

  const parcela = await Parcela.create({
    nome,
    area,
    tipoSolo,
    cultura,
    coordenadas,
    usuario: req.user.id
  });

  res.status(201).json(parcela);
});

// @desc    Obter todas as parcelas do usuário
// @route   GET /api/parcelas
// @access  Private
exports.getParcelas = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  let query = {};
  
  // Se não for admin, só pode ver suas próprias parcelas
  if (user.funcao !== 'admin') {
    query.usuario = req.user.id;
  }
  
  const parcelas = await Parcela.find(query)
    .populate('cultura', 'nome tipo');
  
  res.json(parcelas);
});

// @desc    Obter uma parcela pelo ID
// @route   GET /api/parcelas/:id
// @access  Private
exports.getParcelaById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const parcela = await Parcela.findById(req.params.id)
    .populate('cultura', 'nome tipo');

  // Verificar se a parcela existe
  if (!parcela) {
    res.status(404);
    throw new Error('Parcela não encontrada');
  }

  // Se não for admin, verificar se a parcela pertence ao usuário
  if (user.funcao !== 'admin' && parcela.usuario.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Não autorizado a acessar esta parcela');
  }

  res.json(parcela);
});

// @desc    Atualizar uma parcela
// @route   PUT /api/parcelas/:id
// @access  Private
exports.atualizarParcela = asyncHandler(async (req, res) => {
  const parcela = await Parcela.findById(req.params.id);

  if (parcela && parcela.usuario.toString() === req.user.id) {
    parcela.nome = req.body.nome || parcela.nome;
    parcela.area = req.body.area || parcela.area;
    parcela.tipoSolo = req.body.tipoSolo || parcela.tipoSolo;
    parcela.cultura = req.body.cultura || parcela.cultura;
    
    if (req.body.coordenadas) {
      parcela.coordenadas = req.body.coordenadas;
    }

    const updatedParcela = await parcela.save();
    res.json(updatedParcela);
  } else {
    res.status(404);
    throw new Error('Parcela não encontrada');
  }
});

// @desc    Excluir uma parcela
// @route   DELETE /api/parcelas/:id
// @access  Private
exports.excluirParcela = asyncHandler(async (req, res) => {
  const parcela = await Parcela.findById(req.params.id);

  if (parcela && parcela.usuario.toString() === req.user.id) {
    await parcela.remove();
    res.json({ message: 'Parcela removida' });
  } else {
    res.status(404);
    throw new Error('Parcela não encontrada');
  }
});

// @desc    Obter parcelas por proximidade geográfica
// @route   GET /api/parcelas/nearby
// @access  Private
exports.getParcelasNearby = asyncHandler(async (req, res) => {
  const { longitude, latitude, distanceInMeters = 1000 } = req.query;

  if (!longitude || !latitude) {
    res.status(400);
    throw new Error('Longitude e latitude são obrigatórios');
  }

  const parcelas = await Parcela.find({
    coordenadas: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        },
        $maxDistance: parseInt(distanceInMeters)
      }
    },
    usuario: req.user.id
  }).populate('cultura', 'nome tipo');

  res.json(parcelas);
});
// listar todos os produtos
// exports.listarProdutos = asyncHandler(async (req, res) => {
//   const user = await User.findById(req.user.id);
//   if (user.funcao !== 'admin' && user.funcao !== 'gestor') {
//     return res.status(401).json({ 
//       sucesso: false, 
//       mensagem: 'Não autorizado como administrador ou gestor' 
//     });
//   }
//   const produtos = await Produto.find();

//   res.json(produtos);
// });

