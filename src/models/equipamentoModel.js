const mongoose = require('mongoose');

const equipamentoSchema = mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true
    },
    tipo: {
      type: String,
      required: true,
      enum: ['trator', 'semeadora', 'colheitadeira', 'pulverizador', 'irrigacao', 'outro']
    },
    custoPorHora: {
      type: Number,
      required: true,
      min: 0
    },
    detalhes: {
      type: String,
      trim: true
    },
    exploracaoAgricola: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExploracaoAgricola',
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Equipamento = mongoose.model('Equipamento', equipamentoSchema);

module.exports = Equipamento;
