const app = require('./app');
const connectDB = require('./config/database');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Conectar ao banco de dados
connectDB();

// Criar servidor HTTP
const server = http.createServer(app);

// Configurar Socket.io
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Tratamento de conexões Socket.io
io.on('connection', (socket) => {
  console.log('Novo cliente conectado');
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

// Tornar io acessível globalmente
app.set('io', io);

// Iniciar o servidor
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV}`);
});
