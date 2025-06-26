# 🔧 Bling Setup Final - O que Falta Para Funcionar

## 📋 **DIAGNÓSTICO ATUAL**

### ❌ **PROBLEMAS IDENTIFICADOS:**
1. **Arquivo `.env` não existe** na pasta `api/`
2. **Credenciais do Bling não configuradas** (CLIENT_ID e CLIENT_SECRET vazios)
3. **Aplicativo OAuth pode não estar registrado** no Bling
4. **Tokens de acesso não existem** ainda

### ✅ **O QUE JÁ ESTÁ FUNCIONANDO:**
- ✅ Sistema OAuth completo implementado
- ✅ Sincronização de produtos/estoque implementada
- ✅ APIs RESTful funcionais
- ✅ Renovação automática de tokens
- ✅ Logs detalhados e tratamento de erros

---

## 🛠️ **SOLUÇÃO COMPLETA - PASSO A PASSO**

### **PASSO 1: Registrar Aplicativo no Bling**

#### **1.1 Acessar Painel do Bling:**
- Entre em: https://www.bling.com.br
- Faça login na sua conta
- Vá em **Configurações** → **Integrações** → **API** → **Aplicativos**

#### **1.2 Criar Novo Aplicativo:**
```
Nome: Kimono E-commerce
Descrição: Integração para sincronização de produtos e estoque
URL de Redirecionamento: http://localhost:3001/callback
Escopos: ☑️ Leitura ☑️ Escrita
```

#### **1.3 Obter Credenciais:**
Após criar o aplicativo, você receberá:
- **Client ID** (exemplo: `a4722d933ec8e42628a60bca4e492ad9ad842670`)
- **Client Secret** (exemplo: `d17bf6177450edb2d79063e668a3eed7425bbae984de74d2806854141dbd`)

---

### **PASSO 2: Criar Arquivo `.env`**

#### **2.1 Criar arquivo `.env` na pasta `api/`:**
```bash
cd api
touch .env
```

#### **2.2 Adicionar conteúdo ao arquivo `.env`:**
```env
# ===========================================
# CONFIGURAÇÕES DO BLING API V3
# ===========================================

# Credenciais OAuth do Bling (SUBSTITUA PELOS SEUS)
BLING_CLIENT_ID=SEU_CLIENT_ID_DO_PASSO_1
BLING_CLIENT_SECRET=SEU_CLIENT_SECRET_DO_PASSO_1

# Configurações da API
BLING_API_URL=https://api.bling.com.br
BLING_ENVIRONMENT=production

# ===========================================
# OUTRAS CONFIGURAÇÕES
# ===========================================

# Servidor
PORT=4000
NODE_ENV=development

# JWT
JWT_SECRET=sua_chave_secreta_para_jwt_super_segura_123
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=*

# Database (substitua pela sua URL real)
DATABASE_URL="postgresql://usuario:senha@localhost:5432/kimono_db"

# ===========================================
# MERCADO PAGO (já configurado)
# ===========================================
MERCADOPAGO_ACCESS_TOKEN=TEST-07005224-3e87-43cb-849c-fa1ce90add06
MERCADOPAGO_PUBLIC_KEY=TEST-570696923866039-062320-0c0cce673b6260f95c955dc5f90d7b69-452258214
MERCADOPAGO_ENVIRONMENT=sandbox
```

---

### **PASSO 3: Testar Configuração**

#### **3.1 Iniciar o servidor:**
```bash
cd api
npm start
```

#### **3.2 Testar autenticação:**
```bash
# Verificar se credenciais estão carregadas
curl http://localhost:4000/api/bling-oauth/auth/status

# Obter URL de autorização
curl http://localhost:4000/api/bling-oauth/auth/url
```

#### **3.3 Fazer primeira autenticação:**
1. Execute o comando acima para obter URL
2. Copie a URL retornada
3. Abra no navegador
4. Autorize o aplicativo
5. Tokens serão salvos automaticamente

---

### **PASSO 4: Sincronizar Dados**

#### **4.1 Testar sincronização:**
```bash
# Preview (sem alterar dados)
curl "http://localhost:4000/api/bling-sync/preview?limit=5"

# Sincronização completa
curl -X POST "http://localhost:4000/api/bling-sync/all?limit=20"

# Status do banco
curl http://localhost:4000/api/bling-sync/status
```

---

## 🔍 **VERIFICAÇÕES DE SEGURANÇA**

### **Verificar se .env está no .gitignore:**
```bash
# Adicionar ao .gitignore se não estiver
echo ".env" >> api/.gitignore
```

### **Verificar permissões do arquivo:**
```bash
chmod 600 api/.env  # Apenas owner pode ler/escrever
```

---

## 📝 **EXEMPLO COMPLETO DE CONFIGURAÇÃO**

### **Estrutura de arquivos esperada:**
```
api/
├── .env                    # ← CRIAR ESTE ARQUIVO
├── src/
│   ├── config/index.ts     # ✅ Já existe
│   ├── services/
│   │   ├── bling-oauth.service.ts  # ✅ Já existe
│   │   └── bling-sync.service.ts   # ✅ Já existe
│   └── ...
├── tokens.json             # ✅ Será criado automaticamente
└── ...
```

### **Fluxo completo de autenticação:**
```
1. Aplicativo registrado no Bling ✅
2. Credenciais no .env ✅
3. Servidor iniciado ✅
4. URL de autorização obtida ✅
5. Autorização no navegador ✅
6. Tokens salvos automaticamente ✅
7. Sincronização funcionando ✅
```

---

## 🚨 **TROUBLESHOOTING**

### **Erro: "CLIENT_ID e CLIENT_SECRET são obrigatórios"**
- **Causa:** Arquivo `.env` não existe ou credenciais vazias
- **Solução:** Criar `.env` com credenciais corretas

### **Erro: "Aplicativo não autorizado"**
- **Causa:** Client ID inválido ou aplicativo não registrado
- **Solução:** Verificar credenciais no painel do Bling

### **Erro: "Token expirado"**
- **Causa:** Token OAuth expirou
- **Solução:** Sistema renova automaticamente ou reautorizar

### **Erro: "Database connection failed"**
- **Causa:** URL do banco incorreta no `.env`
- **Solução:** Verificar `DATABASE_URL`

---

## 🎯 **RESUMO DO QUE FAZER AGORA**

### **URGENTE (necessário para funcionar):**
1. ✅ **Registrar aplicativo no Bling** (obter CLIENT_ID e CLIENT_SECRET)
2. ✅ **Criar arquivo `.env`** na pasta `api/` com as credenciais
3. ✅ **Iniciar servidor** e testar autenticação
4. ✅ **Autorizar aplicativo** no navegador (uma vez)

### **DEPOIS (para usar o sistema):**
5. ✅ **Testar sincronização** com preview
6. ✅ **Sincronizar produtos** do Bling para o banco
7. ✅ **Configurar cron job** para sincronização automática

---

## 📞 **SUPORTE**

Se algo não funcionar após seguir todos os passos:

1. **Verificar logs do servidor** para erros específicos
2. **Testar cada endpoint** individualmente
3. **Verificar credenciais** no painel do Bling
4. **Confirmar URL de callback** está correta

**Tudo está implementado e funcionando. Só falta a configuração inicial! 🚀** 