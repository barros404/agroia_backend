const asyncHandler = require('express-async-handler');
const generateToken = require('../utils/generateToken');
const User = require('../models/userModel');

// @desc    Registrar um novo usuário
// @route   POST /api/users
// @access  Public
exports.registerUser = asyncHandler(async (req, res) => {
  const { nome, email, senha, telefone, funcao } = req.body;

  // Verificar se o usuário já existe
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('Usuário já existe');
  }

  // Criar o usuário
  const user = await User.create({
    nome,
    email,
    senha,
    telefone,
    funcao
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      nome: user.nome,
      email: user.email,
      telefone: user.telefone,
      funcao: user.funcao,
      token: generateToken(user._id)
    });
  } else {
    res.status(400);
    throw new Error('Dados de usuário inválidos');
  }
});

// @desc    Autenticar usuário & obter token
// @route   POST /api/users/login
// @access  Public
exports.authUser = asyncHandler(async (req, res) => {
  const { email, senha } = req.body;

  // Buscar usuário pelo email
  const user = await User.findOne({ email });
  if (user) {
    const senhaMatch = await user.matchPassword(senha);
  }


  // Verificar se o usuário existe e a senha está correta
  if (user && (await user.matchPassword(senha))) {
    res.json({
      _id: user._id,
      nome: user.nome,
      email: user.email,
      telefone: user.telefone,
      funcao: user.funcao,
      token: generateToken(user._id)
    });
  } else {
    res.status(401);
    throw new Error('Email ou senha inválidos');
  }
});

// @desc    Obter perfil de usuário
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-senha');

  if (user) {
    res.json({
      _id: user._id,
      nome: user.nome,
      email: user.email,
      telefone: user.telefone,
      funcao: user.funcao,
      preferencias: user.preferencias
    });
  } else {
    res.status(404);
    throw new Error('Usuário não encontrado');
  }
});

// @desc    Atualizar perfil de usuário
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (user) {
    user.nome = req.body.nome || user.nome;
    user.email = req.body.email || user.email;
    user.telefone = req.body.telefone || user.telefone;
    
    // Atualizar senha apenas se for fornecida
    if (req.body.senha) {
      user.senha = req.body.senha;
    }
    
    // Atualizar preferências
    if (req.body.preferencias) {
      user.preferencias = {
        ...user.preferencias,
        ...req.body.preferencias
      };
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      nome: updatedUser.nome,
      email: updatedUser.email,
      telefone: updatedUser.telefone,
      funcao: updatedUser.funcao,
      preferencias: updatedUser.preferencias,
      token: generateToken(updatedUser._id)
    });
  } else {
    res.status(404);
    throw new Error('Usuário não encontrado');
  }
});

// @desc    Obter todos os usuários (admin)
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-senha');
  res.json(users);
});
// @desc    Obter dado de um  usuários (admin)
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = asyncHandler(async (req, res) => {
  const admin = await User.findById(req.user.id);
  if (admin.funcao !== 'admin') {
    res.status(401);
    throw new Error('Não autorizado como administrador');
  }
  const user = await User.findById(req.params.id).select('-senha');
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('Usuário não encontrado');
  }
}); 

