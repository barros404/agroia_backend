const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
require('dotenv').config();

// Middleware para proteger rotas
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // Verificar se há token no header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Obter token do header
      token = req.headers.authorization.split(' ')[1];

      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Colocar o id do usuário no objeto de requisição
      req.user = { id: decoded.id };

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Token inválido');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Não autorizado, sem token');
  }
});
exports.admin = async (req, res, next) => {
 
  const user = await User.findById(req.user.id);
 
    if (user && user.funcao === 'admin') {
      next();
    } else {
      res.status(401);
      throw new Error('Não autorizado como administrador');
    }
  };
  
