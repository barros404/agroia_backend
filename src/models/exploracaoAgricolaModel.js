const mongoose = require('mongoose');

const exploracaoAgricolaSchema = mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true
    },
    localizacao: {
      type: String,
      required: true,
      trim: true
    },
    moeda: {
      type: String,
      required: true,
      default: 'EUR'
    },
    administradores: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    membros: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  {
    timestamps: true
  }
);

const ExploracaoAgricola = mongoose.model('ExploracaoAgricola', exploracaoAgricolaSchema);

module.exports = ExploracaoAgricola;
