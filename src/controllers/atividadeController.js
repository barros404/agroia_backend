const asyncHandler = require('express-async-handler');
const Atividade = require('../models/atividadeModel');
const User = require('../models/userModel');
const Parcela = require('../models/parcelaModel');
const Equipamento = require('../models/equipamentoModel');
const Produto = require('../models/produtoModel');
const { handleError } = require('../utils/errorHandler');

// @desc    Criar uma nova atividade (admin)
// @route   POST /api/atividades
// @access  Private/Admin
exports.criarAtividade = async (req, res) => {
  try {
    const { 
      tipoAtividade,
      data,
      parcelas = [],
      pessoal = [],
      equipamentos = [],
      produtos = [],
      comentarios,
      quantidadeColhida,
      unidadeColheita,
      tipoFertilizacao,
      profundidadeLavoura,
      estado
    } = req.body;

    // Validações assíncronas em paralelo para melhor performance
    const validationPromises = [
      validateEntities(Parcela, parcelas, 'Parcela'),
      validateEntities(Equipamento, equipamentos.map(eq => eq.equipamento), 'Equipamento'),
      validateEntities(Produto, produtos.map(prod => prod.produto), 'Produto'),
      validateEntities(User, pessoal.map(p => p.pessoa), 'Usuário')
    ];

    await Promise.all(validationPromises);

    const atividade = await Atividade.create({
      tipoAtividade,
      data: data || new Date(),
      parcelas,
      pessoal,
      equipamentos,
      produtos,
      comentarios,
      quantidadeColhida,
      unidadeColheita,
      tipoFertilizacao,
      profundidadeLavoura,
      estado: estado || 'rascunho',
      criadoPor: req.user._id
    });

    res.status(201).json(atividade);
  } catch (error) {
    handleError(res, error);
  }
};

// Função auxiliar para validar arrays de entidades
async function validateEntities(Model, ids, entityName) {
  if (!ids || ids.length === 0) return;
  
  const entities = await Model.find({ _id: { $in: ids } });
  const foundIds = entities.map(e => e._id.toString());
  
  const missingIds = ids.filter(id => !foundIds.includes(id.toString()));
  if (missingIds.length > 0) {
    const error = new Error(`${entityName}(s) ${missingIds.join(', ')} não encontrado(s)`);
    error.status = 404;
    throw error;
  }
}

// @desc    Listar todas as atividades (admin)
// @route   GET /api/atividades
// @access  Private/Admin
exports.listarAtividades = async (req, res) => {
  try {
    const { tipoAtividade, estado, dataInicio, dataFim } = req.query;
    
    let query = {};
    
    // Aplicar filtros se fornecidos
    if (tipoAtividade) query.tipoAtividade = tipoAtividade;
    if (estado) query.estado = estado;
    if (dataInicio || dataFim) {
      query.data = {};
      if (dataInicio) query.data.$gte = new Date(dataInicio);
      if (dataFim) query.data.$lte = new Date(dataFim);
    }
    
    const atividades = await Atividade.find(query)
      .populate('parcelas', 'nome area')
      .populate('pessoal.pessoa', 'nome email')
      .populate('equipamento.equipamento', 'nome tipo')
      .populate('produtos.produto', 'nome categoria')
      .populate('criadoPor')
      .populate('atualizadoPor')
      .sort('-data');
    
    res.json(atividades);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Obter uma atividade específica (admin)
// @route   GET /api/atividades/:id
// @access  Private/Admin
exports.obterAtividade = async (req, res) => {
  try {
    const atividade = await Atividade.findById(req.params.id)
      .populate('parcelas', 'nome area')
      .populate('pessoal.pessoa', 'nome email')
      .populate('equipamento.equipamento', 'nome tipo')
      .populate('produtos.produto', 'nome categoria')
      .populate('criadoPor')
      .populate('atualizadoPor');
    
    if (!atividade) {
      return res.status(404).json({ message: 'Atividade não encontrada' });
    }
    
    res.json(atividade);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Atualizar uma atividade (admin)
// @route   PUT /api/atividades/:id
// @access  Private/Admin
exports.atualizarAtividade = async (req, res) => {
  try {
    const atividade = await Atividade.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        atualizadoPor: req.user._id
      },
      { new: true, runValidators: true }
    )
      .populate('parcelas', 'nome area')
      .populate('pessoal.pessoa', 'nome email')
      .populate('equipamento.equipamento', 'nome tipo')
      .populate('produtos.produto', 'nome categoria')
      .populate('criadoPor')
      .populate('atualizadoPor');
    
    if (!atividade) {
      return res.status(404).json({ message: 'Atividade não encontrada' });
    }
    
    res.json(atividade);
  } catch (error) {
    handleError(res, error);
  }
};

// @desc    Excluir uma atividade (admin)
// @route   DELETE /api/atividades/:id
// @access  Private/Admin
exports.excluirAtividade = async (req, res) => {
  try {
    const atividade = await Atividade.findByIdAndDelete(req.params.id);
    
    if (!atividade) {
      return res.status(404).json({ message: 'Atividade não encontrada' });
    }
    
    res.json({ message: 'Atividade deletada com sucesso' });
  } catch (error) {
    handleError(res, error);
  }
}; 