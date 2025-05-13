const asyncHandler = require('express-async-handler');
const { upload, getFileUrl } = require('../services/uploadService');
const Atividade = require('../models/atividadeModel');

// Middleware de upload
const uploadMiddleware = upload.single('foto');

// @desc    Upload de foto para atividade
// @route   POST /api/upload/atividade/:id
// @access  Private
exports.uploadFotoAtividade = asyncHandler(async (req, res) => {
  const atividadeId = req.params.id;
  
  // Verificar se a atividade existe
  const atividade = await Atividade.findById(atividadeId);
  
  if (!atividade) {
    res.status(404);
    throw new Error('Atividade não encontrada');
  }
  
  // Verificar permissões
  if (atividade.usuario.toString() !== req.user.id) {
    res.status(401);
    throw new Error('Não autorizado');
  }
  
  // Usar o middleware de upload com tratamento de erros
  uploadMiddleware(req, res, async function(err) {
    if (err) {
      res.status(400).json({
        sucesso: false,
        mensagem: err.message
      });
      return;
    }
    
    if (!req.file) {
      res.status(400).json({
        sucesso: false,
        mensagem: 'Nenhum arquivo enviado'
      });
      return;
    }
    
    // Obter dados do arquivo
    const { originalname, mimetype, size, filename, key } = req.file;
    const fileUrl = getFileUrl(key || filename);
    
    // Adicionar foto à atividade
    atividade.fotos.push({
      url: fileUrl,
      caption: req.body.caption || originalname,
      dataUpload: new Date()
    });
    
    // Salvar atividade
    await atividade.save();
    
    res.status(201).json({
      sucesso: true,
      foto: {
        url: fileUrl,
        nome: originalname,
        tamanho: size,
        tipo: mimetype
      }
    });
  });
});

// @desc    Listar fotos de uma atividade
// @route   GET /api/upload/atividade/:id/fotos
// @access  Private
exports.listarFotosAtividade = asyncHandler(async (req, res) => {
  const atividadeId = req.params.id;
  
  // Buscar a atividade com as fotos
  const atividade = await Atividade.findById(atividadeId)
    .select('fotos');
  
  if (!atividade) {
    res.status(404);
    throw new Error('Atividade não encontrada');
  }
  
  // Verificar permissões
  if (atividade.usuario.toString() !== req.user.id) {
    res.status(401);
    throw new Error('Não autorizado');
  }
  
  res.json({
    sucesso: true,
    fotos: atividade.fotos
  });
});
