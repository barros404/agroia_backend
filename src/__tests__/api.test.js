const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/userModel');
const Parcela = require('../models/parcelaModel');

describe('API Routes', () => {
  let token;
  let userId;
  let parcelaId;
  
  // Antes de todos os testes, cria um usuário e obtém um token
  beforeAll(async () => {
    // Conectar ao banco de dados de teste
    await mongoose.connect(process.env.MONGODB_URI_TEST, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Limpar coleções
    await User.deleteMany({});
    await Parcela.deleteMany({});
    
    // Criar usuário de teste
    const userRes = await request(app)
      .post('/api/users')
      .send({
        nome: 'Teste',
        email: 'teste@exemplo.com',
        senha: '123456'
      });
    
    userId = userRes.body._id;
    token = userRes.body.token;
  });
  
  // Após todos os testes, desconecta do banco de dados
  afterAll(async () => {
    await mongoose.connection.close();
  });
  
  // Teste para rota de login
  test('Deve autenticar o usuário e retornar um token', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({
        email: 'teste@exemplo.com',
        senha: '123456'
      });
    
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.email).toBe('teste@exemplo.com');
  });
  
  // Teste para criação de parcela
  test('Deve criar uma nova parcela', async () => {
    const res = await request(app)
      .post('/api/parcelas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Parcela de Teste',
        area: 5.2,
        tipoSolo: 'Argiloso',
        coordenadas: {
          type: 'Polygon',
          coordinates: [[
            [-8.5, 39.5],
            [-8.5, 39.6],
            [-8.4, 39.6],
            [-8.4, 39.5],
            [-8.5, 39.5]
          ]]
        }
      });
    
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.nome).toBe('Parcela de Teste');
    expect(res.body.area).toBe(5.2);
    expect(res.body.usuario).toBe(userId);
    
    parcelaId = res.body._id;
  });
  
  // Teste para obter parcelas
  test('Deve retornar as parcelas do usuário', async () => {
    const res = await request(app)
      .get('/api/parcelas')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].nome).toBe('Parcela de Teste');
  });
  
  // Teste para obter uma parcela específica
  test('Deve retornar uma parcela específica', async () => {
    const res = await request(app)
      .get(`/api/parcelas/${parcelaId}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('_id', parcelaId);
    expect(res.body.nome).toBe('Parcela de Teste');
  });
  
  // Teste para atualizar uma parcela
  test('Deve atualizar uma parcela', async () => {
    const res = await request(app)
      .put(`/api/parcelas/${parcelaId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Parcela Atualizada',
        area: 6.0
      });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.nome).toBe('Parcela Atualizada');
    expect(res.body.area).toBe(6.0);
  });
  
  // Teste para excluir uma parcela
  test('Deve excluir uma parcela', async () => {
    const res = await request(app)
      .delete(`/api/parcelas/${parcelaId}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain('removida');
    
    // Verificar se a parcela foi realmente removida
    const checkRes = await request(app)
      .get(`/api/parcelas/${parcelaId}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(checkRes.statusCode).toBe(404);
  });
});
