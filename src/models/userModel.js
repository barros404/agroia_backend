const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Por favor, insira um email válido']
    },
    senha: {
      type: String,
      required: true,
      minlength: 6
    },
    telefone: {
      type: String,
      trim: true
    },
    funcao: {
      type: String,
      enum: ['admin', 'gestor', 'trabalhador', 'visualizador'],
      default: 'visualizador'
    },
    custoPorHora: {
      type: Number,
      min: 0
    },
    exploracaoAgricola: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExploracaoAgricola'
    },
    preferencias: {
      nivelExperiencia: {
        type: String,
        enum: ['iniciante', 'intermediario', 'avancado'],
        default: 'iniciante'
      },
      formatoConteudo: {
        type: String,
        enum: ['texto', 'video'],
        default: 'texto'
      },
      notificacoes: {
        type: Boolean,
        default: true
      }
    }
  },
  {
    timestamps: true
  }
);

// Método para comparar senhas
userSchema.methods.matchPassword = async function(senhaInserida) {
  return await bcrypt.compare(senhaInserida, this.senha);
};

// Middleware para hash da senha antes de salvar
userSchema.pre('save', async function(next) {
  if (!this.isModified('senha')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.senha = await bcrypt.hash(this.senha, salt);
});

const User = mongoose.model('User', userSchema);

module.exports = User;
