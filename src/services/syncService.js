const Atividade = require('../models/atividadeModel');
const SistemaAgente = require('../agentes/SistemaAgente');

// Instanciar Sistema de Agentes (singleton)
const sistemaAgente = new SistemaAgente();

// Função para sincronizar atividades do dispositivo móvel
exports.sincronizarAtividades = async (userId, atividades) => {
  try {
    if (!atividades || !Array.isArray(atividades) || atividades.length === 0) {
      return { 
        sucesso: true, 
        mensagem: 'Nenhuma atividade para sincronizar',
        sincronizadas: 0
      };
    }

    console.log(`Iniciando sincronização de ${atividades.length} atividades para o usuário ${userId}`);
    
    const atividadesSincronizadas = [];
    const atividadesComErro = [];
    
    // Processar cada atividade
    for (const atividade of atividades) {
      try {
        // Verificar se a atividade já existe no banco
        let atividadeExistente = null;
        
        if (atividade._id) {
          atividadeExistente = await Atividade.findById(atividade._id);
        }
        
        // Atualizar atividade existente ou criar nova
        if (atividadeExistente) {
          // Atualizar campos (exceto usuário)
          Object.keys(atividade).forEach(key => {
            if (key !== 'usuario' && key !== '_id') {
              atividadeExistente[key] = atividade[key];
            }
          });
          
          atividadeExistente.estado = 'sincronizado';
          await atividadeExistente.save();
          
          atividadesSincronizadas.push(atividadeExistente._id);
        } else {
          // Criar nova atividade
          const novaAtividade = new Atividade({
            ...atividade,
            usuario: userId,
            estado: 'sincronizado'
          });
          
          await novaAtividade.save();
          atividadesSincronizadas.push(novaAtividade._id);
          
          // Processar a atividade através do Sistema de Agentes
          sistemaAgente.processarAtividadeParaCustos(novaAtividade);
        }
      } catch (error) {
        console.error(`Erro ao sincronizar atividade: ${error.message}`);
        atividadesComErro.push({
          atividade: atividade._id || atividade.id,
          erro: error.message
        });
      }
    }
    
    return {
      sucesso: true,
      mensagem: `${atividadesSincronizadas.length} atividades sincronizadas com sucesso`,
      sincronizadas: atividadesSincronizadas.length,
      comErro: atividadesComErro.length,
      detalhesErros: atividadesComErro,
      idsSincronizados: atividadesSincronizadas
    };
    
  } catch (error) {
    console.error(`Erro geral na sincronização: ${error.message}`);
    return {
      sucesso: false,
      mensagem: `Erro na sincronização: ${error.message}`,
      erro: error.message
    };
  }
};

// Obter atividades para sincronização com o dispositivo
exports.obterAtividadesParaSincronizacao = async (userId, ultimaSincronizacao) => {
  try {
    // Converter string de data para objeto Date
    let dataUltimaSincronizacao = null;
    if (ultimaSincronizacao) {
      dataUltimaSincronizacao = new Date(ultimaSincronizacao);
    }
    
    // Consultar atividades atualizadas desde a última sincronização
    const query = { usuario: userId };
    
    if (dataUltimaSincronizacao) {
      query.updatedAt = { $gt: dataUltimaSincronizacao };
    }
    
    const atividades = await Atividade.find(query)
      .populate('parcelas', 'nome area')
      .sort('-updatedAt');
    
    return {
      sucesso: true,
      atividades,
      contagem: atividades.length,
      timestamp: new Date()
    };
    
  } catch (error) {
    console.error(`Erro ao obter atividades para sincronização: ${error.message}`);
    return {
      sucesso: false,
      mensagem: `Erro ao obter atividades: ${error.message}`,
      erro: error.message
    };
  }
};
