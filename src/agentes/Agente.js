class Agente {
    constructor(nome) {
      this.nome = nome;
      this.estaAtivo = false;
      this.filaDeEspera = [];
      this.baseDeDados = {};
    }
  
    ativar() {
      console.log(`Ativando agente ${this.nome}...`);
      this.estaAtivo = true;
      
      // Processar mensagens que estavam esperando
      this.processarFilaDeEspera();
      return this;
    }
  
    desativar() {
      console.log(`Desativando agente ${this.nome}...`);
      this.estaAtivo = false;
      return this;
    }
  
    processarFilaDeEspera() {
      if (this.filaDeEspera.length > 0) {
        console.log(`Processando ${this.filaDeEspera.length} mensagens pendentes para ${this.nome}`);
        
        // Processar todas as mensagens pendentes
        while (this.filaDeEspera.length > 0) {
          const { mensagem, remetente } = this.filaDeEspera.shift();
          this.processarMensagem(mensagem, remetente);
        }
      }
    }
  
    receberMensagem(mensagem, remetente) {
      if (!this.estaAtivo) {
        // Se o agente está inativo, adiciona à fila de espera
        this.filaDeEspera.push({ mensagem, remetente });
        return {
          sucesso: false,
          mensagem: `Agente ${this.nome} está inativo. Mensagem adicionada à fila de espera.`
        };
      }
  
      console.log(`${this.nome} recebeu mensagem de ${remetente}: ${mensagem.tipo}`);
      return this.processarMensagem(mensagem, remetente);
    }
  
    processarMensagem(mensagem, remetente) {
      // Método a ser implementado pelas subclasses
      throw new Error('Método processarMensagem deve ser implementado pelas subclasses');
    }
  
    enviarMensagem(mensagem, destinatario) {
      console.log(`${this.nome} enviando mensagem para ${destinatario.nome}: ${mensagem.tipo}`);
      return destinatario.receberMensagem(mensagem, this.nome);
    }
  
    atualizarBaseDeDados(chave, valor) {
      this.baseDeDados[chave] = valor;
      return this.baseDeDados;
    }
  
    obterBaseDeDados(chave) {
      return chave ? this.baseDeDados[chave] : this.baseDeDados;
    }
  }
  
  module.exports = Agente;
  