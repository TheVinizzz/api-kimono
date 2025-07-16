// Script para testar a implementação do serviço de CEP dos Correios
require('dotenv').config();
const { execSync } = require('child_process');

async function testarServicoCEP() {
  try {
    console.log('🔍 Testando o serviço de CEP dos Correios...');
    
    // Primeiro, compilar o código TypeScript
    console.log('🔧 Compilando o código TypeScript...');
    execSync('npx tsc', { stdio: 'inherit' });
    
    // Importar o serviço após a compilação
    const { CorreiosService } = require('./dist/services/correios.service');
    
    // Criar instância do serviço
    console.log('🔧 Criando instância do serviço...');
    const correiosService = new CorreiosService();
    
    // Testar consulta de CEP
    console.log('\n🔍 Testando consulta de CEP único...');
    const cepTeste = '04347080';
    console.log(`🔧 Consultando CEP: ${cepTeste}`);
    
    const resultado = await correiosService.consultarCEP(cepTeste);
    
    if (resultado) {
      console.log('✅ Consulta de CEP bem-sucedida!');
      console.log('📍 Endereço:', JSON.stringify(resultado, null, 2));
    } else {
      console.error('❌ Falha na consulta de CEP');
    }
    
    // Testar consulta de múltiplos CEPs
    console.log('\n🔍 Testando consulta de múltiplos CEPs...');
    const cepsTeste = ['04347080', '01310100', '22041011'];
    console.log(`🔧 Consultando CEPs: ${cepsTeste.join(', ')}`);
    
    const resultadoMultiplo = await correiosService.consultarMultiplosCEPs(cepsTeste);
    
    if (resultadoMultiplo) {
      console.log('✅ Consulta de múltiplos CEPs bem-sucedida!');
      console.log(`✅ Total de itens: ${resultadoMultiplo.page?.totalElements || 'N/A'}`);
      console.log('📍 Resultados:', JSON.stringify(resultadoMultiplo, null, 2));
    } else {
      console.error('❌ Falha na consulta de múltiplos CEPs');
    }
    
    // Testar listagem de UFs
    console.log('\n🔍 Testando listagem de UFs...');
    
    const resultadoUFs = await correiosService.listarUFs();
    
    if (resultadoUFs) {
      console.log('✅ Listagem de UFs bem-sucedida!');
      console.log(`✅ Total de UFs: ${resultadoUFs.length || 0}`);
      
      // Mostrar apenas as primeiras UFs para não poluir o log
      if (resultadoUFs && resultadoUFs.length > 0) {
        console.log('📍 Primeiras UFs:', JSON.stringify(resultadoUFs.slice(0, 3), null, 2));
      }
    } else {
      console.error('❌ Falha na listagem de UFs');
    }
    
    // Testar consulta de UF específica
    console.log('\n🔍 Testando consulta de UF específica...');
    const ufTeste = 'SP';
    console.log(`🔧 Consultando UF: ${ufTeste}`);
    
    const resultadoUF = await correiosService.consultarUF(ufTeste);
    
    if (resultadoUF) {
      console.log('✅ Consulta de UF específica bem-sucedida!');
      console.log('📍 Dados da UF:', JSON.stringify(resultadoUF, null, 2));
    } else {
      console.error('❌ Falha na consulta de UF específica');
    }
    
    console.log('\n✅ Testes do serviço de CEP concluídos!');
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar os testes
testarServicoCEP(); 