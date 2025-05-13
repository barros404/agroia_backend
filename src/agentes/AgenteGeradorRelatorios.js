const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { Parser } = require("json2csv");
const Agente = require("./Agente");
const AgenteAnaliseCustos = require("./AgenteAnaliseCustos");
const AgenteAnaliseProdutividade = require("./AgenteAnaliseProdutividade");
const atividadeModel = require("../models/atividadeModel");
const Parcela = require("../models/parcelaModel");
const Cultura = require("../models/culturaModel");
const Equipamento = require("../models/equipamentoModel");
const Produto = require("../models/produtoModel");
const Usuario = require("../models/userModel");

class AgenteGeradorRelatorios extends Agente {
  constructor() {
    super("AgenteGeradorRelatorios");
    this.cache = {
      relatoriosGerados: {},
      templates: {},
    };
    this.agenteCustos = new AgenteAnaliseCustos();
    this.agenteProdutividade = new AgenteAnaliseProdutividade();
    this.formatosSuportados = ["json", "csv", "pdf", "html"];
    this.diretorioRelatorios = path.join(__dirname, "../../relatorios");

    // Garantir que o diretório de relatórios existe
    if (!fs.existsSync(this.diretorioRelatorios)) {
      fs.mkdirSync(this.diretorioRelatorios, { recursive: true });
    }
  }

