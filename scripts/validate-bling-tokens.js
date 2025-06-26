#!/usr/bin/env node

/**
 * Script para validar tokens OAuth do Bling
 * Verifica se os tokens estão válidos e funcionando
 */

require('dotenv').config();
const axios = require('axios');

class BlingTokenValidator {
  constructor() {
    this.apiUrl = process.env.BLING_API_URL || 'https://www.bling.com.br/Api/v3';
    this.tokenUrl = process.env.BLING_TOKEN_URL || 'https://www.bling.com.br/Api/v3/oauth/token';
    this.accessToken = process.env.BLING_ACCESS_TOKEN;
    this.refreshToken = process.env.BLING_REFRESH_TOKEN;
    this.clientId = process.env.BLING_CLIENT_ID;
    this.clientSecret = process.env.BLING_CLIENT_SECRET;
    this.tokenCreatedAt = process.env.BLING_TOKEN_CREATED_AT;
    this.tokenExpiresIn = process.env.BLING_TOKEN_EXPIRES_IN;
  }

  // Verificar se tokens existem
  checkTokensExistence() {
    console.log('🔍 VERIFICANDO EXISTÊNCIA DOS TOKENS');
    console.log('====================================');
    
    const tokens = {
      accessToken: !!this.accessToken,
      refreshToken: !!this.refreshToken,
      clientId: !!this.clientId,
      clientSecret: !!this.clientSecret
    };
    
    console.log(`🔑 Access Token: ${tokens.accessToken ? '✅ Presente' : '❌ Ausente'}`);
    console.log(`🔄 Refresh Token: ${tokens.refreshToken ? '✅ Presente' : '❌ Ausente'}`);
    console.log(`🆔 Client ID: ${tokens.clientId ? '✅ Presente' : '❌ Ausente'}`);
    console.log(`🔐 Client Secret: ${tokens.clientSecret ? '✅ Presente' : '❌ Ausente'}`);
    
    if (this.accessToken) {
      console.log(`📏 Tamanho do Access Token: ${this.accessToken.length} caracteres`);
      console.log(`🔤 Prefixo: ${this.accessToken.substring(0, 10)}...`);
    }
    
    return Object.values(tokens).every(Boolean);
  }

  // Verificar expiração do token
  checkTokenExpiration() {
    console.log('\n⏰ VERIFICANDO EXPIRAÇÃO DO TOKEN');
    console.log('==================================');
    
    if (!this.tokenCreatedAt || !this.tokenExpiresIn) {
      console.log('⚠️  Informações de expiração não disponíveis');
      console.log('💡 Token pode ter sido criado manualmente');
      return null;
    }
    
    const createdAt = parseInt(this.tokenCreatedAt);
    const expiresIn = parseInt(this.tokenExpiresIn);
    const now = Date.now();
    const expiresAt = createdAt + (expiresIn * 1000);
    const timeLeft = expiresAt - now;
    
    console.log(`📅 Token criado em: ${new Date(createdAt).toLocaleString('pt-BR')}`);
    console.log(`⏱️  Expira em: ${expiresIn} segundos (${Math.round(expiresIn/60)} minutos)`);
    console.log(`🕐 Expira às: ${new Date(expiresAt).toLocaleString('pt-BR')}`);
    
    if (timeLeft > 0) {
      const minutesLeft = Math.round(timeLeft / 60000);
      console.log(`✅ Token válido por mais ${minutesLeft} minutos`);
      return true;
    } else {
      const minutesExpired = Math.round(Math.abs(timeLeft) / 60000);
      console.log(`❌ Token expirado há ${minutesExpired} minutos`);
      return false;
    }
  }

  // Testar access token fazendo uma requisição
  async testAccessToken() {
    console.log('\n🧪 TESTANDO ACCESS TOKEN');
    console.log('========================');
    
    if (!this.accessToken) {
      console.log('❌ Access token não encontrado');
      return false;
    }
    
    try {
      const response = await axios.get(`${this.apiUrl}/situacao`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('✅ Access token válido e funcionando!');
      console.log(`📊 Status da resposta: ${response.status}`);
      console.log(`🔗 Endpoint testado: /situacao`);
      
      return true;
      
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('❌ Access token inválido ou expirado');
        console.log('💡 Necessário renovar o token');
        return false;
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.log('❌ Erro de conectividade com a API Bling');
        console.log(`   Erro: ${error.message}`);
        return false;
      } else {
        console.log('❌ Erro inesperado ao testar token:');
        console.log(`   Status: ${error.response?.status || 'N/A'}`);
        console.log(`   Erro: ${error.response?.data?.error?.message || error.message}`);
        return false;
      }
    }
  }

  // Testar refresh token
  async testRefreshToken() {
    console.log('\n🔄 TESTANDO REFRESH TOKEN');
    console.log('=========================');
    
    if (!this.refreshToken) {
      console.log('❌ Refresh token não encontrado');
      return false;
    }
    
    if (!this.clientId || !this.clientSecret) {
      console.log('❌ Client ID ou Client Secret não encontrados');
      console.log('💡 Necessários para usar o refresh token');
      return false;
    }
    
    try {
      const tokenData = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken
      });
      
