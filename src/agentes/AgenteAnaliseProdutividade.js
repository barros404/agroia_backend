const mongoose = require('mongoose');
const atividadeModel = require("../models/atividadeModel");
const Parcela = require("../models/parcelaModel");
const Cultura = require("../models/culturaModel");
const Equipamento = require("../models/equipamentoModel");
const Produto = require("../models/produtoModel");
const Agente = require("./Agente");

class AgenteAnaliseProdutividade extends Agente {
  constructor() {
    super("AgenteAnaliseProdutividade");
    this.cache = {
      produtividadePorParcela: {},
      produtividadePorCultura: {},
      eficienciaPorTipoAtividade: {},
      tendenciasProdutividade: {},
      comparativoHistorico: {}
    };
    this.alertasConfigurados = [];
    this.metricasPadrao = {
      produtividadeEsperada: {
        cereal: 5000, // kg/ha
        horticola: 20000, // kg/ha
        fruta: 15000, // kg/ha
        vinha: 8000, // kg/ha
        olival: 3000, // kg/ha
        tuberculo: 25000, // kg/ha
        oleaginosa: 3500, // kg/ha
        outro: 10000 // kg/ha
      },
      eficienciaMinima: 60 // %
    };
  }

  // Métodos principais de análise
  async analisarProdutividadeParcela(idParcela, options = {}) {

    try {
      if (this.cache.produtividadePorParcela[idParcela] && !options.forceUpdate) {
        return {
          sucesso: true,
          dados: this.cache.produtividadePorParcela[idParcela]
        };
      }

      const parcela = await Parcela.findById(idParcela).populate('cultura');
      console.log(parcela)
      if (!parcela) {
        return { sucesso: false, erro: "Parcela não encontrada" };
      }

      const atividades = await atividadeModel.find({
        parcela: idParcela,
        estado: "concluida",
        tipo: "colheita"
      }).sort({ dataFim: 1 });

      if (!atividades.length) {
        return { sucesso: false, erro: "Nenhuma atividade de colheita encontrada" };
      }

      const resultado = {
        idParcela: parcela._id,
        nomeParcela: parcela.nome,
        area: parcela.area,
        tipoSolo: parcela.tipoSolo,
        cultura: parcela.cultura,
        historicoColheitas: [],
        metricas: {
          produtividadeMedia: 0,
          variacaoProdutividade: 0,
          eficienciaMedia: 0,
          comparativoEsperado: 0
        }
      };

      let totalProdutividade = 0;
      let valoresProdutividade = [];

      for (const atividade of atividades) {
        if (!atividade.quantidadeColhida || !atividade.unidadeColheita) continue;

        const produtividade = this.calcularProdutividade(
          atividade.quantidadeColhida,
          atividade.unidadeColheita,
          parcela.area
        );

        valoresProdutividade.push(produtividade);
        totalProdutividade += produtividade;

        resultado.historicoColheitas.push({
          data: atividade.dataFim,
          quantidade: atividade.quantidadeColhida,
          unidade: atividade.unidadeColheita,
          produtividade,
          atividadeId: atividade._id
        });
      }

      if (valoresProdutividade.length > 0) {
        resultado.metricas.produtividadeMedia = totalProdutividade / valoresProdutividade.length;
        
        if (valoresProdutividade.length > 1) {
          const primeiro = valoresProdutividade[0];
          const ultimo = valoresProdutividade[valoresProdutividade.length - 1];
          resultado.metricas.variacaoProdutividade = ((ultimo - primeiro) / primeiro) * 100;
        }

        if (parcela.cultura?.tipo) {
          const esperado = this.metricasPadrao.produtividadeEsperada[parcela.cultura.tipo] || 
                          this.metricasPadrao.produtividadeEsperada.outro;
          resultado.metricas.comparativoEsperado = 
            (resultado.metricas.produtividadeMedia / esperado) * 100;
        }
      }

      this.cache.produtividadePorParcela[idParcela] = resultado;
      return { sucesso: true, dados: resultado };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  async analisarProdutividadeCultura(idCultura, options = {}) {
    try {
      if (this.cache.produtividadePorCultura[idCultura] && !options.forceUpdate) {
        return {
          sucesso: true,
          dados: this.cache.produtividadePorCultura[idCultura]
        };
      }

      const cultura = await Cultura.findById(idCultura);
      if (!cultura) {
        return { sucesso: false, erro: "Cultura não encontrada" };
      }

      const parcelas = await Parcela.find({ cultura: idCultura });
      if (!parcelas.length) {
        return { sucesso: false, erro: "Nenhuma parcela encontrada para esta cultura" };
      }

      const resultado = {
        idCultura: cultura._id,
        nomeCultura: cultura.nome,
        tipoCultura: cultura.tipo,
        parcelas: [],
        metricas: {
          produtividadeMedia: 0,
          variacaoProdutividade: 0,
          eficienciaMedia: 0,
          comparativoEsperado: 0,
          areaTotal: 0
        }
      };

      let totalProdutividade = 0;
      let valoresProdutividade = [];
      let areaTotal = 0;

      for (const parcela of parcelas) {
        const analiseParcela = await this.analisarProdutividadeParcela(parcela._id, options);
        
        if (analiseParcela.sucesso && analiseParcela.dados.historicoColheitas.length > 0) {
          const prodMedia = analiseParcela.dados.metricas.produtividadeMedia;
          valoresProdutividade.push(prodMedia);
          totalProdutividade += prodMedia * parcela.area;
          areaTotal += parcela.area;

          resultado.parcelas.push({
            idParcela: parcela._id,
            nomeParcela: parcela.nome,
            area: parcela.area,
            produtividadeMedia: prodMedia,
            comparativoEsperado: analiseParcela.dados.metricas.comparativoEsperado
          });
        }
      }

      if (areaTotal > 0) {
        resultado.metricas.areaTotal = areaTotal;
        resultado.metricas.produtividadeMedia = totalProdutividade / areaTotal;
        
        if (cultura.tipo) {
          const esperado = this.metricasPadrao.produtividadeEsperada[cultura.tipo] || 
                          this.metricasPadrao.produtividadeEsperada.outro;
          resultado.metricas.comparativoEsperado = 
            (resultado.metricas.produtividadeMedia / esperado) * 100;
        }
      }

      this.cache.produtividadePorCultura[idCultura] = resultado;
      return { sucesso: true, dados: resultado };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  async analisarEficienciaOperacional(options = {}) {
    try {
      const { tipoAtividade, periodo, idResponsavel } = options;
      const chaveCache = `eficiencia-${tipoAtividade || 'all'}-${periodo?.inicio || 'all'}-${idResponsavel || 'all'}`;

      if (this.cache.eficienciaPorTipoAtividade[chaveCache] && !options.forceUpdate) {
        return {
          sucesso: true,
          dados: this.cache.eficienciaPorTipoAtividade[chaveCache]
        };
      }

      const query = {
        estado: "concluida"
      };

      if (tipoAtividade) query.tipo = tipoAtividade;
      if (idResponsavel) query.responsavel = idResponsavel;
      if (periodo) {
        query.dataFim = {
          $gte: periodo.inicio,
          $lte: periodo.fim || new Date()
        };
      }

      const atividades = await atividadeModel.find(query)
        .populate('parcela', 'nome area cultura')
        .populate('responsavel', 'nome');

      const resultado = {
        tipoAtividade: tipoAtividade || 'todas',
        periodo: periodo || 'todo',
        responsavel: idResponsavel || 'todos',
        atividades: [],
        metricas: {
          eficienciaMedia: 0,
          desvioPadraoEficiencia: 0,
          tempoMedioConclusao: 0,
          atividadesConcluidas: 0
        }
      };

      if (atividades.length === 0) {
        return { sucesso: true, dados: resultado };
      }

      let somaEficiencia = 0;
      let temposConclusao = [];
      let eficiencias = [];

      for (const atividade of atividades) {
        const custoAtividade = await AgenteAnaliseCustos.calcularCustoAtividade(atividade._id);
        
        if (!custoAtividade.sucesso) continue;

        const eficiencia = await this.calcularEficienciaOperacional(
          atividade,
          custoAtividade.resultado.custoTotal
        );

        eficiencias.push(eficiencia);
        somaEficiencia += eficiencia;

        if (atividade.dataInicio && atividade.dataFim) {
          const tempoConclusao = (atividade.dataFim - atividade.dataInicio) / (1000 * 60 * 60); // em horas
          temposConclusao.push(tempoConclusao);
        }

        resultado.atividades.push({
          idAtividade: atividade._id,
          tipo: atividade.tipo,
          dataInicio: atividade.dataInicio,
          dataFim: atividade.dataFim,
          parcela: atividade.parcela,
          responsavel: atividade.responsavel,
          eficiencia,
          custoTotal: custoAtividade.resultado.custoTotal
        });
      }

      // Cálculo das métricas
      resultado.metricas.atividadesConcluidas = atividades.length;
      
      if (eficiencias.length > 0) {
        resultado.metricas.eficienciaMedia = somaEficiencia / eficiencias.length;
        resultado.metricas.desvioPadraoEficiencia = this.calcularDesvioPadrao(eficiencias);
      }
      
      if (temposConclusao.length > 0) {
        resultado.metricas.tempoMedioConclusao = 
          temposConclusao.reduce((a, b) => a + b, 0) / temposConclusao.length;
      }

      this.cache.eficienciaPorTipoAtividade[chaveCache] = resultado;
      return { sucesso: true, dados: resultado };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  // Métodos auxiliares de cálculo
  calcularProdutividade(quantidade, unidade, area) {
    // Converte para kg/ha
    const fatoresConversao = {
      kg: 1,
      g: 0.001,
      ton: 1000,
      lb: 0.453592,
      oz: 0.0283495,
      unidade: 0.2 // Valor padrão assumido - ajustar conforme necessário
    };

    const fator = fatoresConversao[unidade] || 1;
    return (quantidade * fator) / area;
  }

  async calcularEficienciaOperacional(atividade, custoTotal) {
    // Fórmula de eficiência operacional mais robusta
    const horasEstimadas = this.estimarHorasTrabalhoPorTipo(atividade.tipo);
    let eficienciaTempo = 50; // Valor padrão se não houver datas
    
    if (atividade.dataInicio && atividade.dataFim) {
      const horasReais = (atividade.dataFim - atividade.dataInicio) / (1000 * 60 * 60);
      eficienciaTempo = (horasEstimadas / horasReais) * 100;
    }

    // Custo esperado baseado em benchmarks
    const custoEsperado = horasEstimadas * 75; // Valor benchmark de €75/hora
    const eficienciaCusto = (1 - (custoTotal / custoEsperado)) * 100;

    // Produtividade (se for colheita)
    let eficienciaProdutividade = 100;
    if (atividade.tipo === 'colheita' && atividade.parcela?.area) {
      const parcela = await Parcela.findById(atividade.parcela).populate('cultura');
      if (parcela?.cultura?.tipo && atividade.quantidadeColhida) {
        const produtividadeEsperada = this.metricasPadrao.produtividadeEsperada[parcela.cultura.tipo] || 
                                     this.metricasPadrao.produtividadeEsperada.outro;
        const produtividadeReal = this.calcularProdutividade(
          atividade.quantidadeColhida,
          atividade.unidadeColheita,
          parcela.area
        );
        eficienciaProdutividade = (produtividadeReal / produtividadeEsperada) * 100;
      }
    }

    // Fórmula ponderada
    return (eficienciaTempo * 0.4) + (eficienciaCusto * 0.4) + (eficienciaProdutividade * 0.2);
  }

  calcularDesvioPadrao(valores) {
    if (valores.length < 2) return 0;
    
    const media = valores.reduce((a, b) => a + b, 0) / valores.length;
    const variancia = valores.reduce((a, b) => a + Math.pow(b - media, 2), 0) / valores.length;
    return Math.sqrt(variancia);
  }

  estimarHorasTrabalhoPorTipo(tipoAtividade) {
    // Valores mais precisos baseados em benchmarks agrícolas
    const horasPorTipo = {
      preparo: 12,    // Preparo de solo geralmente mais demorado
      plantio: 8,     // Plantio pode variar muito
      tratamento: 6,  // Aplicação de tratamentos
      colheita: 10,   // Colheita geralmente intensiva
      manutencao: 7,  // Manutenção de equipamentos e infraestrutura
      irrigacao: 5,   // Atividades de irrigação
      poda: 8        // Poda de árvores ou plantas
    };
    return horasPorTipo[tipoAtividade] || 8;
  }

  // Métodos de análise de tendências
  async analisarTendenciasProdutividade(idParcela, options = {}) {
    try {
      const chaveCache = `tendencias-${idParcela}`;
      if (this.cache.tendenciasProdutividade[chaveCache] && !options.forceUpdate) {
        return {
          sucesso: true,
          dados: this.cache.tendenciasProdutividade[chaveCache]
        };
      }

      const analiseParcela = await this.analisarProdutividadeParcela(idParcela, options);
      if (!analiseParcela.sucesso || analiseParcela.dados.historicoColheitas.length < 3) {
        return { 
          sucesso: false, 
          erro: "Dados insuficientes para análise de tendência" 
        };
      }

      const historico = analiseParcela.dados.historicoColheitas;
      const dadosTemporais = historico.map((item, index) => ({
        periodo: index + 1,
        produtividade: item.produtividade,
        data: item.data
      }));

      // Regressão linear simples para identificar tendência
      const n = dadosTemporais.length;
      const sumX = dadosTemporais.reduce((sum, item) => sum + item.periodo, 0);
      const sumY = dadosTemporais.reduce((sum, item) => sum + item.produtividade, 0);
      const sumXY = dadosTemporais.reduce((sum, item) => sum + (item.periodo * item.produtividade), 0);
      const sumX2 = dadosTemporais.reduce((sum, item) => sum + Math.pow(item.periodo, 2), 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - Math.pow(sumX, 2));
      const intercept = (sumY - slope * sumX) / n;

      // Previsão para os próximos 3 períodos
      const previsoes = [];
      for (let i = n + 1; i <= n + 3; i++) {
        previsoes.push({
          periodo: i,
          produtividadePrevista: slope * i + intercept,
          dataPrevista: new Date(
            historico[historico.length - 1].data.getTime() + 
            (i - n) * this.mediaDiasEntreColheitas(historico) * 24 * 60 * 60 * 1000
          )
        });
      }

      const resultado = {
        idParcela,
        nomeParcela: analiseParcela.dados.nomeParcela,
        dadosTemporais,
        tendencia: {
          slope,
          intercept,
          direcao: slope > 0 ? "ascendente" : slope < 0 ? "descendente" : "estável",
          forca: Math.abs(slope) / analiseParcela.dados.metricas.produtividadeMedia * 100
        },
        previsoes,
        r2: this.calcularR2(dadosTemporais, slope, intercept)
      };

      this.cache.tendenciasProdutividade[chaveCache] = resultado;
      return { sucesso: true, dados: resultado };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  mediaDiasEntreColheitas(historico) {
    if (historico.length < 2) return 365; // Default para 1 ano se não houver dados suficientes
    
    let totalDias = 0;
    for (let i = 1; i < historico.length; i++) {
      const diff = (historico[i].data - historico[i-1].data) / (1000 * 60 * 60 * 24);
      totalDias += diff;
    }
    return totalDias / (historico.length - 1);
  }

  calcularR2(dados, slope, intercept) {
    const yMean = dados.reduce((sum, item) => sum + item.produtividade, 0) / dados.length;
    
    let ssTot = 0;
    let ssRes = 0;
    
    for (const item of dados) {
      ssTot += Math.pow(item.produtividade - yMean, 2);
      const yPred = slope * item.periodo + intercept;
      ssRes += Math.pow(item.produtividade - yPred, 2);
    }
    
    return 1 - (ssRes / ssTot);
  }

  // Métodos de comparação
  async compararDesempenho(options = {}) {
    try {
      const { tipoComparacao, parametros } = options;
      const chaveCache = `comparativo-${tipoComparacao}-${JSON.stringify(parametros)}`;

      if (this.cache.comparativoHistorico[chaveCache] && !options.forceUpdate) {
        return {
          sucesso: true,
          dados: this.cache.comparativoHistorico[chaveCache]
        };
      }

      let resultado;
      switch (tipoComparacao) {
        case "parcelas":
          resultado = await this.compararParcelas(parametros);
          break;
        case "culturas":
          resultado = await this.compararCulturas(parametros);
          break;
        case "periodos":
          resultado = await this.compararPeriodos(parametros);
          break;
        default:
          return { sucesso: false, erro: "Tipo de comparação inválido" };
      }

      this.cache.comparativoHistorico[chaveCache] = resultado;
      return { sucesso: true, dados: resultado };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }

  async compararParcelas(parametros) {
    const { idsParcelas, periodo } = parametros;
    const resultado = {
      tipoComparacao: "parcelas",
      periodo,
      parcelas: [],
      metricas: {
        melhorParcela: null,
        piorParcela: null,
        variacaoMedia: 0
      }
    };

    const dadosParcelas = [];
    for (const idParcela of idsParcelas) {
      const analise = await this.analisarProdutividadeParcela(idParcela, { forceUpdate: true });
      if (analise.sucesso) {
        dadosParcelas.push(analise.dados);
      }
    }

    if (dadosParcelas.length === 0) {
      return resultado;
    }

    // Ordenar por produtividade
    dadosParcelas.sort((a, b) => b.metricas.produtividadeMedia - a.metricas.produtividadeMedia);

    resultado.parcelas = dadosParcelas;
    resultado.metricas.melhorParcela = dadosParcelas[0].idParcela;
    resultado.metricas.piorParcela = dadosParcelas[dadosParcelas.length - 1].idParcela;
    
    if (dadosParcelas.length > 1) {
      const variacoes = [];
      for (let i = 1; i < dadosParcelas.length; i++) {
        const variacao = ((dadosParcelas[i].metricas.produtividadeMedia - 
                          dadosParcelas[i-1].metricas.produtividadeMedia) / 
                         dadosParcelas[i-1].metricas.produtividadeMedia) * 100;
        variacoes.push(variacao);
      }
      resultado.metricas.variacaoMedia = variacoes.reduce((a, b) => a + b, 0) / variacoes.length;
    }

    return resultado;
  }

  async compararCulturas(parametros) {
    const { idsCulturas, periodo } = parametros;
    const resultado = {
      tipoComparacao: "culturas",
      periodo,
      culturas: [],
      metricas: {
        melhorCultura: null,
        piorCultura: null,
        variacaoMedia: 0
      }
    };

    const dadosCulturas = [];
    for (const idCultura of idsCulturas) {
      const analise = await this.analisarProdutividadeCultura(idCultura, { forceUpdate: true });
      if (analise.sucesso) {
        dadosCulturas.push(analise.dados);
      }
    }

    if (dadosCulturas.length === 0) {
      return resultado;
    }

    // Ordenar por produtividade
    dadosCulturas.sort((a, b) => b.metricas.produtividadeMedia - a.metricas.produtividadeMedia);

    resultado.culturas = dadosCulturas;
    resultado.metricas.melhorCultura = dadosCulturas[0].idCultura;
    resultado.metricas.piorCultura = dadosCulturas[dadosCulturas.length - 1].idCultura;
    
    if (dadosCulturas.length > 1) {
      const variacoes = [];
      for (let i = 1; i < dadosCulturas.length; i++) {
        const variacao = ((dadosCulturas[i].metricas.produtividadeMedia - 
                          dadosCulturas[i-1].metricas.produtividadeMedia) / 
                         dadosCulturas[i-1].metricas.produtividadeMedia) * 100;
        variacoes.push(variacao);
      }
      resultado.metricas.variacaoMedia = variacoes.reduce((a, b) => a + b, 0) / variacoes.length;
    }

    return resultado;
  }

  async compararPeriodos(parametros) {
    const { idParcela, periodos } = parametros;
    const resultado = {
      tipoComparacao: "periodos",
      idParcela,
      periodos: [],
      metricas: {
        melhorPeriodo: null,
        piorPeriodo: null,
        variacaoMedia: 0
      }
    };

    const dadosPeriodos = [];
    for (const periodo of periodos) {
      const analise = await this.analisarProdutividadeParcela(idParcela, { 
        forceUpdate: true,
        filtros: {
          dataFim: {
            $gte: periodo.inicio,
            $lte: periodo.fim
          }
        }
      });
      
      if (analise.sucesso) {
        dadosPeriodos.push({
          periodo,
          dados: analise.dados
        });
      }
    }

    if (dadosPeriodos.length === 0) {
      return resultado;
    }

    // Ordenar por produtividade
    dadosPeriodos.sort((a, b) => 
      b.dados.metricas.produtividadeMedia - a.dados.metricas.produtividadeMedia
    );

    resultado.periodos = dadosPeriodos;
    resultado.metricas.melhorPeriodo = dadosPeriodos[0].periodo;
    resultado.metricas.piorPeriodo = dadosPeriodos[dadosPeriodos.length - 1].periodo;
    
    if (dadosPeriodos.length > 1) {
      const variacoes = [];
      for (let i = 1; i < dadosPeriodos.length; i++) {
        const variacao = ((dadosPeriodos[i].dados.metricas.produtividadeMedia - 
                          dadosPeriodos[i-1].dados.metricas.produtividadeMedia) / 
                         dadosPeriodos[i-1].dados.metricas.produtividadeMedia) * 100;
        variacoes.push(variacao);
      }
      resultado.metricas.variacaoMedia = variacoes.reduce((a, b) => a + b, 0) / variacoes.length;
    }

    return resultado;
  }

  // Métodos de alertas e insights
  verificarAlertas(dados) {
    const alertas = [];

    // Alertas padrão baseados em produtividade
    if (dados.metricas?.comparativoEsperado < this.metricasPadrao.eficienciaMinima) {
      alertas.push({
        tipo: "PRODUTIVIDADE_ABAIXO_ESPERADO",
        mensagem: `Produtividade está ${dados.metricas.comparativoEsperado.toFixed(2)}% do esperado`,
        nivel: "alto",
        sugestao: "Verifique condições do solo, tratamentos aplicados e práticas de cultivo"
      });
    }

    if (dados.metricas?.variacaoProdutividade < -15) {
      alertas.push({
        tipo: "QUEDA_SIGNIFICATIVA_PRODUTIVIDADE",
        mensagem: `Queda de ${Math.abs(dados.metricas.variacaoProdutividade).toFixed(2)}% na produtividade`,
        nivel: "medio",
        sugestao: "Analise fatores climáticos, manejo e histórico de atividades"
      });
    }

    // Verificar alertas configurados
    for (const alerta of this.alertasConfigurados) {
      if (alerta.condicao(dados)) {
        alertas.push(alerta);
      }
    }

    return alertas;
  }

  gerarInsights(dados) {
    const insights = [];

    // Insights baseados em produtividade
    if (dados.metricas?.comparativoEsperado > 120) {
      insights.push({
        tipo: "PRODUTIVIDADE_EXCEPCIONAL",
        mensagem: `Produtividade ${dados.metricas.comparativoEsperado.toFixed(2)}% acima do esperado`,
        impacto: "positivo",
        acao: "Considere documentar as práticas utilizadas para replicação"
      });
    }

    if (dados.tendencia?.direcao === "ascendente" && dados.tendencia?.forca > 10) {
      insights.push({
        tipo: "TENDENCIA_POSITIVA_FORTE",
        mensagem: "Tendência positiva forte detectada na produtividade",
        impacto: "positivo",
        acao: "Mantenha ou intensifique as práticas atuais"
      });
    }

    // Insights comparativos
    if (dados.comparativo?.variacaoMedia > 20) {
      insights.push({
        tipo: "VARIACAO_ELEVADA_ENTRE_ITENS",
        mensagem: `Grande variação (${dados.comparativo.variacaoMedia.toFixed(2)}%) entre itens comparados`,
        impacto: "neutro",
        acao: "Investigue causas das diferenças para otimizar todos os itens"
      });
    }

    return insights;
  }

  // Métodos de interface do agente
  processarMensagem(mensagem, remetente) {
    switch (mensagem.tipo) {
      case "ANALISAR_PRODUTIVIDADE_PARCELA":
        return this.analisarProdutividadeParcela(
          mensagem.carga.idParcela,
          mensagem.carga.options
        );

      case "ANALISAR_PRODUTIVIDADE_CULTURA":
        return this.analisarProdutividadeCultura(
          mensagem.carga.idCultura,
          mensagem.carga.options
        );

      case "ANALISAR_EFICIENCIA_OPERACIONAL":
        return this.analisarEficienciaOperacional(
          mensagem.carga.options
        );

      case "ANALISAR_TENDENCIAS":
        return this.analisarTendenciasProdutividade(
          mensagem.carga.idParcela,
          mensagem.carga.options
        );

      case "COMPARAR_DESEMPENHO":
        return this.compararDesempenho(
          mensagem.carga.options
        );

      case "GERAR_ALERTAS_PRODUTIVIDADE":
        return this.verificarAlertas(mensagem.carga.dados);

      case "GERAR_INSIGHTS_PRODUTIVIDADE":
        return this.gerarInsights(mensagem.carga.dados);

      case "CONFIGURAR_ALERTA_PRODUTIVIDADE":
        return this.configurarAlerta(mensagem.carga.configuracao);

      case "LIMPAR_CACHE_PRODUTIVIDADE":
        this.cache = {
          produtividadePorParcela: {},
          produtividadePorCultura: {},
          eficienciaPorTipoAtividade: {},
          tendenciasProdutividade: {},
          comparativoHistorico: {}
        };
        return { sucesso: true, mensagem: "Cache de produtividade limpo com sucesso" };

      default:
        return {
          sucesso: false,
          erro: `Tipo de mensagem desconhecido: ${mensagem.tipo}`
        };
    }
  }

  configurarAlerta(configuracao) {
    if (!configuracao.nome || !configuracao.condicao || !configuracao.mensagem) {
      return { sucesso: false, erro: "Configuração de alerta inválida" };
    }

    const novoAlerta = {
      id: Date.now().toString(),
      ...configuracao,
      nivel: configuracao.nivel || "medio",
      dataConfiguracao: new Date()
    };

    this.alertasConfigurados.push(novoAlerta);
    return { sucesso: true, alerta: novoAlerta };
  }
}

module.exports = AgenteAnaliseProdutividade;