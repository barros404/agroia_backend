const SistemaAgente = require("../agentes/SistemaAgente");
const sistemaAgente = new SistemaAgente();

// Funções auxiliares reutilizáveis
const responderRequisicao = (res, resultado) => {
  if (resultado.sucesso) {
    res.status(200).json({
      sucesso: true,
      ...(resultado.dados && { dados: resultado.dados }),
      ...(resultado.resultado && { resultado: resultado.resultado }),
    });
  } else {
    res.status(resultado.erro?.status || 400).json({
      sucesso: false,
      mensagem: resultado.erro?.mensagem || "Operação não realizada",
      detalhes: resultado.erro,
    });
  }
};

const responderErro = (res, error) => {
  console.error("Erro no controller:", error);
  res.status(500).json({
    sucesso: false,
    mensagem: "Erro interno no processamento",
    detalhes: error.message,
  });
};

// Controller
const produtividadeController = {
  async analisarProdutividadeParcela(req, res) {
    try {
      const { idParcela } = req.params;
      const { forceUpdate } = req.query;
      console.log(`Analisando produtividade da parcela ID: ${idParcela}`);

      const resultado = await sistemaAgente.enviarMensagem(
        "AgenteAnaliseProdutividade",
        {
          tipo: "ANALISAR_PRODUTIVIDADE_PARCELA",
          carga: { 
            idParcela,
            options: {
              forceUpdate: forceUpdate === "true"
            }
          },
        },
        "API"
      );

      responderRequisicao(res, resultado);
    } catch (error) {
      responderErro(res, error);
    }
  },

  async analisarProdutividadeCultura(req, res) {
    try {
      const { idCultura } = req.params;
      const { forceUpdate } = req.query;

      const resultado = await sistemaAgente.enviarMensagem(
        "AgenteAnaliseProdutividade",
        {
          tipo: "ANALISAR_PRODUTIVIDADE_CULTURA",
          carga: {
            idCultura,
            options: {
              forceUpdate: forceUpdate === "true"
            }
          },
        },
        "API"
      );

      responderRequisicao(res, resultado);
    } catch (error) {
      responderErro(res, error);
    }
  },

  async analisarEficienciaOperacional(req, res) {
    try {
      const { tipoAtividade, inicio, fim, idResponsavel, forceUpdate } = req.query;
      
      const resultado = await sistemaAgente.enviarMensagem(
        "AgenteAnaliseProdutividade",
        {
          tipo: "ANALISAR_EFICIENCIA_OPERACIONAL",
          carga: {
            options: {
              tipoAtividade,
              periodo: inicio && {
                inicio: new Date(inicio),
                fim: fim ? new Date(fim) : new Date()
              },
              idResponsavel,
              forceUpdate: forceUpdate === "true"
            }
          }
        },
        "API"
      );

      responderRequisicao(res, resultado);
    } catch (error) {
      responderErro(res, error);
    }
  },

  async analisarTendenciasProdutividade(req, res) {
    try {
      const { idParcela } = req.params;
      const { forceUpdate } = req.query;

      const resultado = await sistemaAgente.enviarMensagem(
        "AgenteAnaliseProdutividade",
        {
          tipo: "ANALISAR_TENDENCIAS",
          carga: {
            idParcela,
            options: {
              forceUpdate: forceUpdate === "true"
            }
          }
        },
        "API"
      );

      responderRequisicao(res, resultado);
    } catch (error) {
      responderErro(res, error);
    }
  },

  async compararDesempenho(req, res) {
    try {
      const { tipoComparacao } = req.params;
      const { ids, inicio, fim, forceUpdate } = req.query;

      const resultado = await sistemaAgente.enviarMensagem(
        "AgenteAnaliseProdutividade",
        {
          tipo: "COMPARAR_DESEMPENHO",
          carga: {
            options: {
              tipoComparacao,
              parametros: {
                ...(tipoComparacao === 'periodos' && { idParcela: ids[0] }),
                ...(tipoComparacao !== 'periodos' && { [`ids${tipoComparacao.charAt(0).toUpperCase() + tipoComparacao.slice(1)}`]: ids.split(',') }),
                ...(inicio && {
                  periodo: {
                    inicio: new Date(inicio),
                    fim: fim ? new Date(fim) : new Date()
                  }
                })
              },
              forceUpdate: forceUpdate === "true"
            }
          }
        },
        "API"
      );

      responderRequisicao(res, resultado);
    } catch (error) {
      responderErro(res, error);
    }
  },

  async gerarAlertasProdutividade(req, res) {
    try {
      const { dados } = req.body;

      const resultado = await sistemaAgente.enviarMensagem(
        "AgenteAnaliseProdutividade",
        {
          tipo: "GERAR_ALERTAS_PRODUTIVIDADE",
          carga: { dados }
        },
        "API"
      );

      responderRequisicao(res, resultado);
    } catch (error) {
      responderErro(res, error);
    }
  },

  async gerarInsightsProdutividade(req, res) {
    try {
      const { dados } = req.body;

      const resultado = await sistemaAgente.enviarMensagem(
        "AgenteAnaliseProdutividade",
        {
          tipo: "GERAR_INSIGHTS_PRODUTIVIDADE",
          carga: { dados }
        },
        "API"
      );

      responderRequisicao(res, resultado);
    } catch (error) {
      responderErro(res, error);
    }
  }
};

module.exports = produtividadeController;