const mongoose = require('mongoose');

const atividadeSchema = new mongoose.Schema({
  tipo: {
    type: String,
    required: true,
    enum: ['preparo', 'plantio', 'tratamento', 'colheita', 'manutencao']
  },
  estado: {
    type: String,
    required: true,
    enum: ['pendente', 'em_andamento', 'concluida', 'cancelada'],
    default: 'pendente'
  },
  dataInicio: {
    type: Date,
    required: true
  },
  dataFim: {
    type: Date
  },
  parcela: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parcela',
    required: true
  },
  equipamentos: [{
    equipamento: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Equipamento'
    },
    tempoUtilizado: {
      type: Number
    },
    unidadeTempo: {
      type: String,
      enum: ['minuto', 'hora', 'dia', 'semana', 'mes'],
      default: 'hora'
    }
  }],
  produtos: [{
    produto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Produto'
    },
    quantidade: {
      type: Number
    },
    unidade: {
      type: String
    }
  }],
  responsavel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  observacoes: {
    type: String
  },
  quantidadeColhida: {
    type: Number
  },
  unidadeColheita: {
    type: String
  },
  criadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  atualizadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Atividade', atividadeSchema);