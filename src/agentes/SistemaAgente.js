const AgenteRecolhaDados = require("./AgenteRecolhaDados");
const AgenteSincronizacao = require("./AgenteSincronizacao");
const AgenteAnaliseCustos = require("./AgenteAnaliseCustos");
const AgenteAnaliseProdutividade = require("./AgenteAnaliseProdutividade");
const AgenteGeradorRelatorios = require("./AgenteGeradorRelatorios");
// Importar outros agentes quando implementados

class SistemaAgente {
  constructor() {
    // Inicializar os agentes
    this.agenteRecolhaDados = new AgenteRecolhaDados();
    this.agenteSincronizacao = new AgenteSincronizacao();
    this.agenteAnaliseCustos = new AgenteAnaliseCustos();
    this.agenteAnaliseProdutividade = new AgenteAnaliseProdutividade();
    this.agenteGeradorRelatorios = new AgenteGeradorRelatorios();
    // Outros agentes...

    // Ativar todos os agentes
    this.agenteRecolhaDados.ativar();
    this.agenteSincronizacao.ativar();
    this.agenteAnaliseCustos.ativar();
    this.agenteAnaliseProdutividade.ativar();
    this.agenteGeradorRelatorios.ativar();
    // Ativar outros agentes...

    // Registro de agentes para facilitar o acesso
    this.registoAgentes = {
      AgenteRecolhaDados: this.agenteRecolhaDados,
      AgenteSincronizacao: this.agenteSincronizacao,
      AgenteAnaliseCustos: this.agenteAnaliseCustos,
      AgenteAnaliseProdutividade: this.agenteAnaliseProdutividade,
      AgenteGeradorRelatorios: this.agenteGeradorRelatorios,
      // Adicionar outros agentes...
    };

    // Configurar listeners para eventos do sistema
    this.listenersEventos = {};

    // Inicializar estado do sistema
    this.estadoSistema = {
      estado: "pronto",
      ultimaAtividade: null,
      sessoesUtilizador: {},
      estadoSincronizacao: {
        ultimaSincronizacao: null,
        emProgresso: false,
      },
    };

    console.log("SistemaAgente inicializado e pronto");
  }

  // Enviar uma mensagem para um agente
  enviarMensagem(agenteAlvo, mensagem, remetente = "SistemaAgente") {
    if (!this.registoAgentes[agenteAlvo]) {
      return { sucesso: false, erro: `Agente não encontrado: ${agenteAlvo}` };
    }

    console.log(
      `SistemaAgente encaminhando mensagem de ${remetente} para ${agenteAlvo}: ${mensagem.tipo}`
    );
    return this.registoAgentes[agenteAlvo].receberMensagem(mensagem, remetente);
  }

  // Registrar um listener de evento
  adicionarListenerEvento(tipoEvento, callback) {
    if (!this.listenersEventos[tipoEvento]) {
      this.listenersEventos[tipoEvento] = [];
    }

    this.listenersEventos[tipoEvento].push(callback);
    return { sucesso: true, tipoEvento };
  }

  // Acionar um evento
  acionarEvento(tipoEvento, dados) {
    if (!this.listenersEventos[tipoEvento]) {
      return { sucesso: true, eventoAcionado: false, tipoEvento };
    }

    console.log(`SistemaAgente acionando evento: ${tipoEvento}`);

    this.listenersEventos[tipoEvento].forEach((callback) => {
      try {
        callback(dados);
      } catch (erro) {
        console.error(`Erro no listener de evento para ${tipoEvento}:`, erro);
      }
    });

    return {
      sucesso: true,
      eventoAcionado: true,
      tipoEvento,
      contagemListeners: this.listenersEventos[tipoEvento].length,
    };
  }

  // Processar uma submissão de atividade
  tratarSubmissaoAtividade(atividade, idUtilizador) {
    console.log(
      `Processando submissão de atividade do utilizador ${idUtilizador}`
    );

    // Atualizar estado do sistema
    this.estadoSistema.ultimaAtividade = {
      idUtilizador,
      idAtividade: atividade.id,
      timestamp: new Date().toISOString(),
    };

    // Submeter a atividade via AgenteRecolhaDados
    const resultado = this.enviarMensagem("AgenteRecolhaDados", {
      tipo: "SUBMETER_ATIVIDADE",
      carga: {
        idFormulario: atividade.id,
      },
    });

    if (!resultado.sucesso) {
      return resultado;
    }

    // Acionar sincronização
    this.acionarSincronizacao(idUtilizador);

    // Acionar eventos
    this.acionarEvento("atividadeSubmetida", {
      idUtilizador,
      atividade: resultado.atividade,
    });

    // Processar custos
    const resultadoCusto = this.processarAtividadeParaCustos(
      resultado.atividade
    );

    return {
      sucesso: true,
      atividade: resultado.atividade,
      custos: resultadoCusto.sucesso ? resultadoCusto : null,
    };
  }

  // Acionar uma sincronização de dados
  acionarSincronizacao(idUtilizador) {
    console.log(`Acionando sincronização para o utilizador ${idUtilizador}`);

    // Atualizar estado de sincronização
    this.estadoSistema.estadoSincronizacao.emProgresso = true;

    // Sincronizar atividades
    const resultadoSinc = this.enviarMensagem("AgenteSincronizacao", {
      tipo: "PEDIDO_SINCRONIZACAO",
      carga: {
        idUtilizador,
        atividades: [], // Numa implementação real, obteria atividades pendentes
      },
    });

    // Atualizar estado do sistema
    this.estadoSistema.estadoSincronizacao.ultimaSincronizacao =
      new Date().toISOString();
    this.estadoSistema.estadoSincronizacao.emProgresso = false;

    // Acionar eventos
    this.acionarEvento("sincronizacaoConcluida", {
      idUtilizador,
      resultado: resultadoSinc,
    });

    return resultadoSinc;
  }

  // Processar atividade para análise de custos
  processarAtividadeParaCustos(atividade) {
    console.log(`Processando análise de custos para atividade ${atividade.id}`);

    // Enviar para AgenteAnaliseCustos
    const resultadoCusto = this.enviarMensagem("AgenteAnaliseCustos", {
      tipo: "PROCESSAR_ATIVIDADE",
      carga: {
        atividade,
      },
    });

    // Tratar alertas de custo
    if (
      resultadoCusto.sucesso &&
      resultadoCusto.alertas &&
      resultadoCusto.alertas.length > 0
    ) {
      resultadoCusto.alertas.forEach((alerta) => {
        this.acionarEvento("alertaCusto", {
          alerta,
          atividade,
        });
      });
    }

    return resultadoCusto;
  }

  // Obter o estado atual do sistema
  obterEstadoSistema() {
    return {
      sucesso: true,
      estado: this.estadoSistema.estado,
      estadoAgentes: {
        recolhaDados: this.agenteRecolhaDados.estaAtivo,
        sincronizacao: this.agenteSincronizacao.estaAtivo,
        analiseCustos: this.agenteAnaliseCustos.estaAtivo,
        // Outros agentes...
      },
      estadoSincronizacao: this.estadoSistema.estadoSincronizacao,
      utilizadoresAtivos: Object.values(
        this.estadoSistema.sessoesUtilizador
      ).filter((sessao) => sessao.ativo).length,
      ultimaAtividade: this.estadoSistema.ultimaAtividade,
    };
  }
}

module.exports = SistemaAgente;
