# 🔧 CONFIGURAÇÃO DAS CREDENCIAIS BLING

## 📋 Pré-requisitos

1. **Conta no Bling** com acesso à API v3
2. **CLIENT_ID e CLIENT_SECRET** obtidos no painel do Bling

## 🔐 Configurar Credenciais

### **Opção 1: Arquivo .env (Recomendado)**

1. **Criar arquivo .env na pasta `api/`:**
```bash
cd api
touch .env
```

2. **Adicionar as credenciais no arquivo .env:**
```env
# BLING API v3
BLING_CLIENT_ID=SEU_CLIENT_ID_AQUI
BLING_CLIENT_SECRET=SEU_CLIENT_SECRET_AQUI
BLING_ACCESS_TOKEN=
BLING_REFRESH_TOKEN=
BLING_ENVIRONMENT=production
BLING_API_URL=https://api.bling.com.br
BLING_WEBHOOK_SECRET=
```

### **Opção 2: Editar Script Diretamente**

1. **Editar o arquivo `api/scripts/bling-oauth-complete.js`:**
```javascript
// Linha 10-11, substituir:
const CLIENT_ID = process.env.BLING_CLIENT_ID || 'SEU_CLIENT_ID_AQUI';
const CLIENT_SECRET = process.env.BLING_CLIENT_SECRET || 'SEU_CLIENT_SECRET_AQUI';
```

### **Opção 3: Variáveis de Ambiente Temporárias**

```bash
export BLING_CLIENT_ID="seu_client_id"
export BLING_CLIENT_SECRET="seu_client_secret"
cd api
node scripts/bling-oauth-complete.js
```

## 🚀 Executar Autenticação

1. **Com credenciais configuradas:**
```bash
cd api
node scripts/bling-oauth-complete.js
```

2. **Seguir as instruções na tela:**
   - Abrir URL no navegador
   - Autorizar aplicação
   - Aguardar redirecionamento
   - Tokens serão salvos automaticamente

## 🧪 Testar Integração

1. **Verificar status OAuth:**
```bash
curl http://localhost:4000/api/bling/oauth/status
```

2. **Testar conectividade:**
```bash
curl http://localhost:4000/api/bling/test/connection
```

3. **Obter dados reais:**
```bash
curl http://localhost:4000/api/bling/data
```

## 📁 Onde Encontrar as Credenciais no Bling

1. **Acesse:** https://www.bling.com.br/
2. **Faça login** na sua conta
3. **Vá em:** Configurações → Aplicações → API
4. **Crie uma nova aplicação** ou use uma existente
5. **Copie:** CLIENT_ID e CLIENT_SECRET
6. **Configure a URL de callback:** `http://localhost:3000/callback`

## ⚠️ Importante

- ✅ **Mantenha as credenciais seguras**
- ✅ **Não commite o arquivo .env**
- ✅ **Use ambiente de produção** para dados reais
- ✅ **Configure URL de callback** corretamente no Bling

## 🔄 Após Configuração

Com as credenciais configuradas, você poderá:

- ✅ **Autenticar via OAuth 2.0**
- ✅ **Obter dados reais** da sua conta Bling
- ✅ **Sincronizar produtos** e estoque
- ✅ **Receber webhooks** do Bling
- ✅ **Usar todas as rotas** da API

## 🆘 Resolução de Problemas

### **Erro: CLIENT_ID não configurado**
- Verifique se o arquivo .env existe
- Confirme se as variáveis estão corretas
- Tente a opção 2 ou 3 acima

### **Erro: Invalid client**
- Verifique se CLIENT_ID e CLIENT_SECRET estão corretos
- Confirme se a aplicação está ativa no Bling

### **Erro: Invalid redirect_uri**
- Configure `http://localhost:3000/callback` no Bling
- Verifique se a porta 3000 está disponível 