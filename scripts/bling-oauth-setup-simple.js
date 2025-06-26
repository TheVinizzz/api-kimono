#!/usr/bin/env node

/**
 * Script simplificado para configuração OAuth 2.0 com Bling API v3
 * Versão sem dependências problemáticas
 */

require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

// Configurações
const CLIENT_ID = process.env.BLING_CLIENT_ID;
const CLIENT_SECRET = process.env.BLING_CLIENT_SECRET;
const REDIRECT_URI = process.env.BLING_REDIRECT_URI || 'http://localhost:3000/bling/callback';
const PORT = 3000;

// URLs da API Bling v3
const BLING_AUTH_URL = 'https://www.bling.com.br/Api/v3/oauth/authorize';
const BLING_TOKEN_URL = 'https://www.bling.com.br/Api/v3/oauth/token';

class BlingOAuthSetupSimple {
  constructor() {
    this.app = express();
    this.state = crypto.randomBytes(16).toString('hex');
    this.server = null;
  }

  // Validar configurações
  validateConfig() {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error('❌ ERRO: CLIENT_ID e CLIENT_SECRET são obrigatórios!');
      console.log('📝 Configure as variáveis no arquivo .env:');
      console.log('   BLING_CLIENT_ID=seu_client_id');
      console.log('   BLING_CLIENT_SECRET=seu_client_secret');
      process.exit(1);
    }

