const mongoose = require('mongoose');

const culturaSchema = mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true
    },
    tipo: {
      type: String,
      required: true,
      enum: ['cereal', 'horticola', 'fruta', 'vinha', 'olival', 'tuberculo', 'oleaginosa', 'outro']
    },
    cicloCrescimento: {
      type: Number, // Em dias
      min: 1
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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

const Cultura = mongoose.model('Cultura', culturaSchema);

module.exports = Cultura;
