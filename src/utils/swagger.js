const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Definição básica do Swagger
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'API do Sistema de Agentes de IA Agrícola',
      version: '1.0.0',
      description: 'Documentação da API REST para o Sistema de Agentes de IA Agrícola',
      contact: {
        name: 'Seu Nome',
        email: 'seu-email@exemplo.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Servidor de Desenvolvimento'
      },
      {
        url: 'https://seu-dominio.com/api',
        description: 'Servidor de Produção'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.js'] // Caminho para os arquivos que contêm anotações do Swagger
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

module.exports = {
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(swaggerDocs)
};
