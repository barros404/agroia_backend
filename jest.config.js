module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.js?(x)', '**/?(*.)+(spec|test).js?(x)'],
    collectCoverageFrom: [
      'src/**/*.js',
      '!src/server.js',
      '!**/node_modules/**',
      '!**/vendor/**'
    ],
    coverageThreshold: {
      global: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70
      }
    }
  };
  