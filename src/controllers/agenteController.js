const SistemaAgente = require("../agentes/SistemaAgente");
const Atividade = require("../models/atividadeModel");
const Equipamento = require("../models/equipamentoModel");
const User = require("../models/userModel");

// Instância singleton do Sistema de Agentes
const sistemaAgente = new SistemaAgente();

// Controle de atividades
exports.criarAtividade = async (req, res) => {
  try {
    const {
      tipo,
      estado,
      dataInicio,
      dataFim,
      parcela,
      equipamentos,
      produtos,
      responsavel,
      observacoes,
      quantidadeColhida,
      unidadeColheita,
    } = req.body;
    console.log(req.body);

    // Validações básicas
    if (!tipo) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Tipo de atividade é obrigatório",
      });
    }

    if (!dataInicio) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Data de início é obrigatória",
      });
    }

    if (!parcela) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Parcela é obrigatória",
      });
    }

    if (!responsavel) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Responsável é obrigatório",
      });
    }

    // Verificar se o tipo de atividade é válido
    const tiposValidos = [
      "preparo",
      "plantio",
      "tratamento",
      "colheita",
      "manutencao",
    ];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Tipo de atividade inválido",
      });
    }

    // Preparar dados para criação
    const dadosAtividade = {
      tipo,
      estado: estado || "pendente",
      dataInicio: new Date(dataInicio),
      dataFim: dataFim ? new Date(dataFim) : null,
      parcela,
      responsavel,
      observacoes: observacoes || "",
      criadoPor: req.user.id,
      atualizadoPor: req.user.id,
    };

    // Adicionar campos específicos para colheita
    if (tipo === "colheita") {
      if (!quantidadeColhida || !unidadeColheita) {
        return res.status(400).json({
          sucesso: false,
          mensagem:
            "Para atividades de colheita, quantidade e unidade são obrigatórias",
        });
      }
      dadosAtividade.quantidadeColhida = parseFloat(quantidadeColhida);
      dadosAtividade.unidadeColheita = unidadeColheita;
    }

    // Adicionar equipamento se existir
    if (equipamentos && equipamentos.length > 0) {
      dadosAtividade.equipamentos = equipamentos.map((p) => ({
        equipamento: p.equipamento,
        tempoUtilizado: parseInt(p.tempoUtilizado),
        unidadeTempo: p.unidadeTempo || "hora"  // Corrigido aqui
      }));
    }

    // Adicionar produtos se existirem
    if (produtos && produtos.length > 0) {
      dadosAtividade.produtos = produtos.map((p) => ({
        produto: p.produto,
        quantidade: parseFloat(p.quantidade),
        unidade: p.unidade || "un", // Default para unidade caso não especificado
      }));
    }

    // Criar a atividade no banco de dados
    const atividade = await Atividade.create(dadosAtividade);

    // Enviar mensagem para o sistema de agentes
    const resultado = sistemaAgente.enviarMensagem(
      "AgenteRecolhaDados",
      {
        tipo: "CRIAR_ATIVIDADE",
        carga: {
          idAtividade: atividade._id,
          tipoAtividade: atividade.tipo,
          parcela: atividade.parcela,
          dataInicio: atividade.dataInicio,
        },
      },
      "API"
    );

    if (resultado.sucesso) {
      // Populate para retornar dados completos
      const atividadePopulada = await Atividade.findById(atividade._id)
      .populate("parcela", "nome area")
      .populate("responsavel", "nome email")
      .populate("equipamentos.equipamento", "nome tipo")  // CORRIGIDO
      .populate("produtos.produto", "nome unidadeMedida categoria")
      .populate("criadoPor", "nome email");

      res.status(201).json({
        sucesso: true,
        atividade: atividadePopulada,
      });
    } else {
      // Se falhar no sistema de agentes, remover a atividade criada
      await Atividade.findByIdAndDelete(atividade._id);
      res.status(400).json(resultado);
    }
  } catch (error) {
    console.error("Erro ao criar atividade:", error);
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao criar atividade",
      erro: error.message,
    });
  }
};
// lista todas as atividades (admin e gestor)
exports.listarAtividades = async (req, res) => {
  console.log(req.user.id)
  const user = await User.findById(req.user.id);
  if (user.funcao !== "admin" && user.funcao !== "gestor") {
    return res.status(401).json({
      sucesso: false,
      mensagem: "Não autorizado como administrador ou gestor",
    });
  }
  const atividades = await Atividade.find();
  res.status(200).json(atividades);
};

