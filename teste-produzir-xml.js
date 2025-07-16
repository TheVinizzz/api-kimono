/**
 * Script para produzir XML de teste para uso em homologação
 * 
 * Este script gera um exemplo completo de XML para um pedido,
 * conforme a documentação dos Correios.
 * 
 * Use: node teste-produzir-xml.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const xmlBuilder = require('xmlbuilder');

// Função para gerar XML
function gerarXmlPedido() {
  try {
    console.log('🔍 Gerando XML de pedido para teste...');
    
    // Dados do pedido
    const pedido = {
      idPedido: '12345',
      valorTotal: 99.90,
      dataPedido: new Date().toISOString(),
      cliente: {
        nome: 'Cliente Teste',
        documento: '12345678909',
        telefone: '83999999999',
        email: 'teste@exemplo.com',
        endereco: {
          logradouro: 'Avenida Epitácio Pessoa',
          numero: '1000',
          complemento: 'Apto 101',
          bairro: 'Tambaú',
          cidade: 'João Pessoa',
          uf: 'PB',
          cep: '58039000'
        }
      },
      itens: [
        {
          descricao: 'Kimono',
          quantidade: 1,
          valorUnitario: 99.90,
          peso: 500 // gramas
        }
      ],
      servico: '03298', // PAC
      valorDeclarado: 99.90
    };
    
    // Criar XML
    const xml = xmlBuilder.create('objeto', { encoding: 'UTF-8' })
      .att('xmlns', 'http://www.correios.com.br/prepostagem')
      .ele('cartaoPostagem', pedido.servico).up()
      .ele('codigoObjeto').up()
      .ele('contrato', process.env.CORREIOS_CONTRATO || '').up()
      .ele('declaracaoConteudo')
        .ele('itens')
          .ele('item')
            .ele('descricao', pedido.itens[0].descricao).up()
            .ele('quantidade', pedido.itens[0].quantidade).up()
            .ele('valor', pedido.itens[0].valorUnitario.toFixed(2)).up()
          .up()
        .up()
      .up()
      .ele('destinatario')
        .ele('nome', pedido.cliente.nome).up()
        .ele('documento', pedido.cliente.documento).up()
        .ele('telefone', pedido.cliente.telefone).up()
        .ele('email', pedido.cliente.email).up()
        .ele('endereco')
          .ele('logradouro', pedido.cliente.endereco.logradouro).up()
          .ele('numero', pedido.cliente.endereco.numero).up()
          .ele('complemento', pedido.cliente.endereco.complemento).up()
          .ele('bairro', pedido.cliente.endereco.bairro).up()
          .ele('cidade', pedido.cliente.endereco.cidade).up()
          .ele('uf', pedido.cliente.endereco.uf).up()
          .ele('cep', pedido.cliente.endereco.cep).up()
        .up()
      .up()
      .ele('dimensoes')
        .ele('altura', '5').up()
        .ele('largura', '25').up()
        .ele('comprimento', '30').up()
        .ele('diametro', '0').up()
      .up()
      .ele('formatoObjeto', '2').up() // 2=Pacote
      .ele('objetosProibidos', 'false').up()
      .ele('observacao', `Pedido #${pedido.idPedido} - Kimono Store`).up()
      .ele('peso', pedido.itens[0].peso).up()
      .ele('remetente')
        .ele('nome', process.env.CORREIOS_REMETENTE_NOME || 'KIMONO STORE').up()
        .ele('cnpj', process.env.CORREIOS_REMETENTE_CNPJ || '').up()
        .ele('inscricaoEstadual', process.env.CORREIOS_REMETENTE_IE || '').up()
        .ele('endereco')
          .ele('logradouro', process.env.CORREIOS_REMETENTE_LOGRADOURO || '').up()
          .ele('numero', process.env.CORREIOS_REMETENTE_NUMERO || '').up()
          .ele('complemento', process.env.CORREIOS_REMETENTE_COMPLEMENTO || '').up()
          .ele('bairro', process.env.CORREIOS_REMETENTE_BAIRRO || '').up()
          .ele('cidade', process.env.CORREIOS_REMETENTE_CIDADE || '').up()
          .ele('uf', process.env.CORREIOS_REMETENTE_UF || '').up()
          .ele('cep', process.env.CORREIOS_REMETENTE_CEP ? process.env.CORREIOS_REMETENTE_CEP.replace(/\D/g, '') : '').up()
        .up()
        .ele('telefone', process.env.CORREIOS_REMETENTE_TELEFONE ? process.env.CORREIOS_REMETENTE_TELEFONE.replace(/\D/g, '') : '').up()
        .ele('email', process.env.CORREIOS_REMETENTE_EMAIL || '').up()
      .up()
      .ele('servicoAdicional')
        .ele('codigoServicoAdicional', '001').up() // 001 = Valor Declarado
      .up()
      .ele('valorDeclarado', pedido.valorDeclarado.toFixed(2)).up()
      .end({ pretty: true });
    
    // Salvar XML
    const filePath = path.join(__dirname, 'pedido-exemplo.xml');
    fs.writeFileSync(filePath, xml);
    
    console.log(`✅ XML gerado com sucesso: ${filePath}`);
    console.log('Conteúdo do XML:');
    console.log(xml);
    
    return xml;
  } catch (error) {
    console.error('❌ Erro ao gerar XML:', error.message);
    return null;
  }
}

// Executar geração
gerarXmlPedido(); 