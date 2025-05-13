const SistemaAgente = require("../agentes/SistemaAgente");
const sistemaAgente = new SistemaAgente();

// Funções auxiliares fora do objeto
const responderRequisicao = (res, resultado) => {
  if (resultado.sucesso) {
    res.status(200).json({
      sucesso: true,
      ...(resultado.custos && { custos: resultado.custos }),
      ...(resultado.resultado && { resultado: resultado.resultado }),
      ...(resultado.comparacao && { comparacao: resultado.comparacao }) // Adicione esta linha
    });
  } else {
    res.status(resultado.erro?.status || 400).json({
      sucesso: false,
      mensagem: resultado.erro?.mensagem || "Operação não realizada",
      detalhes: resultado.erro,
    });
  }
}

const responderErro = (res, error) => {
  console.error("Erro no controller:", error);
  res.status(500).json({
    sucesso: false,
    mensagem: "Erro interno no processamento",
    detalhes: error.message,
  });
};

// Controller sem `this`
const custosController = {
  async obterCustoAtividade(req, res) {
    try {
      const { id } = req.params;
      console.log(`Solicitação de custo para atividade ID: ${id}`);

      const resultado = await sistemaAgente.enviarMensagem(
        "AgenteAnaliseCustos",
        {
          tipo: "CALCULAR_CUSTO_ATIVIDADE",
          carga: { idAtividade: id },
        },
        "API"
      );

      responderRequisicao(res, resultado);
    } catch (error) {
      responderErro(res, error);
    }
  },

  async obterCustosParcela(req, res) {
    try {
      const { idParcela } = req.params;
      const { forceUpdate, estados } = req.query;
      console.log(`Calculando custos para parcela ${idParcela}`);

      const resultado = await sistemaAgente.enviarMensagem(
        "AgenteAnaliseCustos",
        {
          tipo: "CALCULAR_CUSTOS_PARCELA",
          carga: {
            idParcela,
            options: {
              forceUpdate: forceUpdate === "true",
              estados: estados?.split(","),
            },
          },
        },
        "API"
      );

      responderRequisicao(res, resultado);
    } catch (error) {
      responderErro(res, error);
    }
  },

  async obterCustosCultura(req, res) {
    try {
      const { idCultura } = req.params;
      const { forceUpdate, estados } = req.query;

      const resultado = await sistemaAgente.enviarMensagem(
        "AgenteAnaliseCustos",
        {
          tipo: "CALCULAR_CUSTOS_CULTURA",
          carga: {
            idCultura,
            options: {
              forceUpdate: forceUpdate === "true",
              estados: estados?.split(","),
            },
          },
        },
        "API"
      );
console.log("Resultado", resultado);
      responderRequisicao(res, resultado);
    } catch (error) {
      responderErro(res, error);
    }
  },

  async obterCustosPeriodo(req, res) {
    try {
      const { inicio, fim, forceUpdate } = req.query;
      console.log(`Calculando custos de ${inicio} até ${fim || "atual"}`);

      const resultado = await sistemaAgente.enviarMensagem(
        "AgenteAnaliseCustos",
        {
          tipo: "CALCULAR_CUSTOS_PERIODO",
          carga: {
            dataInicio: new Date(inicio),
            dataFim: fim ? new Date(fim) : new Date(),
            options: {
              forceUpdate: forceUpdate === "true",
              filtros: req.query.filtros ? JSON.parse(req.query.filtros) : {},
            },
          },
        },
        "API"
      );

      responderRequisicao(res, resultado);
    } catch (error) {
      responderErro(res, error);
    }
  },
  // Adicione ao custosController.js
async compararCustos(req, res) {
  try {
    const { tipo, ids } = req.params;
    const { forceUpdate } = req.query;

    const resultado = await sistemaAgente.enviarMensagem(
      "AgenteAnaliseCustos",
      {
        tipo: "COMPARAR_CUSTOS",
        carga: {
          tipoComparacao: tipo,
          ids: ids.split(','),
          options: {
            forceUpdate: forceUpdate === "true"
          }
        }
      },
      "API"
    );
    console.log("ResultadoReyortno", resultado);

    responderRequisicao(res, resultado);
  } catch (error) {
    responderErro(res, error);
  }
}
};


module.exports = custosController;