  // Métodos principais de geração de relatórios
  async gerarRelatorioCustos(options = {}) {
    try {
      const {
        tipo,
        id,
        periodo,
        formato = "json",
        forceUpdate = false,
      } = options;
      const chaveCache = `custo-${tipo}-${id}-${periodo?.inicio}-${periodo?.fim}`;

      if (this.cache.relatoriosGerados[chaveCache] && !forceUpdate) {
        return this.formatarRelatorio(
          this.cache.relatoriosGerados[chaveCache],
          formato
        );
      }

      let dados;
      switch (tipo) {
        case "atividade":
          dados = await this.agenteCustos.calcularCustoAtividade(id);
          break;
        case "parcela":
          dados = await this.agenteCustos.calcularCustosParcela(id, {
            periodo,
          });
          break;
        case "cultura":
          dados = await this.agenteCustos.calcularCustosCultura(id, {
            periodo,
          });
          break;
        case "periodo":
          dados = await this.agenteCustos.calcularCustosPorPeriodo(
            new Date(periodo.inicio),
            periodo.fim ? new Date(periodo.fim) : undefined
          );
          break;
        case "tipo-atividade":
          dados = await this.agenteCustos.calcularCustoPorTipoAtividade(id, {
            periodo,
          });
          break;
        case "responsavel":
          dados = await this.agenteCustos.calcularCustoPorResponsavel(id, {
            periodo,
          });
          break;
        default:
          return {
            sucesso: false,
            erro: "Tipo de relatório de custos inválido",
          };
      }

      if (!dados.sucesso) {
        return dados;
      }
      
      const relatorio = {
        tipo: `custo-${tipo}`,
        periodo,
        geradoEm: new Date(),
        dados: dados,
        alertas: this.agenteCustos.verificarAlertas(
          dados.custos || dados.resultado
        ),
        insights: this.agenteCustos.gerarInsights(
          dados.custos || dados.resultado
        ),
      };
      console.log('relatorio',relatorio);
      this.cache.relatoriosGerados[chaveCache] = relatorio;
      return this.formatarRelatorio(relatorio, formato);
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  async gerarRelatorioProdutividade(options = {}) {
    try {
      const {
        tipo,
        id,
        periodo,
        formato = "json",
        forceUpdate = false,
      } = options;
      const chaveCache = `produtividade-${tipo}-${id}-${periodo?.inicio}-${periodo?.fim}`;

      if (this.cache.relatoriosGerados[chaveCache] && !forceUpdate) {
        return this.formatarRelatorio(
          this.cache.relatoriosGerados[chaveCache],
          formato
        );
      }

      let dados;
      switch (tipo) {
        case "parcela":
          dados = await this.agenteProdutividade.analisarProdutividadeParcela(
            id,
            { periodo }
          );
          break;
        case "cultura":
          dados = await this.agenteProdutividade.analisarProdutividadeCultura(
            id,
            { periodo }
          );
          break;
        case "eficiencia":
          dados = await this.agenteProdutividade.analisarEficienciaOperacional({
            periodo,
          });
          break;
        case "tendencias":
          dados =
            await this.agenteProdutividade.analisarTendenciasProdutividade(id, {
              periodo,
            });
          break;
        default:
          return {
            sucesso: false,
            erro: "Tipo de relatório de produtividade inválido",
          };
      }

      if (!dados.sucesso) {
        return dados;
      }

      const relatorio = {
        tipo: `produtividade-${tipo}`,
        periodo,
        geradoEm: new Date(),
        dados: dados,
        alertas: this.agenteProdutividade.verificarAlertas(dados.dados),
        insights: this.agenteProdutividade.gerarInsights(dados.dados),
      };

      this.cache.relatoriosGerados[chaveCache] = relatorio;
      return this.formatarRelatorio(relatorio, formato);
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  async gerarRelatorioAtividades(options = {}) {
    try {
      const { filtros = {}, formato = "json", forceUpdate = false } = options;
      const chaveCache = `atividades-${JSON.stringify(filtros)}`;

      if (this.cache.relatoriosGerados[chaveCache] && !forceUpdate) {
        return this.formatarRelatorio(
          this.cache.relatoriosGerados[chaveCache],
          formato
        );
      }

      // Aplicar filtros padrão se não fornecidos
      if (!filtros.estado) {
        filtros.estado = { $in: ["concluida", "pendente"] };
      }

      const atividades = await atividadeModel
        .find(filtros)
        .populate("parcela", "nome cultura")
        .populate("responsavel", "nome email")
        .populate("equipamentos.equipamento", "nome tipo")
        .populate("produtos.produto", "nome tipo precoPorUnidade")
        .sort({ dataInicio: -1 });

      // Calcular custos para cada atividade
      const atividadesComCustos = [];
      for (const atividade of atividades) {
        const custo = await this.agenteCustos.calcularCustoAtividade(atividade);
        if (custo.sucesso) {
          atividadesComCustos.push({
            ...atividade.toObject(),
            custo: custo.resultado,
          });
        } else {
          atividadesComCustos.push(atividade.toObject());
        }
      }

      const relatorio = {
        tipo: "atividades",
        filtros,
        geradoEm: new Date(),
        totalAtividades: atividades.length,
        atividades: atividadesComCustos,
        metricas: this.calcularMetricasAtividades(atividadesComCustos),
      };

      this.cache.relatoriosGerados[chaveCache] = relatorio;
      return this.formatarRelatorio(relatorio, formato);
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  async gerarRelatorioEquipamentos(options = {}) {
    try {
      const { filtros = {}, formato = "json", forceUpdate = false } = options;
      const chaveCache = `equipamentos-${JSON.stringify(filtros)}`;

      if (this.cache.relatoriosGerados[chaveCache] && !forceUpdate) {
        return this.formatarRelatorio(
          this.cache.relatoriosGerados[chaveCache],
          formato
        );
      }

      const equipamentos = await Equipamento.find(filtros);

      // Obter atividades para cada equipamento
      const equipamentosComUso = [];
      for (const equipamento of equipamentos) {
        const atividades = await atividadeModel.find({
          "equipamentos.equipamento": equipamento._id,
          estado: "concluida",
        });

        let horasUso = 0;
        let custoTotal = 0;

        for (const atividade of atividades) {
          const itemEquipamento = atividade.equipamentos.find(
            (e) => e.equipamento.toString() === equipamento._id.toString()
          );

          if (itemEquipamento) {
            const horas = this.agenteCustos.converterParaHoras(
              itemEquipamento.tempoUtilizado,
              itemEquipamento.unidadeTempo
            );
            horasUso += horas;
            custoTotal +=
              horas *
              (equipamento.custoPorHora ||
                this.agenteCustos.limitesPadrao.custoPorHoraEquipamento);
          }
        }

        equipamentosComUso.push({
          ...equipamento.toObject(),
          horasUso,
          custoTotal,
          atividades: atividades.length,
        });
      }

      if (!Array.isArray(equipamentosComUso)) {
        console.error('Equipamentos não é um array:', equipamentosComUso);
        equipamentosComUso = [];
    }

    const relatorio = {
        tipo: "equipamentos",
        filtros,
        geradoEm: new Date(),
        totalEquipamentos: equipamentosComUso.length,
        equipamentos: equipamentosComUso,
        metricas: this.calcularMetricasEquipamentos(equipamentosComUso)
    };


      this.cache.relatoriosGerados[chaveCache] = relatorio;
      return this.formatarRelatorio(relatorio, formato);
    } catch (error) {
      return { sucesso: false, 
        erro: error.message ,
        stack: error.stack // Adicionar stack trace para debug
        };
    }
  }

  async gerarRelatorioProdutos(options = {}) {
    try {
      const { filtros = {}, formato = "json", forceUpdate = false } = options;
      const chaveCache = `produtos-${JSON.stringify(filtros)}`;

      if (this.cache.relatoriosGerados[chaveCache] && !forceUpdate) {
        return this.formatarRelatorio(
          this.cache.relatoriosGerados[chaveCache],
          formato
        );
      }

      const produtos = await Produto.find(filtros);

      // Obter atividades para cada produto
      const produtosComUso = [];
      for (const produto of produtos) {
        const atividades = await atividadeModel.find({
          "produtos.produto": produto._id,
        });

        let quantidadeUsada = 0;
        let custoTotal = 0;

        for (const atividade of atividades) {
          const itemProduto = atividade.produtos.find(
            (p) => p.produto.toString() === produto._id.toString()
          );

          if (itemProduto) {
            quantidadeUsada += itemProduto.quantidade;
            custoTotal +=
              itemProduto.quantidade *
              (produto.precoPorUnidade ||
                this.agenteCustos.limitesPadrao.precoPorUnidadeProduto);
          }
        }

        produtosComUso.push({
          ...produto.toObject(),
          quantidadeUsada,
          custoTotal,
          atividades: atividades.length,
        });
      }

      const relatorio = {
        tipo: "produtos",
        filtros,
        geradoEm: new Date(),
        totalProdutos: produtos.length,
        produtos: produtosComUso,
        metricas: this.calcularMetricasProdutos(produtosComUso),
      };

      this.cache.relatoriosGerados[chaveCache] = relatorio;
      return this.formatarRelatorio(relatorio, formato);
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  async gerarRelatorioPersonalizado(options = {}) {
    try {
      const {
        tipo,
        parametros = {},
        formato = "json",
        forceUpdate = false,
      } = options;
      const chaveCache = `personalizado-${tipo}-${JSON.stringify(parametros)}`;

      if (this.cache.relatoriosGerados[chaveCache] && !forceUpdate) {
        return this.formatarRelatorio(
          this.cache.relatoriosGerados[chaveCache],
          formato
        );
      }

      let relatorio;
      switch (tipo) {
        case "comparativo-culturas":
          relatorio = await this.gerarComparativoCulturas(parametros);
          break;
        case "comparativo-parcelas":
          relatorio = await this.gerarComparativoParcelas(parametros);
          break;
        case "evolucao-produtividade":
          relatorio = await this.gerarEvolucaoProdutividade(parametros);
          break;
        case "custo-beneficio":
          relatorio = await this.gerarCustoBeneficio(parametros);
          break;
        case "uso-recursos":
          relatorio = await this.gerarUsoRecursos(parametros);
          break;
        default:
          return {
            sucesso: false,
            erro: "Tipo de relatório personalizado inválido",
          };
      }

      if (!relatorio.sucesso) {
        return relatorio;
      }

      this.cache.relatoriosGerados[chaveCache] = relatorio.dados;
      return this.formatarRelatorio(relatorio.dados, formato);
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  // Métodos auxiliares para relatórios personalizados
  async gerarComparativoCulturas({ idsCulturas, periodo }) {
    const culturas = await Cultura.find({ _id: { $in: idsCulturas } });
    const resultados = [];

    for (const cultura of culturas) {
      const analise =
        await this.agenteProdutividade.analisarProdutividadeCultura(
          cultura._id,
          { periodo }
        );
      const custos = await this.agenteCustos.calcularCustosCultura(
        cultura._id,
        { periodo }
      );

      if (analise.sucesso && custos.sucesso) {
        resultados.push({
          cultura: cultura.nome,
          tipo: cultura.tipo,
          produtividade: analise.dados.metricas.produtividadeMedia,
          custoTotal: custos.custos.total,
          eficiencia: analise.dados.metricas.comparativoEsperado,
          custoPorTonelada:
            custos.custos.total /
              ((analise.dados.metricas.produtividadeMedia *
                analise.dados.metricas.areaTotal) /
                1000) || 0,
        });
      }
    }

    return {
      sucesso: true,
      dados: {
        tipo: "comparativo-culturas",
        periodo,
        geradoEm: new Date(),
        culturas: resultados,
        metricas: this.calcularMetricasComparativas(resultados),
      },
    };
  }

  async gerarComparativoParcelas({ idsParcelas, periodo }) {
    const parcelas = await Parcela.find({ _id: { $in: idsParcelas } }).populate(
      "cultura"
    );
    const resultados = [];

    for (const parcela of parcelas) {
      const analise =
        await this.agenteProdutividade.analisarProdutividadeParcela(
          parcela._id,
          { periodo }
        );
      const custos = await this.agenteCustos.calcularCustosParcela(
        parcela._id,
        { periodo }
      );

      if (analise.sucesso && custos.sucesso) {
        resultados.push({
          parcela: parcela.nome,
          cultura: parcela.cultura?.nome,
          area: parcela.area,
          produtividade: analise.dados.metricas.produtividadeMedia,
          custoTotal: custos.custos.total,
          custoPorHectare: custos.custos.total / parcela.area,
          eficiencia: analise.dados.metricas.comparativoEsperado,
        });
      }
    }

    return {
      sucesso: true,
      dados: {
        tipo: "comparativo-parcelas",
        periodo,
        geradoEm: new Date(),
        parcelas: resultados,
        metricas: this.calcularMetricasComparativas(resultados),
      },
    };
  }

  async gerarEvolucaoProdutividade({ idParcela, periodos }) {
    const resultados = [];

    for (const periodo of periodos) {
      const analise =
        await this.agenteProdutividade.analisarProdutividadeParcela(idParcela, {
          periodo,
          forceUpdate: true,
        });

      if (analise.sucesso) {
        resultados.push({
          periodo:
            periodo.nome ||
            `${periodo.inicio.toISOString().split("T")[0]} a ${
              periodo.fim.toISOString().split("T")[0]
            }`,
          inicio: periodo.inicio,
          fim: periodo.fim,
          produtividade: analise.dados.metricas.produtividadeMedia,
          variacao: analise.dados.metricas.variacaoProdutividade,
        });
      }
    }

    return {
      sucesso: true,
      dados: {
        tipo: "evolucao-produtividade",
        idParcela,
        geradoEm: new Date(),
        periodos: resultados,
        metricas: this.calcularMetricasEvolucao(resultados),
      },
    };
  }

  async gerarCustoBeneficio({ idCultura, periodo }) {
    const cultura = await Cultura.findById(idCultura);
    if (!cultura) {
      return { sucesso: false, erro: "Cultura não encontrada" };
    }

    const analiseProd =
      await this.agenteProdutividade.analisarProdutividadeCultura(idCultura, {
        periodo,
      });
    const analiseCustos = await this.agenteCustos.calcularCustosCultura(
      idCultura,
      { periodo }
    );

    if (!analiseProd.sucesso || !analiseCustos.sucesso) {
      return { sucesso: false, erro: "Dados insuficientes para análise" };
    }

    const producaoTotal =
      analiseProd.dados.metricas.produtividadeMedia *
      analiseProd.dados.metricas.areaTotal;
    const custoTotal = analiseCustos.custos.total;
    const precoMedio = cultura.precoMedioVenda || 1; // Valor padrão se não definido

    return {
      sucesso: true,
      dados: {
        tipo: "custo-beneficio",
        cultura: cultura.nome,
        periodo,
        geradoEm: new Date(),
        producaoTotal,
        custoTotal,
        receitaEstimada: producaoTotal * precoMedio,
        lucroEstimado: producaoTotal * precoMedio - custoTotal,
        roi: ((producaoTotal * precoMedio - custoTotal) / custoTotal) * 100,
        precoMedio,
      },
    };
  }

  async gerarUsoRecursos({ periodo }) {
    const [equipamentos, produtos, atividades] = await Promise.all([
      Equipamento.find(),
      Produto.find(),
      atividadeModel.find({
        estado: "concluida",
        dataFim: {
          $gte: periodo.inicio,
          $lte: periodo.fim,
        },
      }),
    ]);

    const usoEquipamentos = equipamentos.map((eq) => {
      const uso = atividades.reduce((total, atv) => {
        const item = atv.equipamentos.find(
          (e) => e.equipamento.toString() === eq._id.toString()
        );
        return (
          total +
          (item
            ? this.agenteCustos.converterParaHoras(
                item.tempoUtilizado,
                item.unidadeTempo
              )
            : 0)
        );
      }, 0);
      return {
        equipamento: eq.nome,
        tipo: eq.tipo,
        horasUso: uso,
        custo:
          uso *
          (eq.custoPorHora ||
            this.agenteCustos.limitesPadrao.custoPorHoraEquipamento),
      };
    });

    const usoProdutos = produtos.map((prod) => {
      const uso = atividades.reduce((total, atv) => {
        const item = atv.produtos.find(
          (p) => p.produto.toString() === prod._id.toString()
        );
        return total + (item ? item.quantidade : 0);
      }, 0);
      return {
        produto: prod.nome,
        tipo: prod.tipo,
        quantidadeUsada: uso,
        custo:
          uso *
          (prod.precoPorUnidade ||
            this.agenteCustos.limitesPadrao.precoPorUnidadeProduto),
      };
    });

    return {
      sucesso: true,
      dados: {
        tipo: "uso-recursos",
        periodo,
        geradoEm: new Date(),
        equipamentos: usoEquipamentos,
        produtos: usoProdutos,
        metricas: {
          totalHorasEquipamentos: usoEquipamentos.reduce(
            (sum, e) => sum + e.horasUso,
            0
          ),
          totalCustoEquipamentos: usoEquipamentos.reduce(
            (sum, e) => sum + e.custo,
            0
          ),
          totalQuantidadeProdutos: usoProdutos.reduce(
            (sum, p) => sum + p.quantidadeUsada,
            0
          ),
          totalCustoProdutos: usoProdutos.reduce((sum, p) => sum + p.custo, 0),
        },
      },
    };
  }

  // Métodos auxiliares de cálculo de métricas
  calcularMetricasAtividades(atividades) {
    if (atividades.length === 0) return {};

    const metricas = {
      totalAtividades: atividades.length,
      porTipo: {},
      porEstado: {},
      porParcela: {},
      porResponsavel: {},
      custoTotal: 0,
      eficienciaMedia: 0,
    };

    let custoTotal = 0;
    let eficienciaTotal = 0;
    let atividadesComCusto = 0;

    for (const atividade of atividades) {
      // Por tipo
      metricas.porTipo[atividade.tipo] =
        (metricas.porTipo[atividade.tipo] || 0) + 1;

      // Por estado
      metricas.porEstado[atividade.estado] =
        (metricas.porEstado[atividade.estado] || 0) + 1;

      // Por parcela
      if (atividade.parcela) {
        const parcelaId = atividade.parcela._id.toString();
        metricas.porParcela[parcelaId] = {
          nome: atividade.parcela.nome,
          count: (metricas.porParcela[parcelaId]?.count || 0) + 1,
        };
      }

      // Por responsável
      if (atividade.responsavel) {
        const responsavelId = atividade.responsavel._id.toString();
        metricas.porResponsavel[responsavelId] = {
          nome: atividade.responsavel.nome,
          count: (metricas.porResponsavel[responsavelId]?.count || 0) + 1,
        };
      }

      // Custos e eficiência
      if (atividade.custo) {
        custoTotal += atividade.custo.custoTotal;
        eficienciaTotal += atividade.custo.eficiencia || 0;
        atividadesComCusto++;
      }
    }

    metricas.custoTotal = custoTotal;
    metricas.eficienciaMedia =
      atividadesComCusto > 0 ? eficienciaTotal / atividadesComCusto : 0;

    return metricas;
  }

  calcularMetricasEquipamentos(equipamentos) {
    if (!equipamentos || !Array.isArray(equipamentos) || equipamentos.length === 0) {
      return {
        totalEquipamentos: 0,
        horasUsoTotal: 0,
        custoTotal: 0,
        porTipo: {},
        equipamentoMaisUtilizado: null
      };
    }

    // Converter valores para números para garantir cálculos corretos
    const equipamentosProcessados = equipamentos.map(eq => ({
      ...eq,
      horasUso: Number(eq.horasUso) || 0,
      custoTotal: Number(eq.custoTotal) || 0
    }));

    // Encontrar o equipamento mais utilizado
    const equipamentoMaisUtilizado = equipamentosProcessados.reduce((max, eq) => 
      eq.horasUso > max.horasUso ? eq : max, 
      equipamentosProcessados[0]
    );

    // Calcular totais
    const horasUsoTotal = equipamentosProcessados.reduce((sum, eq) => sum + eq.horasUso, 0);
    const custoTotal = equipamentosProcessados.reduce((sum, eq) => sum + eq.custoTotal, 0);

    // Agrupar por tipo
    const porTipo = equipamentosProcessados.reduce((acc, eq) => {
      const tipo = eq.tipo || 'desconhecido';
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {});

    return {
      totalEquipamentos: equipamentosProcessados.length,
      horasUsoTotal: this.formatarNumero(horasUsoTotal),
      custoTotal: this.formatarNumero(custoTotal),
      porTipo,
      equipamentoMaisUtilizado: equipamentoMaisUtilizado ? {
        _id: equipamentoMaisUtilizado._id,
        nome: equipamentoMaisUtilizado.nome || 'Não informado',
        tipo: equipamentoMaisUtilizado.tipo || 'Não informado',
        horasUso: this.formatarNumero(equipamentoMaisUtilizado.horasUso),
        custoTotal: this.formatarNumero(equipamentoMaisUtilizado.custoTotal)
      } : null
    };
}

  // Adicione este método auxiliar na classe
  formatarNumero(valor) {
    // Converter para número se for string
    const num = typeof valor === 'string' ? parseFloat(valor) : Number(valor);
    
    // Verificar se é um número válido
    if (isNaN(num)) {
        return 0;
    }
    
    // Arredondar para 2 casas decimais
    return parseFloat(num.toFixed(2));
}

  calcularMetricasProdutos(produtos) {
    if (produtos.length === 0) return {};

    return {
      totalProdutos: produtos.length,
      quantidadeTotal: produtos.reduce((sum, p) => sum + p.quantidadeUsada, 0),
      custoTotal: produtos.reduce((sum, p) => sum + p.custoTotal, 0),
      porTipo: produtos.reduce((acc, p) => {
        acc[p.tipo] = (acc[p.tipo] || 0) + 1;
        return acc;
      }, {}),
      produtoMaisUtilizado: produtos.reduce(
        (max, p) => (p.quantidadeUsada > max.quantidadeUsada ? p : max),
        produtos[0] || {}
      ),
    };
  }

  calcularMetricasComparativas(itens) {
    if (itens.length === 0) return {};

    return {
      melhorItem: itens.reduce(
        (max, item) => (item.eficiencia > max.eficiencia ? item : max),
        itens[0]
      ),
      piorItem: itens.reduce(
        (min, item) => (item.eficiencia < min.eficiencia ? item : min),
        itens[0]
      ),
      mediaEficiencia:
        itens.reduce((sum, item) => sum + item.eficiencia, 0) / itens.length,
      mediaCusto:
        itens.reduce((sum, item) => sum + item.custoTotal, 0) / itens.length,
      variacaoEficiencia:
        itens.length > 1
          ? ((itens[itens.length - 1].eficiencia - itens[0].eficiencia) /
              itens[0].eficiencia) *
            100
          : 0,
    };
  }

  calcularMetricasEvolucao(periodos) {
    if (periodos.length === 0) return {};

    return {
      maiorProdutividade: periodos.reduce(
        (max, p) => (p.produtividade > max.produtividade ? p : max),
        periodos[0]
      ),
      menorProdutividade: periodos.reduce(
        (min, p) => (p.produtividade < min.produtividade ? p : min),
        periodos[0]
      ),
      crescimentoTotal:
        periodos.length > 1
          ? ((periodos[periodos.length - 1].produtividade -
              periodos[0].produtividade) /
              periodos[0].produtividade) *
            100
          : 0,
      mediaProdutividade:
        periodos.reduce((sum, p) => sum + p.produtividade, 0) / periodos.length,
    };
  }

  // Métodos de formatação e exportação
  async formatarRelatorio(relatorio, formato = "json") {
    try {
      if (!this.formatosSuportados.includes(formato)) {
        return { sucesso: false, erro: `Formato ${formato} não suportado` };
      }

      switch (formato) {
        case "json":
          return { sucesso: true, relatorio, formato: "json" };

        case "csv":
          return this.gerarCSV(relatorio);

        case "html":
          return this.gerarHTML(relatorio);

        case "pdf":
          return this.gerarPDF(relatorio);

        default:
          return { sucesso: false, erro: "Formato não implementado" };
      }
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  async gerarCSV(relatorio) {
    try {
      const transformarParaCSV = (dados) => {
        if (typeof dados === 'object' && dados !== null) {
          return JSON.stringify(dados);
        }
        return dados;
      };
  
      const campos = [
        'Tipo', 'Total Equipamentos', 'Horas Uso Total', 
        'Custo Total', 'Equipamento Mais Utilizado'
      ];
  
      const dados = [{
        'Tipo': relatorio.tipo,
        'Total Equipamentos': relatorio.metricas.totalEquipamentos,
        'Horas Uso Total': relatorio.metricas.horasUsoTotal,
        'Custo Total': relatorio.metricas.custoTotal,
        'Equipamento Mais Utilizado': transformarParaCSV(relatorio.metricas.equipamentoMaisUtilizado)
      }];
  
      const parser = new Parser({ campos });
      const csv = parser.parse(dados);
  
      const nomeArquivo = `${relatorio.tipo}-${new Date().toISOString().split('T')[0]}.csv`;
      const caminho = path.join(this.diretorioRelatorios, nomeArquivo);
      fs.writeFileSync(caminho, csv);
  
      return { 
        sucesso: true, 
        relatorio: csv, 
        formato: 'csv',
        caminhoArquivo: caminho
      };
    } catch (error) {
      return { 
        sucesso: false, 
        erro: error.message,
        detalhes: `Falha ao gerar CSV: ${error.stack}`
      };
    }
  }
  async gerarHTML(relatorio) {
    try {
      // Implementação básica - em produção, usar um template engine como Handlebars
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Relatório ${relatorio.tipo}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #2c3e50; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .alert { color: #e74c3c; font-weight: bold; }
            .insight { color: #27ae60; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Relatório ${relatorio.tipo}</h1>
          <p>Gerado em: ${relatorio.geradoEm.toISOString()}</p>
      `;

      // Adicionar conteúdo específico do relatório
      if (relatorio.periodo) {
        html += `<p>Período: ${relatorio.periodo.inicio} a ${
          relatorio.periodo.fim || "atual"
        }</p>`;
      }

      // Adicionar métricas principais
      if (relatorio.metricas) {
        html += `<h2>Métricas Principais</h2><ul>`;
        for (const [chave, valor] of Object.entries(relatorio.metricas)) {
          html += `<li><strong>${chave}:</strong> ${JSON.stringify(
            valor
          )}</li>`;
        }
        html += `</ul>`;
      }

      // Adicionar alertas
      if (relatorio.alertas && relatorio.alertas.length > 0) {
        html += `<h2>Alertas</h2><ul>`;
        for (const alerta of relatorio.alertas) {
          html += `<li class="alert">${alerta.mensagem} - ${alerta.sugestao}</li>`;
        }
        html += `</ul>`;
      }

      // Adicionar insights
      if (relatorio.insights && relatorio.insights.length > 0) {
        html += `<h2>Insights</h2><ul>`;
        for (const insight of relatorio.insights) {
          html += `<li class="insight">${insight.mensagem} - ${insight.acao}</li>`;
        }
        html += `</ul>`;
      }

      // Adicionar dados detalhados
      html += `<h2>Dados Detalhados</h2>`;
      html += `<pre>${JSON.stringify(relatorio.dados, null, 2)}</pre>`;

      html += `</body></html>`;

      // Salvar arquivo
      const nomeArquivo = `${relatorio.tipo}-${
        new Date().toISOString().split("T")[0]
      }.html`;
      const caminho = path.join(this.diretorioRelatorios, nomeArquivo);
      fs.writeFileSync(caminho, html);

      return {
        sucesso: true,
        relatorio: html,
        formato: "html",
        caminhoArquivo: caminho,
      };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  async gerarPDF(relatorio) {
    try {
      // Em produção, usar uma biblioteca como pdfkit ou puppeteer
      // Esta é uma implementação simulada que gera HTML primeiro
      const resultadoHTML = await this.gerarHTML(relatorio);
      if (!resultadoHTML.sucesso) {
        return resultadoHTML;
      }

      // Simular conversão de HTML para PDF
      const nomeArquivo = `${relatorio.tipo}-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      const caminho = path.join(this.diretorioRelatorios, nomeArquivo);

      // Em produção real, aqui seria a conversão para PDF
      fs.writeFileSync(
        caminho,
        "PDF gerado a partir de: " + resultadoHTML.caminhoArquivo
      );

      return {
        sucesso: true,
        relatorio: "Conteúdo PDF gerado com sucesso",
        formato: "pdf",
        caminhoArquivo: caminho,
      };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  // Métodos de interface do agente
  processarMensagem(mensagem, remetente) {
    switch (mensagem.tipo) {
      case "GERAR_RELATORIO_CUSTOS":
        return this.gerarRelatorioCustos(mensagem.carga);

      case "GERAR_RELATORIO_PRODUTIVIDADE":
        return this.gerarRelatorioProdutividade(mensagem.carga);

      case "GERAR_RELATORIO_ATIVIDADES":
        return this.gerarRelatorioAtividades(mensagem.carga);

      case "GERAR_RELATORIO_EQUIPAMENTOS":
        return this.gerarRelatorioEquipamentos(mensagem.carga);

      case "GERAR_RELATORIO_PRODUTOS":
        return this.gerarRelatorioProdutos(mensagem.carga);

      case "GERAR_RELATORIO_PERSONALIZADO":
        return this.gerarRelatorioPersonalizado(mensagem.carga);

      case "LIMPAR_CACHE_RELATORIOS":
        this.cache.relatoriosGerados = {};
        return {
          sucesso: true,
          mensagem: "Cache de relatórios limpo com sucesso",
        };

      case "LISTAR_RELATORIOS_DISPONIVEIS":
        return this.listarRelatoriosDisponiveis();

      case "OBTER_RELATORIO_GERADO":
        return this.obterRelatorioGerado(mensagem.carga.id);

      default:
        return {
          sucesso: false,
          erro: `Tipo de mensagem desconhecido: ${mensagem.tipo}`,
        };
    }
  }

  listarRelatoriosDisponiveis() {
    const tipos = {
      custos: [
        "atividade",
        "parcela",
        "cultura",
        "periodo",
        "tipo-atividade",
        "responsavel",
      ],
      produtividade: ["parcela", "cultura", "eficiencia", "tendencias"],
      recursos: ["atividades", "equipamentos", "produtos"],
      personalizados: [
        "comparativo-culturas",
        "comparativo-parcelas",
        "evolucao-produtividade",
        "custo-beneficio",
        "uso-recursos",
      ],
    };

    return { sucesso: true, tipos };
  }

  obterRelatorioGerado(id) {
    const relatorio = this.cache.relatoriosGerados[id];
    if (!relatorio) {
      return { sucesso: false, erro: "Relatório não encontrado no cache" };
    }
    return { sucesso: true, relatorio };
  }
}

module.exports = AgenteGeradorRelatorios;