      console.log('🔄 Tentando renovar token...');
      
      const response = await axios.post(this.tokenUrl, tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
        },
        timeout: 15000
      });
      
      if (response.data.access_token) {
        console.log('✅ Refresh token válido!');
        console.log('🎉 Novo access token obtido com sucesso');
        console.log(`🔑 Novo token: ${response.data.access_token.substring(0, 20)}...`);
        console.log(`⏱️  Expira em: ${response.data.expires_in} segundos`);
        
        // Opcional: salvar novo token
        console.log('\n💡 IMPORTANTE: Atualize seu .env com o novo token:');
        console.log(`BLING_ACCESS_TOKEN=${response.data.access_token}`);
        if (response.data.refresh_token) {
          console.log(`BLING_REFRESH_TOKEN=${response.data.refresh_token}`);
        }
        console.log(`BLING_TOKEN_EXPIRES_IN=${response.data.expires_in}`);
        console.log(`BLING_TOKEN_CREATED_AT=${Date.now()}`);
        
        return true;
      } else {
        console.log('❌ Resposta inválida do servidor');
        return false;
      }
      
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('❌ Refresh token inválido ou expirado');
        console.log('💡 Execute novamente: node scripts/bling-oauth-setup.js');
        return false;
      } else {
        console.log('❌ Erro ao renovar token:');
        console.log(`   Status: ${error.response?.status || 'N/A'}`);
        console.log(`   Erro: ${error.response?.data?.error || error.message}`);
        return false;
      }
    }
  }

  // Executar validação completa
  async runFullValidation() {
    console.log('🚀 INICIANDO VALIDAÇÃO COMPLETA DOS TOKENS BLING');
    console.log('=================================================');
    
    // 1. Verificar existência dos tokens
    const tokensExist = this.checkTokensExistence();
    
    if (!tokensExist) {
      console.log('\n❌ TOKENS AUSENTES');
      console.log('💡 Execute primeiro: node scripts/bling-oauth-setup.js');
      process.exit(1);
    }
    
    // 2. Verificar expiração
    const expirationStatus = this.checkTokenExpiration();
    
    // 3. Testar access token
    const accessTokenValid = await this.testAccessToken();
    
    // 4. Se access token inválido, testar refresh token
    let refreshTokenValid = null;
    if (!accessTokenValid) {
      console.log('\n🔄 Access token inválido, testando refresh token...');
      refreshTokenValid = await this.testRefreshToken();
    }
    
    // Resumo final
    console.log('\n📊 RESUMO DA VALIDAÇÃO');
    console.log('======================');
    console.log(`🔑 Access Token: ${accessTokenValid ? '✅ Válido' : '❌ Inválido'}`);
    console.log(`🔄 Refresh Token: ${refreshTokenValid === null ? '➖ Não testado' : (refreshTokenValid ? '✅ Válido' : '❌ Inválido')}`);
    
    if (expirationStatus !== null) {
      console.log(`⏰ Expiração: ${expirationStatus ? '✅ Não expirado' : '⚠️ Expirado'}`);
    }
    
    // Recomendações
    console.log('\n💡 RECOMENDAÇÕES:');
    
    if (accessTokenValid) {
      console.log('✅ Tokens funcionando corretamente!');
      console.log('🚀 Você pode executar a sincronização com segurança');
      console.log('   Execute: node scripts/sync-bling-stock.js');
    } else if (refreshTokenValid) {
      console.log('🔄 Access token renovado com sucesso!');
      console.log('📝 Atualize o arquivo .env com os novos tokens mostrados acima');
      console.log('🧪 Execute este script novamente para confirmar');
    } else {
      console.log('❌ Tokens inválidos ou expirados');
      console.log('🔧 Execute novamente a configuração OAuth:');
      console.log('   node scripts/bling-oauth-setup.js');
    }
  }

  // Executar validação rápida
  async runQuickValidation() {
    console.log('⚡ VALIDAÇÃO RÁPIDA DOS TOKENS');
    console.log('==============================');
    
    if (!this.accessToken) {
      console.log('❌ Access token não encontrado');
      return false;
    }
    
    const isValid = await this.testAccessToken();
    
    if (isValid) {
      console.log('✅ Tokens OK - Pronto para sincronizar!');
    } else {
      console.log('❌ Tokens inválidos - Execute configuração OAuth');
    }
    
    return isValid;
  }
}

// Executar script
if (require.main === module) {
  const validator = new BlingTokenValidator();
  const command = process.argv[2];
  
  if (command === 'quick') {
    validator.runQuickValidation().catch(error => {
      console.error('❌ Erro:', error.message);
      process.exit(1);
    });
  } else {
    validator.runFullValidation().catch(error => {
      console.error('❌ Erro fatal:', error.message);
      process.exit(1);
    });
  }
}

module.exports = BlingTokenValidator; 