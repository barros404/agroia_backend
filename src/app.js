const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const userRoutes = require('./routes/userRoutes');
const parcelaRoutes = require('./routes/parcelaRoutes');
const agenteRoutes = require('./routes/agenteRoutes');
const syncRoutes = require('./routes/syncRoutes');
const culturaRoutes = require('./routes/culturaRoutes');
const produtoRoutes = require('./routes/produtoRoute');
const equipamentoRoutes = require('./routes/equipamentoRoute');
const custoRoutes = require('./routes/custoRoutes');
const produtividadeRoutes = require('./routes/produtividadeRoutes');
const relatorioRoutes = require('./routes/relatorioRoutes');

//const uploadRoutes = require('./routes/uploadRoutes');


require('dotenv').config();

// Inicializar app
const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Logging em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Diretório estático para uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/users', userRoutes);
app.use('/api/parcelas', parcelaRoutes);
app.use('/api/agentes', agenteRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/culturas', culturaRoutes);
app.use('/api/produtos', produtoRoutes);
app.use('/api/equipamentos',equipamentoRoutes);
app.use('/api/custos', custoRoutes);
app.use('/api/produtividades', produtividadeRoutes);
app.use('/api/relatorios', relatorioRoutes);
//app.use('/api/upload', uploadRoutes);



// Rota básica
app.get('/', (req, res) => {
  res.json({ message: 'Bem-vindo à API do Sistema de Agentes de IA Agrícola' });
});


// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Algo deu errado!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

module.exports = app;
