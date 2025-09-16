# 🚀 Configuração de Produção - Domínio para Reset de Senha

## 📍 **Onde Configurar o Domínio**

### **1. Variável de Ambiente Principal**

A configuração do domínio para produção é feita através da variável de ambiente `FRONTEND_URL` no arquivo `.env`:

```bash
# Para desenvolvimento
FRONTEND_URL=http://localhost:3000

# Para produção
FRONTEND_URL=https://seu-dominio.com
```

### **2. Localização no Código**

O domínio é usado no arquivo `api/src/services/email.service.ts` na linha 148:

```typescript
const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetData.resetToken}`;
```

### **3. Configuração Completa para Produção**

Crie um arquivo `.env` na pasta `/api/` com as seguintes configurações:

```bash
# ===========================================
# CONFIGURAÇÃO DE PRODUÇÃO
# ===========================================

# URL do frontend (onde o usuário acessa o site)
FRONTEND_URL=https://seu-dominio.com

# URL da API (onde está rodando o backend)
API_URL=https://api.seu-dominio.com

# Configurações de email
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_senha_de_app_do_gmail
EMAIL_FROM="Kimono Store <seu_email@gmail.com>"

# Configurações JWT
JWT_SECRET=sua_chave_secreta_muito_segura_para_producao

# Configurações do servidor
PORT=4000
NODE_ENV=production

# CORS (permitir apenas seu domínio)
CORS_ORIGIN=https://seu-dominio.com
```

## 🔧 **Configurações por Ambiente**

### **Desenvolvimento Local**
```bash
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:4000
CORS_ORIGIN=http://localhost:3000
```

### **Staging/Teste**
```bash
FRONTEND_URL=https://staging.seu-dominio.com
API_URL=https://api-staging.seu-dominio.com
CORS_ORIGIN=https://staging.seu-dominio.com
```

### **Produção**
```bash
FRONTEND_URL=https://seu-dominio.com
API_URL=https://api.seu-dominio.com
CORS_ORIGIN=https://seu-dominio.com
```

## 📧 **Como Funciona o Reset de Senha**

1. **Usuário solicita reset** → Frontend envia email para API
2. **API gera token** → Cria JWT com validade de 1 hora
3. **API envia email** → Usa `FRONTEND_URL` para criar o link
4. **Usuário clica no link** → Vai para `https://seu-dominio.com/reset-password?token=abc123`
5. **Frontend valida token** → Chama API para verificar se é válido
6. **Usuário define nova senha** → Frontend envia nova senha para API

## 🔒 **Segurança**

### **Configurações Importantes:**

1. **HTTPS Obrigatório em Produção:**
   ```bash
   FRONTEND_URL=https://seu-dominio.com  # ✅ Correto
   FRONTEND_URL=http://seu-dominio.com   # ❌ Inseguro
   ```

2. **CORS Restritivo:**
   ```bash
   CORS_ORIGIN=https://seu-dominio.com  # ✅ Apenas seu domínio
   CORS_ORIGIN=*                        # ❌ Permite qualquer domínio
   ```

3. **JWT Secret Seguro:**
   ```bash
   JWT_SECRET=uma_chave_muito_longa_e_aleatoria_para_producao
   ```

## 🚀 **Deploy em Produção**

### **1. Configurar Variáveis de Ambiente**

No seu provedor de hospedagem (Vercel, Netlify, Heroku, etc.), configure:

```bash
FRONTEND_URL=https://seu-dominio.com
API_URL=https://api.seu-dominio.com
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_senha_de_app_do_gmail
JWT_SECRET=sua_chave_secreta_muito_segura
```

### **2. Verificar Configuração**

Após o deploy, teste o reset de senha:

1. Acesse `https://seu-dominio.com/forgot-password`
2. Digite um email válido
3. Verifique se o email chega com o link correto
4. Clique no link e verifique se redireciona para `https://seu-dominio.com/reset-password?token=...`

## 🧪 **Testando a Configuração**

### **Script de Teste:**

```bash
# No terminal, dentro da pasta /api/
node -e "
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'http://localhost:3000');
console.log('API_URL:', process.env.API_URL || 'http://localhost:4000');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Configurado' : '❌ Não configurado');
"
```

### **Verificar Email de Reset:**

1. Acesse o admin panel
2. Vá para a tab "Usuários"
3. Clique no botão de email ao lado de um usuário
4. Verifique se o email chega com o link correto

## 📝 **Exemplo de Link Gerado**

### **Desenvolvimento:**
```
http://localhost:3000/reset-password?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Produção:**
```
https://seu-dominio.com/reset-password?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## ⚠️ **Problemas Comuns**

### **1. Link não funciona:**
- Verifique se `FRONTEND_URL` está configurado corretamente
- Verifique se o domínio está acessível
- Verifique se o token não expirou (válido por 1 hora)

### **2. Email não chega:**
- Verifique configuração de email (`EMAIL_USER`, `EMAIL_PASS`)
- Verifique pasta de spam
- Verifique logs do servidor

### **3. CORS Error:**
- Verifique se `CORS_ORIGIN` está configurado corretamente
- Verifique se o domínio está exatamente igual (com/sem www)

## 🎯 **Resumo**

Para configurar o domínio de produção:

1. **Crie arquivo `.env`** na pasta `/api/`
2. **Configure `FRONTEND_URL`** com seu domínio de produção
3. **Configure `API_URL`** com a URL da sua API
4. **Configure `CORS_ORIGIN`** para permitir apenas seu domínio
5. **Teste o reset de senha** para verificar se está funcionando

**Exemplo final:**
```bash
FRONTEND_URL=https://kimonostore.com
API_URL=https://api.kimonostore.com
CORS_ORIGIN=https://kimonostore.com
```