exports.atualizarAtividade = async (req, res) => {
  try {
    const { idFormulario } = req.params;
    const { campo, valor } = req.body;

    if (!idFormulario || !campo) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID do formulário e campo são obrigatórios",
      });
    }

    const resultado = sistemaAgente.enviarMensagem(
      "AgenteRecolhaDados",
      {
        tipo: "ATUALIZAR_ATIVIDADE",
        carga: { idFormulario, campo, valor },
      },
      "API"
    );

    if (resultado.sucesso) {
      res.status(200).json(resultado);
    } else {
      res.status(400).json(resultado);
    }
  } catch (error) {
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao atualizar atividade",
      erro: error.message,
    });
  }
};

exports.submeterAtividade = async (req, res) => {
  try {
    const { idFormulario } = req.params;
    const { idUtilizador } = req.body;

    if (!idFormulario) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID do formulário é obrigatório",
      });
    }

    // Obter o formulário primeiro
    const getFormulario = sistemaAgente.enviarMensagem(
      "AgenteRecolhaDados",
      {
        tipo: "ATUALIZAR_ATIVIDADE",
        carga: { idFormulario, campo: "id", valor: idFormulario },
      },
      "API"
    );

    if (!getFormulario.sucesso) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Formulário não encontrado",
      });
    }

    // Processar a submissão
    const resultado = sistemaAgente.tratarSubmissaoAtividade(
      getFormulario,
      idUtilizador || "usuario_anonimo"
    );

    if (resultado.sucesso) {
      res.status(200).json(resultado);
    } else {
      res.status(400).json(resultado);
    }
  } catch (error) {
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao submeter atividade",
      erro: error.message,
    });
  }
};

exports.sincronizar = async (req, res) => {
  try {
    const { idUtilizador } = req.body;
    const { atividades } = req.body;

    // Adicionar atividades à fila de sincronização
    if (atividades && Array.isArray(atividades)) {
      const resultado = sistemaAgente.enviarMensagem(
        "AgenteSincronizacao",
        {
          tipo: "PEDIDO_SINCRONIZACAO",
          carga: { idUtilizador, atividades },
        },
        "API"
      );

      res.status(200).json(resultado);
    } else {
      // Apenas obter o estado de sincronização
      const resultado = sistemaAgente.enviarMensagem(
        "AgenteSincronizacao",
        {
          tipo: "OBTER_ESTADO_SINCRONIZACAO",
          carga: {},
        },
        "API"
      );

      res.status(200).json(resultado);
    }
  } catch (error) {
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao processar sincronização",
      erro: error.message,
    });
  }
};

exports.obterEstadoSistema = async (req, res) => {
  try {
    const estado = sistemaAgente.obterEstadoSistema();
    res.status(200).json(estado);
  } catch (error) {
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao obter estado do sistema",
      erro: error.message,
    });
  }
};

// Análise de custos
exports.obterCustosParcela = async (req, res) => {
  try {
    const { idParcela } = req.params;
    console.log(`ID da parcela: ${idParcela}`);

    if (!idParcela) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID da parcela é obrigatório",
      });
    }

    // Enviar solicitação ao Agente para cálculo de custos
    const resultado = await sistemaAgente.enviarMensagem(
      "AgenteAnaliseCustos",
      {
        tipo: "CALCULAR_CUSTOS_PARCELA",
        carga: { idParcela },
      },
      "API"
    );

    if (resultado.sucesso) {
      res.status(200).json({
        sucesso: true,
        custos: resultado.custos,
      });
    } else {
      res.status(404).json({
        sucesso: false,
        mensagem: resultado.erro || "Erro ao calcular custos",
      });
    }
  } catch (error) {
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao obter custos da parcela",
      erro: error.message,
    });
  }
};
exports.obterCustosCultura= async (req, res) => {
  try {
    const { idCultura } = req.params;

    if (!idCultura) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID da Cultura é obrigatório",
      });
    }

    // Enviar solicitação ao Agente para cálculo de custos
    const resultado = await sistemaAgente.enviarMensagem(
      "AgenteAnaliseCustos",
      {
        tipo: "CALCULAR_CUSTOS_CULTURA",
        carga: { idCultura },
      },
      "API"
    );

    if (resultado.sucesso) {
      res.status(200).json({
        sucesso: true,
        custos: resultado.custos,
      });
    } else {
      res.status(404).json({
        sucesso: false,
        mensagem: resultado.erro || "Erro ao calcular custos",
      });
    }
  } catch (error) {
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao obter custos da parcela",
      erro: error.message,
    });
  }
};
//listages dos Equipamentos
exports.listarEquipamentos = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user.funcao !== "admin" && user.funcao !== "gestor") {
    return res.status(401).json({
      sucesso: false,
      mensagem: "Não autorizado como administrador ou gestor",
    });
  }
  const equipamentos = await Equipamento.find();
  res.status(200).json(equipamentos);
};

// Mais métodos do controlador conforme necessário...

module.exports = exports;
