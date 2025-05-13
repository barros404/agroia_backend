const mongoose = require("mongoose");
const atividadeModel = require("../models/atividadeModel");
const Parcela = require("../models/parcelaModel");
const Cultura = require("../models/culturaModel");
const Equipamento = require("../models/equipamentoModel");
const Produto = require("../models/produtoModel");
const Agente = require("./Agente");

class AgenteAnaliseCustos extends Agente {
  constructor() {
    super("AgenteAnaliseCustos");
    this.cache = {
      custos: {},
      custosPorParcela: {},
      custosPorCultura: {},
      custosPorTipoAtividade: {},
      custosPorPeriodo: {},
      custosPorResponsavel: {},
      custosPorEquipamento: {},
      custosPorTipoProduto: {},
    };
    this.alertasConfigurados = [];
    this.limitesPadrao = {
      custoPorHoraEquipamento: 50,
      custoPorHoraMaoDeObra: 10,
      precoPorUnidadeProduto: 5,
    };
  }

  // Métodos principais de cálculo
  async calcularCustoAtividade(idOuAtividade) {
    try {
      let atividade;

      // Verifica se é um ID ou objeto já populado
      if (
        typeof idOuAtividade === "string" ||
        idOuAtividade instanceof mongoose.Types.ObjectId
      ) {
        atividade = await atividadeModel
          .findById(idOuAtividade)
          .populate("equipamentos.equipamento")
          .populate("produtos.produto")
          .populate("responsavel", "nome email");
      } else {
        // Usa o objeto já populado
        atividade = idOuAtividade;
      }

      if (!atividade) {
        return { sucesso: false, erro: "Atividade não encontrada" };
      }

      // Adiciona verificações de segurança
      const equipamentos = Array.isArray(atividade.equipamentos)
        ? atividade.equipamentos
        : [];
      const produtos = Array.isArray(atividade.produtos)
        ? atividade.produtos
        : [];

      const custoEquipamentos = await this.calcularCustoEquipamentosAtividade(
        equipamentos
      );
      const custoProdutos = await this.calcularCustoProdutosAtividade(produtos);
      const custoMaoDeObra = await this.calcularCustoMaoDeObraAtividade(
        atividade
      );

      const custoTotal = custoEquipamentos + custoProdutos + custoMaoDeObra;

      const resultado = {
        idAtividade: atividade._id,
        tipo: atividade.tipo,
        estado: atividade.estado,
        dataInicio: atividade.dataInicio,
        dataFim: atividade.dataFim,
        responsavel: atividade.responsavel,
        custoTotal,
        detalhamento: {
          equipamentos: custoEquipamentos,
          produtos: custoProdutos,
          maoDeObra: custoMaoDeObra,
        },
        equipamentos: equipamentos, // Usa a versão validada
        produtos: produtos, // Usa a versão validada
        eficiencia: await this.calcularEficienciaAtividade(
          atividade,
          custoTotal
        ),
      };

      this.atualizarCacheAtividade(resultado);
      return { sucesso: true, resultado };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  async calcularCustosParcela(idParcela, options = {}) {
    try {
      if (this.cache.custosPorParcela[idParcela] && !options.forceUpdate) {
        return {
          sucesso: true,
          custos: this.cache.custosPorParcela[idParcela],
        };
      }

      const atividades = await atividadeModel
        .find({
          parcela: idParcela,
          estado: { $in: options.estados || ["concluida", "pendente"] },
        })
        .populate({
          path: "equipamentos.equipamento",
          model: "Equipamento",
          select: "nome custoPorHora tipo",
        })
        .populate("produtos.produto")
        .populate("responsavel", "nome");
      //debugar (Resultado activdades)

      const custos = this.inicializarEstruturaCustos();
      const parcela = await Parcela.findById(idParcela);

      for (const atividade of atividades) {
        // debugar looo

        // Passa o objeto atividade JÁ POPULADO
        const resultado = await this.calcularCustoAtividade(atividade._id);

        if (!resultado.sucesso) continue;

        this.consolidarCustos(custos, resultado.resultado, {
          idParcela,
          nomeParcela: parcela?.nome || `Parcela ${idParcela}`,
          idCultura: parcela?.cultura,
        });
      }

      this.calcularTotais(custos);
      this.cache.custosPorParcela[idParcela] = custos;

      return { sucesso: true, custos };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  async calcularCustosCultura(idCultura, options = {}) {
    try {
      if (this.cache.custosPorCultura[idCultura] && !options.forceUpdate) {
        return {
          sucesso: true,
          custos: this.cache.custosPorCultura[idCultura],
        };
      }

      const parcelas = await Parcela.find({ cultura: idCultura });

      if (!parcelas.length) {
        return {
          sucesso: false,
          erro: "Nenhuma parcela encontrada para esta cultura",
        };
      }

      const custos = this.inicializarEstruturaCustos();

      const cultura = await Cultura.findById(idCultura);

      for (const parcela of parcelas) {
        const resultado = await this.calcularCustosParcela(
          parcela._id,
          options
        );
        //debugar o resulto

        if (!resultado.sucesso || !resultado.custos) continue; // Adicione esta verificação
        this.consolidarCustos(custos, resultado.custos, {
          idCultura,
          nomeCultura: cultura?.nome || `Cultura ${idCultura}`,
          idParcela: parcela._id,
          nomeParcela: parcela.nome,
        });
      }

      this.calcularTotais(this.cache.custos);
      this.cache.custosPorCultura[idCultura] = this.cache.custos;

      return { sucesso: true, custos: this.cache.custos };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  // Métodos de análise temporal
  async calcularCustosPorPeriodo(
    dataInicio,
    dataFim = new Date(),
    options = {}
  ) {
    try {
      const chaveCache = `${dataInicio.toISOString()}-${dataFim.toISOString()}`;
      if (this.cache.custosPorPeriodo[chaveCache] && !options.forceUpdate) {
        return {
          sucesso: true,
          custos: this.cache.custosPorPeriodo[chaveCache],
        };
      }

      const query = {
        estado: { $in: options.estados || ["concluida", "pendente"] },
        $or: [
          {
            dataInicio: { $gte: dataInicio },
            dataFim: { $lte: dataFim },
          },
          {
            dataInicio: { $lte: dataFim },
            dataFim: null,
          },
        ],
      };

      if (options.filtros) {
        Object.assign(query, options.filtros);
      }

      const atividades = await atividadeModel
        .find(query)
        .populate("equipamentos.equipamento")
        .populate("produtos.produto")
        .populate("parcela", "nome cultura")
        .populate("responsavel", "nome");

      const custos = this.inicializarEstruturaCustos();

      for (const atividade of atividades) {
        const resultado = await this.calcularCustoAtividade(atividade._id);
        if (!resultado.sucesso) continue;

        this.consolidarCustos(custos, resultado.resultado, {
          idParcela: atividade.parcela?._id,
          nomeParcela: atividade.parcela?.nome,
          idCultura: atividade.parcela?.cultura,
        });
      }

      this.calcularTotais(custos);
      custos.periodo = { inicio: dataInicio, fim: dataFim };
      this.cache.custosPorPeriodo[chaveCache] = custos;

      return { sucesso: true, custos };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  // Métodos de análise específica
  async calcularCustoPorTipoAtividade(tipo, options = {}) {
    try {
      const chaveCache = `tipo-${tipo}`;
      if (
        this.cache.custosPorTipoAtividade[chaveCache] &&
        !options.forceUpdate
      ) {
        return {
          sucesso: true,
          custos: this.cache.custosPorTipoAtividade[chaveCache],
        };
      }

      const query = {
        tipo,
        estado: { $in: options.estados || ["concluida", "pendente"] },
      };

      if (options.periodo) {
        query.$or = [
          {
            dataInicio: { $gte: options.periodo.inicio },
            dataFim: { $lte: options.periodo.fim },
          },
          {
            dataInicio: { $lte: options.periodo.fim },
            dataFim: null,
          },
        ];
      }

      const atividades = await atividadeModel
        .find(query)
        .populate("equipamentos.equipamento")
        .populate("produtos.produto")
        .populate("parcela", "nome cultura");

      const custos = this.inicializarEstruturaCustos();

      for (const atividade of atividades) {
        const resultado = await this.calcularCustoAtividade(atividade._id);
        if (!resultado.sucesso) continue;

        this.consolidarCustos(custos, resultado.resultado, {
          idParcela: atividade.parcela?._id,
          nomeParcela: atividade.parcela?.nome,
          idCultura: atividade.parcela?.cultura,
        });
      }

      this.calcularTotais(custos);
      custos.tipoAtividade = tipo;
      this.cache.custosPorTipoAtividade[chaveCache] = custos;

      return { sucesso: true, custos };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  async calcularCustoPorResponsavel(idResponsavel, options = {}) {
    try {
      const chaveCache = `responsavel-${idResponsavel}`;
      if (this.cache.custosPorResponsavel[chaveCache] && !options.forceUpdate) {
        return {
          sucesso: true,
          custos: this.cache.custosPorResponsavel[chaveCache],
        };
      }

      const query = {
        responsavel: idResponsavel,
        estado: { $in: options.estados || ["concluida", "pendente"] },
      };

      if (options.periodo) {
        query.$or = [
          {
            dataInicio: { $gte: options.periodo.inicio },
            dataFim: { $lte: options.periodo.fim },
          },
          {
            dataInicio: { $lte: options.periodo.fim },
            dataFim: null,
          },
        ];
      }

      const atividades = await atividadeModel
        .find(query)
        .populate("equipamentos.equipamento")
        .populate("produtos.produto")
        .populate("parcela", "nome cultura")
        .populate("responsavel", "nome");

      const custos = this.inicializarEstruturaCustos();

      for (const atividade of atividades) {
        const resultado = await this.calcularCustoAtividade(atividade._id);
        if (!resultado.sucesso) continue;

        this.consolidarCustos(custos, resultado.resultado, {
          idParcela: atividade.parcela?._id,
          nomeParcela: atividade.parcela?.nome,
          idCultura: atividade.parcela?.cultura,
        });
      }

      this.calcularTotais(custos);
      custos.responsavel = atividades[0]?.responsavel || { _id: idResponsavel };
      this.cache.custosPorResponsavel[chaveCache] = custos;

      return { sucesso: true, custos };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  // Métodos auxiliares
  inicializarEstruturaCustos() {
    return {
      total: 0,
      porParcela: {},
      porCultura: {},
      porEquipamento: {},
      porTipoProduto: {},
      porTipoAtividade: {},
      porResponsavel: {},
      equipamentos: 0,
      produtos: 0,
      maoDeObra: 0,
      atividades: [],
      quantidadeAtividades: 0,
      metricas: {
        custoPorHora: 0,
        custoPorArea: 0,
        custoPorProducao: 0,
        eficienciaMedia: 0,
      },
    };
  }

  consolidarCustos(custos, dados, contexto) {
    if (!dados || !dados.detalhamento) return;
    // Atualizar totais
    custos.total += dados.custoTotal;
    custos.equipamentos += dados.detalhamento.equipamentos;
    custos.produtos += dados.detalhamento.produtos;
    custos.maoDeObra += dados.detalhamento.maoDeObra;
    custos.quantidadeAtividades += 1;
    custos.atividades.push(dados);

    // Consolidar por parcela
    if (contexto.idParcela) {
      if (!custos.porParcela[contexto.idParcela]) {
        custos.porParcela[contexto.idParcela] = {
          total: 0,
          equipamentos: 0,
          produtos: 0,
          maoDeObra: 0,
          nome: contexto.nomeParcela,
          atividades: [],
        };
      }
      custos.porParcela[contexto.idParcela].total += dados.custoTotal;
      custos.porParcela[contexto.idParcela].equipamentos +=
        dados.detalhamento.equipamentos;
      custos.porParcela[contexto.idParcela].produtos +=
        dados.detalhamento.produtos;
      custos.porParcela[contexto.idParcela].maoDeObra +=
        dados.detalhamento.maoDeObra;
      custos.porParcela[contexto.idParcela].atividades.push(dados);
    }

    // Consolidar por cultura
    if (contexto.idCultura) {
      if (!custos.porCultura[contexto.idCultura]) {
        custos.porCultura[contexto.idCultura] = {
          total: 0,
          equipamentos: 0,
          produtos: 0,
          maoDeObra: 0,
          nome: contexto.nomeCultura,
          parcelas: {},
        };
      }
      custos.porCultura[contexto.idCultura].total += dados.custoTotal;
      custos.porCultura[contexto.idCultura].equipamentos +=
        dados.detalhamento.equipamentos;
      custos.porCultura[contexto.idCultura].produtos +=
        dados.detalhamento.produtos;
      custos.porCultura[contexto.idCultura].maoDeObra +=
        dados.detalhamento.maoDeObra;

      if (contexto.idParcela) {
        custos.porCultura[contexto.idCultura].parcelas[contexto.idParcela] =
          (custos.porCultura[contexto.idCultura].parcelas[contexto.idParcela] ||
            0) + dados.custoTotal;
      }
    }

    // Consolidar por tipo de atividade
    if (dados.tipo) {
      custos.porTipoAtividade[dados.tipo] =
        (custos.porTipoAtividade[dados.tipo] || 0) + dados.custoTotal;
    }

    // Consolidar por responsável
    if (dados.responsavel?._id) {
      const responsavelId = dados.responsavel._id.toString();
      if (!custos.porResponsavel[responsavelId]) {
        custos.porResponsavel[responsavelId] = {
          total: 0,
          equipamentos: 0,
          produtos: 0,
          maoDeObra: 0,
          nome: dados.responsavel.nome,
          atividades: [],
        };
      }
      custos.porResponsavel[responsavelId].total += dados.custoTotal;
      custos.porResponsavel[responsavelId].equipamentos +=
        dados.detalhamento.equipamentos;
      custos.porResponsavel[responsavelId].produtos +=
        dados.detalhamento.produtos;
      custos.porResponsavel[responsavelId].maoDeObra +=
        dados.detalhamento.maoDeObra;
      custos.porResponsavel[responsavelId].atividades.push(dados);
    }

    // Consolidar por equipamento (adicionado)
    const equipamentos = Array.isArray(dados.equipamentos)
      ? dados.equipamentos
      : [];
    for (const equipamento of equipamentos) {
      const equipamentoId =
        equipamento.equipamento?._id?.toString() || "desconhecido";
      if (!custos.porEquipamento[equipamentoId]) {
        custos.porEquipamento[equipamentoId] = {
          total: 0,
          nome: equipamento.equipamento?.nome || "Equipamento desconhecido",
          atividades: [],
        };
      }
      const custoEquipamento = this.calcularCustoEquipamento(equipamento);
      custos.porEquipamento[equipamentoId].total += custoEquipamento;
      custos.porEquipamento[equipamentoId].atividades.push(dados);
    }

    // Consolidar por tipo de produto (adicionado)
    const produtos = Array.isArray(dados.produtos) ? dados.produtos : [];
    for (const produto of produtos) {
      const tipoProduto = produto.produto?.tipo || "desconhecido";
      if (!custos.porTipoProduto[tipoProduto]) {
        custos.porTipoProduto[tipoProduto] = {
          total: 0,
          nome: tipoProduto,
          atividades: [],
        };
      }
      const custoProduto =
        produto.quantidade *
        (produto.produto?.precoPorUnidade ||
          this.limitesPadrao.precoPorUnidadeProduto);
      custos.porTipoProduto[tipoProduto].total += custoProduto;
      custos.porTipoProduto[tipoProduto].atividades.push(dados);
    }

    this.cache.custos = custos;
  }

  calcularTotais(custos) {
    // Calcular métricas adicionais
    if (custos.quantidadeAtividades > 0) {
      custos.metricas.custoPorHora =
        custos.total / (custos.quantidadeAtividades * 8); // Assume 8h por atividade
      custos.metricas.eficienciaMedia =
        custos.atividades.reduce((sum, a) => sum + (a.eficiencia || 0), 0) /
        custos.quantidadeAtividades;
    }
  }

  async calcularCustoEquipamentosAtividade(equipamentos) {
    if (!equipamentos || !Array.isArray(equipamentos)) return 0;

    let total = 0;

    for (const item of equipamentos) {
      let equipamento, custoPorHora;

      if (item.equipamento && typeof item.equipamento === "object") {
        equipamento = item.equipamento;
        custoPorHora =
          equipamento.custoPorHora ||
          this.limitesPadrao.custoPorHoraEquipamento;
      } else {
        equipamento = await Equipamento.findById(item.equipamento);
        custoPorHora =
          equipamento?.custoPorHora ||
          this.limitesPadrao.custoPorHoraEquipamento;
      }

      const horas = this.converterParaHoras(
        item.tempoUtilizado,
        item.unidadeTempo
      );
      total += horas * custoPorHora;
    }

    return total;
  }
  calcularCustoEquipamento(equipamento) {
    const custoPorHora =
      equipamento.equipamento?.custoPorHora ||
      this.limitesPadrao.custoPorHoraEquipamento;
    const horas = this.converterParaHoras(
      equipamento.tempoUtilizado,
      equipamento.unidadeTempo
    );
    return horas * custoPorHora;
  }

  async calcularCustoProdutosAtividade(produtos) {
    if (!produtos || !Array.isArray(produtos)) return 0;

    let total = 0;

    for (const item of produtos) {
      let produto, precoPorUnidade;

      if (item.produto && typeof item.produto === "object") {
        produto = item.produto;
        precoPorUnidade =
          produto.precoPorUnidade || this.limitesPadrao.precoPorUnidadeProduto;
      } else {
        produto = await Produto.findById(item.produto);
        precoPorUnidade =
          produto?.precoPorUnidade || this.limitesPadrao.precoPorUnidadeProduto;
      }

      total += item.quantidade * precoPorUnidade;
    }

    return total;
  }

  async calcularCustoMaoDeObraAtividade(atividade) {
    // Implementação simplificada - em um sistema real, buscaríamos os detalhes do responsável
    const horasEstimadas = this.estimarHorasTrabalhoPorTipo(atividade.tipo);
    return horasEstimadas * this.limitesPadrao.custoPorHoraMaoDeObra;
  }

  estimarHorasTrabalhoPorTipo(tipoAtividade) {
    // Valores padrão estimados para horas de trabalho por tipo de atividade
    const horasPorTipo = {
      preparo: 8,
      plantio: 6,
      tratamento: 4,
      colheita: 10,
      manutencao: 5,
    };
    return horasPorTipo[tipoAtividade] || 8;
  }

  async calcularEficienciaAtividade(atividade, custoTotal) {
    // Métrica de eficiência simplificada (0-100)
    // Em um sistema real, usaríamos métricas mais complexas
    const horasEstimadas = this.estimarHorasTrabalhoPorTipo(atividade.tipo);
    const eficienciaTempo = atividade.dataFim
      ? (horasEstimadas * 60) /
        ((atividade.dataFim - atividade.dataInicio) / (1000 * 60))
      : 50;

    const eficienciaCusto = (1 - custoTotal / (horasEstimadas * 100)) * 100;

    return eficienciaTempo * 0.6 + eficienciaCusto * 0.4; // Ponderado
  }

  converterParaHoras(tempo, unidade) {
    if (!tempo) return 0;

    switch (unidade) {
      case "minuto":
        return tempo / 60;
      case "hora":
        return tempo;
      case "dia":
        return tempo * 8; // Considerando 8h/dia útil
      case "semana":
        return tempo * 40; // 5 dias de 8h
      case "mes":
        return tempo * 160; // 20 dias de 8h
      default:
        return tempo;
    }
  }

  atualizarCacheAtividade(resultado) {
    // Atualizar todos os caches relevantes com os novos dados
    if (resultado.idAtividade) {
      // Implementar lógica de atualização de cache
    }
  }

  // Métodos de alertas e insights
  verificarAlertas(custos) {
    const alertas = [];

    // Alertas padrão
    if (custos.total > 10000) {
      alertas.push({
        tipo: "CUSTO_TOTAL_ELEVADO",
        mensagem: `Custo total elevado: ${custos.total.toFixed(2)}`,
        nivel: "alto",
        sugestao:
          "Analise os custos por categoria para identificar oportunidades de redução",
      });
    }

    if (custos.equipamentos / custos.total > 0.7) {
      alertas.push({
        tipo: "CUSTO_EQUIPAMENTOS_DESPROPORCIONAL",
        mensagem: `Custo com equipamentos representa ${(
          (custos.equipamentos / custos.total) *
          100
        ).toFixed(2)}% do total`,
        nivel: "medio",
        sugestao:
          "Considere otimizar o uso de equipamentos ou negociar melhores tarifas",
      });
    }

    // Verificar alertas configurados
    for (const alerta of this.alertasConfigurados) {
      if (alerta.condicao(custos)) {
        alertas.push(alerta);
      }
    }
   

    return alertas;
  }

  gerarInsights(custos) {
    const insights = [];

    // Insights básicos
    if (custos.porTipoAtividade) {
      const tipoMaisCaro = Object.entries(custos.porTipoAtividade).reduce(
        (a, b) => (a[1] > b[1] ? a : b)
      );
      insights.push({
        tipo: "TIPO_ATIVIDADE_MAIS_CARO",
        mensagem: `O tipo de atividade mais caro foi '${
          tipoMaisCaro[0]
        }' com ${tipoMaisCaro[1].toFixed(2)}`,
        impacto: "alto",
      });
    }
    console.log('porEquipamento', custos.porEquipamento)

    if (custos.porEquipamento) {
      const equipamentoMaisUtilizado = Object.entries(
        custos.porEquipamento
      ).reduce((a, b) => (a[1] > b[1] ? a : b));
      insights.push({
        tipo: "EQUIPAMENTO_MAIS_UTILIZADO",
        mensagem: `O equipamento mais utilizado foi '${
          equipamentoMaisUtilizado[0]
        }' com custo de ${equipamentoMaisUtilizado[1].toFixed(2)}€`,
        impacto: "medio",
      });
    }

    return insights;
  }

  // Métodos de interface do agente
  processarMensagem(mensagem, remetente) {
    switch (mensagem.tipo) {
      case "CALCULAR_CUSTO_ATIVIDADE":
        return this.calcularCustoAtividade(mensagem.carga.idAtividade);

      case "CALCULAR_CUSTOS_PARCELA":
        return this.calcularCustosParcela(
          mensagem.carga.idParcela,
          mensagem.carga.options
        );

      case "CALCULAR_CUSTOS_CULTURA":
        return this.calcularCustosCultura(
          mensagem.carga.idCultura,
          mensagem.carga.options
        );

      case "CALCULAR_CUSTOS_PERIODO":
        return this.calcularCustosPorPeriodo(
          new Date(mensagem.carga.dataInicio),
          mensagem.carga.dataFim ? new Date(mensagem.carga.dataFim) : undefined,
          mensagem.carga.options
        );

      case "CALCULAR_CUSTO_POR_TIPO_ATIVIDADE":
        return this.calcularCustoPorTipoAtividade(
          mensagem.carga.tipo,
          mensagem.carga.options
        );

      case "CALCULAR_CUSTO_POR_RESPONSAVEL":
        return this.calcularCustoPorResponsavel(
          mensagem.carga.idResponsavel,
          mensagem.carga.options
        );

      case "GERAR_ALERTAS":
        return this.verificarAlertas(mensagem.carga.custos);

      case "GERAR_INSIGHTS":
        return this.gerarInsights(mensagem.carga.custos);

      case "CONFIGURAR_ALERTA":
        return this.configurarAlerta(mensagem.carga.configuracao);

      case "LIMPAR_CACHE":
        this.cache = {
          custosPorParcela: {},
          custosPorCultura: {},
          custosPorTipoAtividade: {},
          custosPorPeriodo: {},
          custosPorResponsavel: {},
          custosPorEquipamento: {},
          custosPorTipoProduto: {},
        };
        return { sucesso: true, mensagem: "Cache limpo com sucesso" };

      case "COMPARAR_CUSTOS":
        const { tipoComparacao, ids, options } = mensagem.carga;
        
        switch (tipoComparacao) {
          case "colheitas":
           
            return this.compararCustosColheitas({
              idsColheitas: ids,
              ...options,
            });
          case "parcelas":
            return this.compararCustosParcelas({
              idsParcelas: ids,
              ...options,
            });
          case "culturas":
            return this.compararCustosCulturas({
              idsCulturas: ids,
              ...options,
            });
          default:
            return { sucesso: false, erro: "Tipo de comparação inválido" };
        }
      default:
        return {
          sucesso: false,
          erro: `Tipo de mensagem desconhecido: ${mensagem.tipo}`,
        };
    }
  }

  configurarAlerta(configuracao) {
    if (
      !configuracao.nome ||
      !configuracao.condicao ||
      !configuracao.mensagem
    ) {
      return { sucesso: false, erro: "Configuração de alerta inválida" };
    }

    const novoAlerta = {
      id: Date.now().toString(),
      ...configuracao,
      nivel: configuracao.nivel || "medio",
      dataConfiguracao: new Date(),
    };

    this.alertasConfigurados.push(novoAlerta);
    return { sucesso: true, alerta: novoAlerta };
  }

  // Adicione estes métodos à classe AgenteAnaliseCustos

  async compararCustosColheitas(options = {}) {
    try {
      const { idsColheitas, forceUpdate } = options;
      const chaveCache = `comparacao-colheitas-${idsColheitas.join("-")}`;

      if (this.cache.custos[chaveCache] && !forceUpdate) {
        return { sucesso: true, comparacao: this.cache.custos[chaveCache] };
      }

      const atividades = await atividadeModel
        .find({
          _id: { $in: idsColheitas },
          tipo: "colheita",
        })
        .populate("equipamentos.equipamento")
        .populate("produtos.produto")
        .populate("parcela", "nome cultura")
        .populate("responsavel", "nome");
        console.log(atividades); // Debugar atividades
      if (atividades.length === 0) {
        return {
          sucesso: false,
          erro: "Nenhuma atividade de colheita encontrada",
        };
      }

      const resultados = [];
      for (const atividade of atividades) {
        const resultado = await this.calcularCustoAtividade(atividade);
        if (resultado.sucesso) {
          resultados.push({
            idAtividade: atividade._id,
            data: atividade.dataFim,
            parcela: atividade.parcela?.nome,
            cultura: atividade.parcela?.cultura,
            custoTotal: resultado.resultado.custoTotal,
            quantidadeColhida: atividade.quantidadeColhida,
            unidadeColheita: atividade.unidadeColheita,
            custoPorUnidade: atividade.quantidadeColhida
              ? resultado.resultado.custoTotal / atividade.quantidadeColhida
              : 0,
          });
        }
      }

      const comparacao = {
        tipo: "colheitas",
        itens: resultados,
        metricas: this.calcularMetricasComparacao(resultados),
      };
      // Debugar resultados
      this.cache.custos[chaveCache] = comparacao;
      
      return { sucesso: true, comparacao };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  async compararCustosParcelas(options = {}) {
    try {
      const { idsParcelas, forceUpdate } = options;
      const chaveCache = `comparacao-parcelas-${idsParcelas.join("-")}`;

      if (this.cache.custos[chaveCache] && !forceUpdate) {
        return { sucesso: true, comparacao: this.cache.custos[chaveCache] };
      }

      const resultados = [];
      for (const idParcela of idsParcelas) {
        const resultado = await this.calcularCustosParcela(idParcela, {
          forceUpdate,
        });
        if (resultado.sucesso) {
          const parcela = await Parcela.findById(idParcela).populate("cultura");
          resultados.push({
            idParcela,
            nome: parcela?.nome,
            area: parcela?.area,
            cultura: parcela?.cultura?.nome,
            custoTotal: resultado.custos.total,
            custoPorArea: parcela?.area
              ? resultado.custos.total / parcela.area
              : 0,
            atividades: resultado.custos.quantidadeAtividades,
          });
        }
      }

      const comparacao = {
        tipo: "parcelas",
        itens: resultados,
        metricas: this.calcularMetricasComparacao(resultados),
      };

      this.cache.custos[chaveCache] = comparacao;
      return { sucesso: true, comparacao };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  async compararCustosCulturas(options = {}) {
    try {
      const { idsCulturas, forceUpdate } = options;
      const chaveCache = `comparacao-culturas-${idsCulturas.join("-")}`;

      if (this.cache.custos[chaveCache] && !forceUpdate) {
        return { sucesso: true, comparacao: this.cache.custos[chaveCache] };
      }

      const resultados = [];
      for (const idCultura of idsCulturas) {
        const resultado = await this.calcularCustosCultura(idCultura, {
          forceUpdate,
        });
        if (resultado.sucesso) {
          const cultura = await Cultura.findById(idCultura);
          const parcelas = await Parcela.find({ cultura: idCultura });
          const areaTotal = parcelas.reduce((sum, p) => sum + (p.area || 0), 0);

          resultados.push({
            idCultura,
            nome: cultura?.nome,
            tipo: cultura?.tipo,
            parcelas: parcelas.length,
            areaTotal,
            custoTotal: resultado.custos.total,
            custoPorArea: areaTotal ? resultado.custos.total / areaTotal : 0,
            atividades: resultado.custos.quantidadeAtividades,
          });
        }
      }

      const comparacao = {
        tipo: "culturas",
        itens: resultados,
        metricas: this.calcularMetricasComparacao(resultados),
      };

      this.cache.custos[chaveCache] = comparacao;
      return { sucesso: true, comparacao };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  calcularMetricasComparacao(itens) {
    if (itens.length === 0) return {};

    const metricas = {
      menorCusto: null,
      maiorCusto: null,
      custoMedio: 0,
      variacaoPercentual: null,
    };

    // Encontrar menor e maior custo
    metricas.menorCusto = itens.reduce(
      (min, item) => (item.custoTotal < min.custoTotal ? item : min),
      itens[0]
    );
    metricas.maiorCusto = itens.reduce(
      (max, item) => (item.custoTotal > max.custoTotal ? item : max),
      itens[0]
    );

    // Calcular custo médio
    metricas.custoMedio =
      itens.reduce((sum, item) => sum + item.custoTotal, 0) / itens.length;

    // Calcular variação percentual se houver mais de um item
    if (itens.length > 1) {
      const primeiro = itens[0].custoTotal;
      const ultimo = itens[itens.length - 1].custoTotal;
      metricas.variacaoPercentual = ((ultimo - primeiro) / primeiro) * 100;
    }

    return metricas;
  }

  // Adicione este caso ao método processarMensagem
}

module.exports = AgenteAnaliseCustos;
