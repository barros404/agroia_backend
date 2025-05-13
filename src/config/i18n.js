i18n.configure({
    locales: ['pt', 'en', 'es', 'fr'],
    defaultLocale: 'pt',
    directory: path.join(__dirname, '../locales'),
    objectNotation: true,
    updateFiles: false,
    api: {
      __: 't', // Agora use t() ao invés de __()
      __n: 'tn' // E tn() ao invés de __n()
    }
  });
  
  module.exports = i18n;
  