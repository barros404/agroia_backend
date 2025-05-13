const SistemaAgente = require("../agentes/SistemaAgente");
const sistemaAgente = new SistemaAgente();

// Funções auxiliares (reutilizadas do custosController)
const responderRequisicao = (res, resultado) => {
  if (resultado.sucesso) {
    res.status(200).json({
      sucesso: true,
      ...(resultado.relatorio && { relatorio: resultado.relatorio }),
      ...(resultado.caminhoArquivo && {
        caminhoArquivo: resultado.caminhoArquivo,
      }),
      ...(resultado.tipos && { tipos: resultado.tipos }),
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

// Controller de Relatórios
const relatoriosController = {
  async gerarRelatorioCustos(req, res) {
    try {
      const { tipo = "parcela", id } = req.params; // Valor padrão para tipo
      const { formato = "json", forceUpdate = false } = req.query;
      const periodo = req.query.periodo
        ? JSON.parse(req.query.periodo)
        : undefined;

      // Verifica se é uma rota específica (/custos/parcela/:id)
      const isSpecificRoute = req.originalUrl.includes("/custos/parcela/");

      const payload = {
        tipo: isSpecificRoute ? "parcela" : tipo,
        id: isSpecificRoute ? req.params.id : id,
        periodo,
        formato,
        forceUpdate: forceUpdate === "true",
      };

      const resultado = await sistemaAgente.enviarMensagem(
        "AgenteGeradorRelatorios",
        {
          tipo: "GERAR_RELATORIO_CUSTOS",
          carga: payload,
        },
        "API"
      );
      console.log("Resultado do AgenteGeradorRelatorios:", resultado);
      responderRequisicao(res, resultado);
    } catch (error) {
      responderErro(res, error);
    }
  },

  async gerarRelatorioProdutividade(req, res) {
    try {
      const { tipo = "parcela", id } = req.params;
      const { formato = "json", forceUpdate = false } = req.query;
      const periodo = req.query.periodo
        ? JSON.parse(req.query.periodo)
        : undefined;

      // Verifica se é uma rota específica (/produtividade/parcela/:id)
      const isSpecificRoute = req.originalUrl.includes(
        "/produtividade/parcela/"
      );

      const payload = {
        tipo: isSpecificRoute ? "parcela" : tipo,
        id: isSpecificRoute ? req.params.id : id,
        periodo,
        formato,
        forceUpdate: forceUpdate === "true",
      };

      const resultado = await sistemaAgente.enviarMensagem(
        "AgenteGeradorRelatorios",
        {
          tipo: "GERAR_RELATORIO_PRODUTIVIDADE",
          carga: payload,
        },
        "API"
      );

      responderRequisicao(res, resultado);
    } catch (error) {
      responderErro(res, error);
    }
  },

  async gerarRelatorioAtividades(req, res) {
    try {
      const { formato = "json", forceUpdate = false } = req.query;
      const filtros = req.query.filtros ? JSON.parse(req.query.filtros) : {};

      console.log(`Gerando relatório de atividades formato ${formato}`);

      const resultado = await sistemaAgente.enviarMensagem(
        "AgenteGeradorRelatorios",
        {
          tipo: "GERAR_RELATORIO_ATIVIDADES",
          carga: {
            filtros,
            formato,
            forceUpdate: forceUpdate === "true",
          },
        },
        "API"
      );

      responderRequisicao(res, resultado);
    } catch (error) {
      responderErro(res, error);
    }
  },

  async gerarRelatorioEquipamentos(req, res) {
    try {
      const { formato = "json", forceUpdate = false } = req.query;
      const filtros = req.query.filtros ? JSON.parse(req.query.filtros) : {};

      console.log(`Gerando relatório de equipamentos formato ${formato}`);

      const resultado = await sistemaAgente.enviarMensagem(
        "AgenteGeradorRelatorios",
        {
          tipo: "GERAR_RELATORIO_EQUIPAMENTOS",
          carga: {
            filtros,
            formato,
            forceUpdate: forceUpdate === "true",
          },
        },
        "API"
      );

      responderRequisicao(res, resultado);
    } catch (error) {
      responderErro(res, error);
    }
  },

  async gerarRelatorioProdutos(req, res) {
    try {
      const { formato = "json", forceUpdate = false } = req.query;
      const filtros = req.query.filtros ? JSON.parse(req.query.filtros) : {};

      console.log(`Gerando relatório de produtos formato ${formato}`);

      const resultado = await sistemaAgente.enviarMensagem(
        "AgenteGeradorRelatorios",
        {
          tipo: "GERAR_RELATORIO_PRODUTOS",
          carga: {
            filtros,
            formato,
            forceUpdate: forceUpdate === "true",
          },
        },
        "API"
      );

      responderRequisicao(res, resultado);
    } catch (error) {
      responderErro(res, error);
    }
  },

  async gerarRelatorioPersonalizado(req, res) {
    try {
      const { tipo } = req.params;
      const { formato = "json", forceUpdate = false } = req.query;
      const parametros = req.query.parametros
        ? JSON.parse(req.query.parametros)
        : {};

      console.log(
        `Gerando relatório personalizado (${tipo}) formato ${formato}`
      );

      const resultado = await sistemaAgente.enviarMensagem(
        "AgenteGeradorRelatorios",
        {
          tipo: "GERAR_RELATORIO_PERSONALIZADO",
          carga: {
            tipo,
            parametros,
            formato,
            forceUpdate: forceUpdate === "true",
          },
        },
        "API"
      );

      responderRequisicao(res, resultado);
    } catch (error) {
      responderErro(res, error);
    }
  },

  async listarRelatoriosDisponiveis(req, res) {
    try {
      console.log("Listando relatórios disponíveis");

      const resultado = await sistemaAgente.enviarMensagem(
        "AgenteGeradorRelatorios",
        {
          tipo: "LISTAR_RELATORIOS_DISPONIVEIS",
        },
        "API"
      );

      responderRequisicao(res, resultado);
    } catch (error) {
      responderErro(res, error);
    }
  },

  async obterRelatorioGerado(req, res) {
    try {
      const { id } = req.params;
      console.log(`Obtendo relatório gerado ID: ${id}`);

      const resultado = await sistemaAgente.enviarMensagem(
        "AgenteGeradorRelatorios",
        {
          tipo: "OBTER_RELATORIO_GERADO",
          carga: { id },
        },
        "API"
      );

      responderRequisicao(res, resultado);
    } catch (error) {
      responderErro(res, error);
    }
  },
};

module.exports = relatoriosController;
