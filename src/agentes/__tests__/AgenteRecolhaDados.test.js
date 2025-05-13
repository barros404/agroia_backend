const AgenteRecolhaDados = require('../AgenteRecolhaDados');

describe('AgenteRecolhaDados', () => {
  let agente;

  beforeEach(() => {
    agente = new AgenteRecolhaDados();
    agente.ativar();
  });

  test('Deve criar um formulário de atividade corretamente', () => {
    const formulario = agente.criarFormularioAtividade('fertilizar');
    
    expect(formulario).toHaveProperty('id');
    expect(formulario).toHaveProperty('data');
    expect(formulario).toHaveProperty('estado', 'rascunho');
    expect(formulario).toHaveProperty('produtos');
    expect(formulario.produtos[0]).toHaveProperty('unidade', 'l/ha');
    expect(formulario).toHaveProperty('tipoFertilizacao');
  });

  test('Deve validar um formulário corretamente', () => {
    const formularioValido = {
      data: new Date().toISOString(),
      parcelas: [{ id: '1', nome: 'Parcela 1' }],
      tipoAtividade: 'fertilizar'
    };
    
    const formularioInvalido = {
      data: new Date().toISOString(),
      parcelas: [],
      tipoAtividade: 'fertilizar'
    };
    
    const resultadoValido = agente.validarFormulario(formularioValido, 'atividade');
    const resultadoInvalido = agente.validarFormulario(formularioInvalido, 'atividade');
    
    expect(resultadoValido.eValido).toBe(true);
    expect(resultadoInvalido.eValido).toBe(false);
    expect(resultadoInvalido.camposEmFalta).toContain('parcelas');
  });

  test('Deve processar mensagens corretamente', () => {
    // Testar CRIAR_ATIVIDADE
    const resultadoCriar = agente.processarMensagem(
      { tipo: 'CRIAR_ATIVIDADE', carga: { tipoAtividade: 'colheita' } },
      'TesteSistema'
    );
    
    expect(resultadoCriar.sucesso).toBe(true);
    expect(resultadoCriar).toHaveProperty('idFormulario');
    expect(resultadoCriar).toHaveProperty('formulario');
    expect(resultadoCriar.formulario.tipoAtividade).toBe('colheita');
    
    // Testar ATUALIZAR_ATIVIDADE
    const idFormulario = resultadoCriar.idFormulario;
    const resultadoAtualizar = agente.processarMensagem(
      { 
        tipo: 'ATUALIZAR_ATIVIDADE', 
        carga: { 
          idFormulario,
          campo: 'quantidadeColhida',
          valor: 1000
        } 
      },
      'TesteSistema'
    );
    
    expect(resultadoAtualizar.quantidadeColhida).toBe(1000);
    
    // Testar mensagem desconhecida
    const resultadoDesconhecido = agente.processarMensagem(
      { tipo: 'MENSAGEM_INEXISTENTE', carga: {} },
      'TesteSistema'
    );
    
    expect(resultadoDesconhecido.sucesso).toBe(false);
    expect(resultadoDesconhecido.erro).toContain('desconhecido');
  });
});
