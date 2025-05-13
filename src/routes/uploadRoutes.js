const express = require('express');
const router = express.Router();
const { 
  uploadFotoAtividade,
  listarFotosAtividade
} = require('../controllers/uploadController');
const { protect } = require('../middlewares/authMiddleware');

// Todas as rotas requerem autenticação
router.use(protect);

// Rotas para fotos de atividades
router.post('/atividade/:id', uploadFotoAtividade);
router.get('/atividade/:id/fotos', listarFotosAtividade);

module.exports = router;
