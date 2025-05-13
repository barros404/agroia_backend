const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const Equipamento = require("../models/equipamentoModel");

// @desc    Criar uma nova parcela
// @route   POST /api/parcelas
// @access  Private
exports.criarEquipamento = asyncHandler(async (req, res) => {
  const { nome, tipo, custoPorHora, detalhes, exploracaoAgricola } = req.body;

  const equipamento = await Equipamento.create({
    nome,
    tipo,
    custoPorHora,
    detalhes,
    exploracaoAgricola,
  });

  res.status(201).json(equipamento);
});

// @desc    Obter todas as parcelas do usuário
// @route   GET /api/parcelas
// @access  Private
exports.getEquipamento = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  let query = {};

  // Se não for admin, só pode ver suas próprias parcelas
  if (user.funcao !== "admin") {
    query.usuario = req.user.id;
  }

  const equipamentos = await Equipamento.find();
  res.status(200).json(equipamentos);
});

// @desc    Obter uma parcela pelo ID
// @route   GET /api/parcelas/:id
// @access  Private
exports.getEquipamentoById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const equipamentos = await Equipamento.findById(req.params.id);

  // Verificar se a parcela existe
  if (!equipamentos) {
    res.status(404);
    throw new Error("Parcela não encontrada");
  }

  // Se não for admin, verificar se a parcela pertence ao usuário
  if (user.funcao !== "admin") {
    res.status(403);
    throw new Error("Não autorizado a acessar esta parcela");
  }

  res.json(equipamentos);
});

// @desc    Atualizar uma parcela
// @route   PUT /api/parcelas/:id
// @access  Private
exports.atualizarEquipamento = asyncHandler(async (req, res) => {
  const parcela = await Equipamento.findById(req.params.id);

  if (parcela && parcela.usuario.toString() === req.user.id) {
    parcela.nome = req.body.nome || parcela.nome;
    parcela.area = req.body.tipo || parcela.tipo;
    parcela.tipoSolo = req.body.custoPorHora || parcela.custoPorHora;
    parcela.cultura = req.body.exploracaoAgricola || parcela.exploracaoAgricola;

    if (req.body.exploracaoAgricola) {
      parcela.cultura =
        req.body.exploracaoAgricola || parcela.exploracaoAgricola;
    }

    const updatedParcela = await Equipamento.save();
    res.json(updatedParcela);
  } else {
    res.status(404);
    throw new Error("Parcela não encontrada");
  }
});

// @desc    Excluir uma parcela
// @route   DELETE /api/parcelas/:id
// @access  Private
exports.excluirEquipamento = asyncHandler(async (req, res) => {
  const parcela = await Equipamento.findById(req.params.id);

  if (parcela && parcela.usuario.toString() === req.user.id) {
    await parcela.remove();
    res.json({ message: "Parcela removida" });
  } else {
    res.status(404);
    throw new Error("Parcela não encontrada");
  }
});
// @desc    Obter Equipamento por tipo
// @route   GET /api/equipamento/tipo/:tipo
// @access  Private
exports.getEquipamentoByTipo = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  let query = { categoria: req.params.categoria };

  if (user.funcao !== "admin") {
    query.usuario = req.user.id;
  }
  const equipamentos = await Equipamento.find({ tipo: req.params.tipo });
  res.json(equipamentos);
});
