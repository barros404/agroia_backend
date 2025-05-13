const mongoose = require('mongoose');
const User = require('../models/userModel');
const ExploracaoAgricola = require('../models/exploracaoAgricolaModel');
const Cultura = require('../models/culturaModel');
const Parcela = require('../models/parcelaModel');
const Produto = require('../models/produtoModel');
const Equipamento = require('../models/equipamentoModel');
const bcrypt = require('bcryptjs');

const seedData = async () => {
  try {
    console.log('Iniciando seed de dados...');
    
    // Limpar banco de dados (cuidado!)
    await User.deleteMany();
    await ExploracaoAgricola.deleteMany();
    await Cultura.deleteMany();
    await Parcela.deleteMany();
    await Produto.deleteMany();
    await Equipamento.deleteMany();
    
    console.log('Banco de dados limpo');

    // Criar usuário administrador
    const senhaHash = await bcrypt.hash('123456', 10);
    
    const adminUser = await User.create({
      nome: 'Antonio Emiliano Barros',
      email: 'admin@exemplo.com',
      senha: senhaHash,
      funcao: 'admin'
    });
    
    
    console.log('Usuário admin criado');

    // Criar exploração agrícola
    const exploracao = await ExploracaoAgricola.create({
      nome: 'Quinta do Sol',
      localizacao: 'Alentejo, Portugal',
      moeda: 'EUR',
      administradores: [adminUser._id],
      membros: [adminUser._id]
    });
    
    console.log('Exploração agrícola criada');

    // Atualizar usuário com a exploração
    adminUser.exploracaoAgricola = exploracao._id;
    await adminUser.save();
    
    // Criar culturas
    const culturas = await Cultura.insertMany([
      {
        nome: 'Milho',
        tipo: 'cereal',
        cicloCrescimento: 120,
        usuario: adminUser._id,
        exploracaoAgricola: exploracao._id
      },
      {
        nome: 'Tomate',
        tipo: 'horticola',
        cicloCrescimento: 90,
        usuario: adminUser._id,
        exploracaoAgricola: exploracao._id
      },
      {
        nome: 'Maçã',
        tipo: 'fruta',
        cicloCrescimento: 180,
        usuario: adminUser._id,
        exploracaoAgricola: exploracao._id
      }
    ]);
    
    console.log('Culturas criadas');

    // Criar parcelas
    const parcelas = await Parcela.insertMany([
      {
        nome: 'Campo Norte',
        area: 5.2,
        tipoSolo: 'Argiloso',
        cultura: culturas[0]._id, // Milho
        coordenadas: {
          type: 'Polygon',
          coordinates: [[
            [-8.5, 39.5],
            [-8.5, 39.6],
            [-8.4, 39.6],
            [-8.4, 39.5],
            [-8.5, 39.5]
          ]]
        },
        usuario: adminUser._id
      },
      {
        nome: 'Horta',
        area: 0.5,
        tipoSolo: 'Argiloso-Arenoso',
        cultura: culturas[1]._id, // Tomate
        coordenadas: {
          type: 'Polygon',
          coordinates: [[
            [-8.52, 39.52],
            [-8.52, 39.53],
            [-8.51, 39.53],
            [-8.51, 39.52],
            [-8.52, 39.52]
          ]]
        },
        usuario: adminUser._id
      },
      {
        nome: 'Pomar Sul',
        area: 1.5,
        tipoSolo: 'Franco',
        cultura: culturas[2]._id, // Maçã
        coordenadas: {
          type: 'Polygon',
          coordinates: [[
            [-8.53, 39.48],
            [-8.53, 39.49],
            [-8.52, 39.49],
            [-8.52, 39.48],
            [-8.53, 39.48]
          ]]
        },
        usuario: adminUser._id
      }
    ]);
    
    console.log('Parcelas criadas');

    // Criar produtos
    await Produto.insertMany([
      {
        nome: 'SuperGrow Fertilizante',
        categoria: 'fertilizante',
        unidadeMedida: 'kg',
        precoPorUnidade: 2.5,
        detalhes: 'Fertilizante NPK balanceado',
        exploracaoAgricola: exploracao._id
      },
      {
        nome: 'Sementes de Milho Híbrido',
        categoria: 'semente',
        unidadeMedida: 'kg',
        precoPorUnidade: 15,
        detalhes: 'Alta produtividade',
        exploracaoAgricola: exploracao._id
      },
      {
        nome: 'PestAway',
        categoria: 'pesticida',
        unidadeMedida: 'l',
        precoPorUnidade: 30,
        detalhes: 'Controle efetivo de pragas',
        exploracaoAgricola: exploracao._id
      }
    ]);
    
    console.log('Produtos criados');

    // Criar equipamentos
    await Equipamento.insertMany([
      {
        nome: 'Trator Azul',
        tipo: 'trator',
        custoPorHora: 25,
        detalhes: 'John Deere 5075E',
        exploracaoAgricola: exploracao._id
      },
      {
        nome: 'Sistema de Irrigação',
        tipo: 'irrigacao',
        custoPorHora: 10,
        detalhes: 'Sistema por gotejamento',
        exploracaoAgricola: exploracao._id
      },
      {
        nome: 'Pulverizador',
        tipo: 'pulverizador',
        custoPorHora: 15,
        detalhes: 'Pulverizador de 500 litros',
        exploracaoAgricola: exploracao._id
      }
    ]);
    
    console.log('Equipamentos criados');

    console.log('Seed de dados concluído com sucesso');
    
  } catch (error) {
    console.error(`Erro no seed de dados: ${error.message}`);
  }
};

module.exports = seedData;
