const Agente = require('./Agente');

class AgenteRecolhaDados extends Agente {
  constructor() {
    super('AgenteRecolhaDados');
    this.formulariosDeCampo = {};
    this.regrasDeValidacao = {
      atividade: ['data', 'parcelas', 'tipoAtividade'],
      fertilizacao: ['produto', 'quantidade', 'unidade'],
      colheita: ['quantidade', 'unidade'],
      horasDeTrabalho: ['pessoal', 'horas']
    };
    this.filaOffline = [];
  }

  criarFormularioAtividade(tipoAtividade) {
    const formularioBase = {
      id: `atividade_${Date.now()}`,
      data: new Date().toISOString(),
      estado: 'rascunho',
      parcelas: [],
      pessoal: [],
      equipamentos: [],
      produtos: [],
      comentarios: '',
      geolocalizacao: null
    };

    // Adicionar campos específicos baseados no tipo de atividade
    switch (tipoAtividade) {
      case 'fertilizar':
        formularioBase.produtos = [{ id: null, quantidade: 0, unidade: 'l/ha' }];
        formularioBase.tipoFertilizacao = '';
        break;
      case 'colheita':
        formularioBase.quantidadeColhida = 0;
        formularioBase.unidadeColheita = 'kg';
        break;
      case 'lavoura':
        formularioBase.profundidadeLavoura = 0;
        break;
      // Adicionar outros tipos de atividade conforme necessário
    }

    return formularioBase;
  }

  atualizarFormularioAtividade(idFormulario, campo, valor) {
    if (!this.formulariosDeCampo[idFormulario]) {
      throw new Error(`Formulário com ID ${idFormulario} não encontrado`);
    }

    this.formulariosDeCampo[idFormulario][campo] = valor;
    return this.formulariosDeCampo[idFormulario];
  }

  validarFormulario(formulario, tipoAtividade) {
    const camposObrigatorios = this.regrasDeValidacao[tipoAtividade] || [];

    const camposEmFalta = camposObrigatorios.filter(campo => {
      const valor = formulario[campo];
      return valor === null || valor === undefined || valor === '' ||
        (Array.isArray(valor) && valor.length === 0);
    });

    return {
      eValido: camposEmFalta.length === 0,
      camposEmFalta
    };
  }

  submeterAtividade(idFormulario) {
    const formulario = this.formulariosDeCampo[idFormulario];
    
    if (!formulario) {
      return { sucesso: false, erro: 'Formulário não encontrado' };
    }

    const validacao = this.validarFormulario(formulario, formulario.tipoAtividade);
    
    if (!validacao.eValido) {
      return {
        sucesso: false,
        erro: 'Validação falhou',
        camposEmFalta: validacao.camposEmFalta
      };
    }

    // Marcar como concluído
    formulario.estado = 'concluido';
    formulario.concluidoEm = new Date().toISOString();

    // Adicionar à fila offline para sincronização
    this.filaOffline.push(formulario);

    return { sucesso: true, atividade: formulario };
  }

  sincronizarAtividades() {
    if (this.filaOffline.length === 0) {
      return { 
        sucesso: true, 
        mensagem: 'Não há atividades para sincronizar' 
      };
    }

    console.log(`Pronto para sincronizar ${this.filaOffline.length} atividades`);

    // Em um cenário real, aqui comunicaria com o AgenteSincronizacao
    // Para o exemplo, simplesmente esvaziar a fila
    const atividades = [...this.filaOffline];
    this.filaOffline = [];

    return { 
      sucesso: true, 
      mensagem: 'Atividades sincronizadas com sucesso',
      atividades
    };
  }

  processarMensagem(mensagem, remetente) {
    switch (mensagem.tipo) {
      case 'CRIAR_ATIVIDADE':
        const formulario = this.criarFormularioAtividade(mensagem.carga.tipoAtividade);
        this.formulariosDeCampo[formulario.id] = formulario;
        return { sucesso: true, idFormulario: formulario.id, formulario };

      case 'ATUALIZAR_ATIVIDADE':
        return this.atualizarFormularioAtividade(
          mensagem.carga.idFormulario,
          mensagem.carga.campo,
          mensagem.carga.valor
        );

      case 'SUBMETER_ATIVIDADE':
        return this.submeterAtividade(mensagem.carga.idFormulario);

      case 'SINCRONIZAR_ATIVIDADES':
        return this.sincronizarAtividades();

      case 'CONFIRMACAO_SINCRONIZACAO':
        // Tratar confirmação de que as atividades foram sincronizadas
        this.filaOffline = this.filaOffline.filter(
          atividade => !mensagem.carga.idsAtividadesSincronizadas.includes(atividade.id)
        );
        return { sucesso: true, atividadesRestantes: this.filaOffline.length };

      default:
        return { sucesso: false, erro: `Tipo de mensagem desconhecido: ${mensagem.tipo}` };
    }
  }
}

module.exports = AgenteRecolhaDados;
