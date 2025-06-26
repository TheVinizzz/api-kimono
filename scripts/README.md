# 🔄 Scripts de Integração Bling API v3

Este diretório contém scripts para integração completa com a API do Bling v3 usando OAuth 2.0.

## 📋 Scripts Disponíveis

### 🔐 **bling-oauth-complete.js** - Autenticação OAuth Completa
Script principal para autenticação OAuth 2.0 com interface web.

**Uso:**
```bash
node scripts/bling-oauth-complete.js
```

**Funcionalidades:**
- ✅ Interface web amigável para autenticação
- ✅ Fluxo OAuth 2.0 completo e seguro
- ✅ Renovação automática de tokens
- ✅ Validação de segurança (state parameter)
- ✅ Teste integrado da API após autenticação
- ✅ Salva tokens automaticamente em `tokens.json`

### 🧪 **test-bling-data-real.js** - Teste de Dados Reais
Script para visualizar dados reais da sua conta Bling.

**Uso:**
```bash
node scripts/test-bling-data-real.js
```

**O que mostra:**
- 🏢 Informações detalhadas da empresa
- 📦 Lista de produtos com preços e estoque
- 📂 Categorias organizadas
- 📋 Pedidos recentes com detalhes
- 👥 Contatos/clientes cadastrados
- 📊 Informações de estoque por produto

### 🔄 **sync-bling-stock.js** - Sincronização de Estoque
Script para sincronização bidirecional de estoque.

**Uso:**
```bash
node scripts/sync-bling-stock.js
```

### ✅ **validate-bling-tokens.js** - Validação de Tokens
Script para validar se os tokens OAuth estão funcionando.

**Uso:**
```bash
node scripts/validate-bling-tokens.js
```

### 📊 **demo-bling-data.js** - Demonstração de Dados
Script para mostrar como os dados aparecerão após sincronização.

**Uso:**
```bash
node scripts/demo-bling-data.js
```

## 🚀 Guia de Uso Passo a Passo

### 1. **Configurar Credenciais**

**Opção A - Variáveis de Ambiente (Recomendado):**
```bash
export BLING_CLIENT_ID=seu_client_id_aqui
export BLING_CLIENT_SECRET=seu_client_secret_aqui
```

**Opção B - Editar Script Diretamente:**
Abra `bling-oauth-complete.js` e substitua:
```javascript
const CLIENT_ID = 'SEU_CLIENT_ID_AQUI';
const CLIENT_SECRET = 'SEU_CLIENT_SECRET_AQUI';
```

### 2. **Executar Autenticação**

```bash
cd api
node scripts/bling-oauth-complete.js
```

**O que acontece:**
1. 🌐 Servidor local inicia na porta 3000
2. 🔗 Abra http://localhost:3000 no navegador
3. 🚀 Clique em "Autorizar no Bling"
4. 🔐 Faça login no Bling e autorize
5. ✅ Tokens salvos automaticamente
6. 🧪 Teste a API integrada

### 3. **Testar Dados Reais**

```bash
node scripts/test-bling-data-real.js
```

### 4. **Iniciar Sincronização**

```bash
node scripts/sync-bling-stock.js
```

## 📁 Arquivos Gerados

### `tokens.json`
Arquivo com os tokens OAuth salvos:
```json
{
  "access_token": "ory_at_...",
  "refresh_token": "ory_rt_...",
  "expires_in": 3600,
  "token_type": "Bearer",
  "timestamp": 1640995200000,
  "expires_at": 1640998800000
}
```

**⚠️ IMPORTANTE:** Este arquivo contém credenciais sensíveis. Nunca commite no Git!

## 🔧 Configurações Avançadas

### Personalizar Porta do Servidor OAuth
```javascript
const PORT = 3001; // Altere no script se a porta 3000 estiver ocupada
```

### Personalizar URL de Callback
```javascript
const REDIRECT_URI = 'http://localhost:3001/callback';
```

### Personalizar Arquivo de Tokens
```javascript
const TOKENS_FILE = path.join(__dirname, '../meus-tokens.json');
```

## 🛠️ Troubleshooting

### ❌ "CLIENT_ID não configurado"
**Solução:** Configure as variáveis de ambiente ou edite o script diretamente.

### ❌ "Erro ao obter tokens"
**Possíveis causas:**
- Client ID ou Client Secret incorretos
- URL de callback não configurada no Bling
- Problemas de conectividade

**Solução:** Verifique as credenciais no painel do Bling.

### ❌ "Token expirado"
**Solução:** Execute novamente a autenticação:
```bash
node scripts/bling-oauth-complete.js
```

### ❌ "Porta 3000 já está em uso"
**Solução:** Altere a porta no script ou mate o processo:
```bash
lsof -ti:3000 | xargs kill -9
```

## 🔒 Segurança

### Boas Práticas Implementadas:
- ✅ **State Parameter:** Previne ataques CSRF
- ✅ **HTTPS:** Todas as requisições são criptografadas
- ✅ **Token Rotation:** Renovação automática de tokens
- ✅ **Validação:** Verificação de todos os parâmetros OAuth
- ✅ **Timeout:** Tokens expiram automaticamente

### ⚠️ Nunca faça:
- ❌ Commitar arquivos com tokens no Git
- ❌ Compartilhar Client Secret publicamente
- ❌ Usar tokens em URLs (sempre no header)
- ❌ Armazenar tokens em local storage do browser

## 📞 Suporte

Se encontrar problemas:

1. **Verifique os logs** dos scripts para mensagens de erro detalhadas
2. **Consulte o guia** `BLING_INTEGRATION_GUIDE.md` na raiz do projeto
3. **Teste a conectividade** com `validate-bling-tokens.js`
4. **Verifique as credenciais** no painel do Bling

## 🎉 Próximos Passos

Após a autenticação bem-sucedida:

1. ✅ **Execute testes** com `test-bling-data-real.js`
2. ✅ **Configure sincronização** com `sync-bling-stock.js`
3. ✅ **Integre com seu sistema** usando as funções exportadas
4. ✅ **Configure webhooks** para sincronização em tempo real

---

**🔥 Dica:** Todos os scripts são modulares e podem ser importados em outros arquivos Node.js para uso programático! 