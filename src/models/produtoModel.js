const mongoose = require('mongoose');

const produtoSchema = mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true
    },
    categoria: {
      type: String,
      required: true,
      enum: ['semente', 'fertilizante', 'pesticida', 'herbicida', 'combustivel', 'outro']
    },
    unidadeMedida: {
      type: String,
      required: true,
      enum: ['kg', 'g', 'l', 'ml', 'unidade', 'outro']
    },
    precoPorUnidade: {
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
produtoSchema.index({ categoria: 1 });
produtoSchema.index({ nome: "text" }); // Índice de texto para pesquisas

const Produto = mongoose.model('Produto', produtoSchema);

module.exports = Produto;
