const mongoose = require('mongoose');

const parcelaSchema = mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true
    },
    area: {
      type: Number,
      required: true,
      min: 0
    },
    tipoSolo: {
      type: String,
      trim: true
    },
    cultura: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cultura'
    },
    coordenadas: {
      type: {
        type: String,
        enum: ['Polygon'],
        default: 'Polygon'
      },
      coordinates: {
        type: [[[Number]]], // Array de arrays de coordenadas [longitude, latitude]
        required: true
      }
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Índice geoespacial para consultas baseadas em localização
parcelaSchema.index({ coordenadas: '2dsphere' });
parcelaSchema.index({ usuario: 1 });
parcelaSchema.index({ cultura: 1 });


const Parcela = mongoose.model('Parcela', parcelaSchema);

module.exports = Parcela;