    console.log('✅ Configurações validadas');
    console.log(`📋 Client ID: ${CLIENT_ID.substring(0, 8)}...`);
    console.log(`🔗 Redirect URI: ${REDIRECT_URI}`);
  }

  // Gerar URL de autorização
  generateAuthUrl() {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: 'produtos:read produtos:write pedidos:read pedidos:write estoques:read estoques:write',
      state: this.state
    });

    return `${BLING_AUTH_URL}?${params.toString()}`;
  }

  // Configurar rotas do servidor
  setupRoutes() {
    this.app.get('/bling/callback', async (req, res) => {
      try {
        const { code, state } = req.query;

        // Validar state parameter (segurança)
        if (state !== this.state) {
          throw new Error('State parameter inválido - possível ataque CSRF');
        }

        if (!code) {
          throw new Error('Authorization code não recebido');
        }

        console.log('✅ Authorization code recebido!');
        
        // Trocar code por access token
        const tokens = await this.exchangeCodeForTokens(code);
        
        // Salvar tokens no .env
        await this.saveTokensToEnv(tokens);

        res.send(`
          <html>
            <head>
              <title>Bling OAuth - Sucesso!</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .success { color: #28a745; font-size: 28px; margin-bottom: 20px; }
                .info { color: #6c757d; margin: 15px 0; font-size: 16px; }
                .highlight { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin: 10px; text-decoration: none; display: inline-block; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="success">🎉 Integração com Bling configurada com sucesso!</div>
                <div class="info">✅ Access Token obtido e salvo no arquivo .env</div>
                <div class="info">✅ Refresh Token configurado para renovação automática</div>
                <div class="info">🔒 Tokens válidos por 1 hora (renovação automática)</div>
                
                <div class="highlight">
                  <strong>Próximos passos:</strong><br>
                  1. Teste a conexão: <code>node scripts/test-bling-connection.js</code><br>
                  2. Sincronize o estoque: <code>node scripts/sync-bling-stock.js</code>
                </div>
                
                <div class="info">Você pode fechar esta janela e parar o servidor.</div>
                <a href="#" onclick="window.close()" class="button">Fechar Janela</a>
              </div>
            </body>
          </html>
        `);

        console.log('🎉 SUCESSO! Tokens salvos no arquivo .env');
        console.log('🔄 O sistema agora pode sincronizar com o Bling automaticamente');
        console.log('\n📋 PRÓXIMOS PASSOS:');
        console.log('   1. Teste a conexão: node scripts/test-bling-connection.js');
        console.log('   2. Sincronize o estoque: node scripts/sync-bling-stock.js');
        
        // Fechar servidor após 10 segundos
        setTimeout(() => {
          console.log('\n🔄 Fechando servidor...');
          this.server.close();
          process.exit(0);
        }, 10000);

      } catch (error) {
        console.error('❌ Erro no callback:', error.message);
        res.status(500).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa;">
              <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
                <h2 style="color: #dc3545;">❌ Erro na Autenticação</h2>
                <p style="color: #6c757d;">${error.message}</p>
                <p style="color: #6c757d;">Verifique o console para mais detalhes.</p>
                <button onclick="window.close()" style="background: #dc3545; color: white; padding: 10px 20px; border: none; border-radius: 5px;">Fechar</button>
              </div>
            </body>
          </html>
        `);
      }
    });

    // Rota de status
    this.app.get('/status', (req, res) => {
      res.json({ 
        status: 'OK', 
        message: 'Servidor OAuth rodando',
        timestamp: new Date().toISOString()
      });
    });
  }

  // Trocar authorization code por access token
  async exchangeCodeForTokens(code) {
    console.log('🔄 Trocando authorization code por access token...');

    const tokenData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI
    });

    const response = await axios.post(BLING_TOKEN_URL, tokenData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
      },
      timeout: 30000
    });

    if (response.data.access_token) {
      console.log('✅ Access token obtido com sucesso!');
      console.log(`🔑 Token: ${response.data.access_token.substring(0, 20)}...`);
      console.log(`⏱️  Expira em: ${response.data.expires_in} segundos`);
      return response.data;
    } else {
      throw new Error('Resposta inválida da API Bling');
    }
  }

  // Salvar tokens no arquivo .env
  async saveTokensToEnv(tokens) {
    const fs = require('fs').promises;
    const path = require('path');
    
    const envPath = path.join(__dirname, '../.env');
    
    try {
      // Ler arquivo .env atual
      let envContent = '';
      try {
        envContent = await fs.readFile(envPath, 'utf8');
      } catch (error) {
        // Arquivo não existe, criar novo
        console.log('📝 Criando novo arquivo .env');
      }

      // Atualizar ou adicionar tokens
      const newTokens = {
        BLING_ACCESS_TOKEN: tokens.access_token,
        BLING_REFRESH_TOKEN: tokens.refresh_token,
        BLING_TOKEN_EXPIRES_IN: tokens.expires_in,
        BLING_TOKEN_CREATED_AT: Date.now()
      };

      for (const [key, value] of Object.entries(newTokens)) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (envContent.match(regex)) {
          envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
          envContent += `\n${key}=${value}`;
        }
      }

      await fs.writeFile(envPath, envContent.trim() + '\n');
      console.log('💾 Tokens salvos no arquivo .env');

    } catch (error) {
      console.error('❌ Erro ao salvar tokens:', error.message);
      throw error;
    }
  }

  // Iniciar processo de autenticação
  async start() {
    console.log('🚀 INICIANDO CONFIGURAÇÃO OAUTH 2.0 COM BLING');
    console.log('================================================');
    
    this.validateConfig();
    this.setupRoutes();

    // Iniciar servidor
    this.server = this.app.listen(PORT, () => {
      console.log(`🌐 Servidor OAuth iniciado na porta ${PORT}`);
      
      const authUrl = this.generateAuthUrl();
      console.log('🔗 URL de autorização gerada');
      
      console.log('\n📋 INSTRUÇÕES IMPORTANTES:');
      console.log('1. Abra seu navegador');
      console.log('2. Acesse a URL abaixo:');
      console.log(`\n   ${authUrl}\n`);
      console.log('3. Faça login na sua conta Bling');
      console.log('4. Autorize a aplicação');
      console.log('5. Aguarde o redirecionamento automático');
      console.log('6. Os tokens serão salvos automaticamente\n');
      
      console.log('⏳ Aguardando autorização...');
      console.log('💡 Mantenha este terminal aberto até a conclusão');
    });

    // Timeout de segurança (10 minutos)
    setTimeout(() => {
      console.log('\n⏰ Timeout - Processo cancelado após 10 minutos');
      console.log('💡 Execute o script novamente se necessário');
      this.server.close();
      process.exit(1);
    }, 600000);
  }
}

// Executar script
if (require.main === module) {
  const setup = new BlingOAuthSetupSimple();
  setup.start().catch(error => {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  });
}

module.exports = BlingOAuthSetupSimple; 