# 📧 Configuração de Email - Gmail

Este documento explica como configurar o sistema de email para enviar emails via Gmail, incluindo emails de reset de senha.

## 🔧 Configuração Necessária

### 1. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto `/api/` com as seguintes variáveis:

```bash
# Configurações de Email
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_senha_de_app_do_gmail
EMAIL_FROM="Kimono Store <seu_email@gmail.com>"
FRONTEND_URL=http://localhost:3000
```

### 2. Configurar Senha de App do Gmail

**IMPORTANTE:** Para usar o Gmail, você precisa criar uma "Senha de App" específica, não sua senha normal.

#### Passo a passo:

1. **Acesse sua conta Google:**
   - Vá para [myaccount.google.com](https://myaccount.google.com)
   - Faça login com sua conta Gmail

2. **Ative a verificação em duas etapas:**
   - Vá para "Segurança" → "Verificação em duas etapas"
   - Ative se ainda não estiver ativada

3. **Crie uma Senha de App:**
   - Vá para "Segurança" → "Senhas de app"
   - Clique em "Selecionar app" → "Outro (nome personalizado)"
   - Digite: "Kimono Store API"
   - Clique em "Gerar"
   - **COPIE A SENHA GERADA** (16 caracteres)

4. **Configure no arquivo .env:**
   ```bash
   EMAIL_USER=seu_email@gmail.com
   EMAIL_PASS=abcd efgh ijkl mnop  # A senha de app gerada (sem espaços)
   ```

### 3. Configuração Alternativa (SMTP)

Se preferir usar configuração SMTP direta:

```bash
EMAIL_SERVICE=gmail
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_senha_de_app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

## 🧪 Testando a Configuração

### 1. Verificar se o servidor está rodando:
```bash
cd /Users/theviniz/Documents/Work/Kimono/api
npm run dev
```

### 2. Verificar logs do servidor:
Quando o servidor iniciar, você deve ver:
```
✅ Conexão com servidor de email estabelecida com sucesso
```

Se aparecer:
```
⚠️ Configuração de email incompleta. Emails não serão enviados.
```
Significa que as variáveis de ambiente não estão configuradas.

### 3. Testar envio de email:
- Acesse o admin panel
- Vá para a tab "Usuários"
- Clique no botão de email ao lado de um usuário
- Verifique se o email foi enviado

## 🔍 Troubleshooting

### Erro: "Invalid login"
- Verifique se está usando a **Senha de App** e não a senha normal
- Certifique-se de que a verificação em duas etapas está ativada

### Erro: "Less secure app access"
- Gmail não permite mais "apps menos seguros"
- Use sempre a **Senha de App**

### Erro: "Connection timeout"
- Verifique sua conexão com a internet
- Verifique se o firewall não está bloqueando a porta 587

### Email não chega:
- Verifique a pasta de spam
- Verifique se o email de destino está correto
- Verifique os logs do servidor para erros

## 📋 Funcionalidades de Email Implementadas

### ✅ Emails de Reset de Senha
- **Endpoint:** `POST /admin/users/:userId/reset-password`
- **Template:** HTML responsivo com botão de reset
- **Validade:** Token válido por 1 hora
- **Segurança:** Link único e temporário

### ✅ Emails de Confirmação de Pagamento
- **Trigger:** Quando pagamento é confirmado
- **Template:** HTML com detalhes do pedido
- **Informações:** Lista de produtos, total, método de pagamento

### ✅ Emails de Código de Rastreio
- **Trigger:** Quando código de rastreio é gerado
- **Template:** HTML com código e link para rastreamento
- **Informações:** Código, transportadora, previsão de entrega

## 🎨 Templates de Email

Os templates são responsivos e incluem:
- Logo da empresa
- Cores da marca (dourado #D4AF37)
- Informações de contato
- Botões de ação
- Instruções de segurança

## 🔒 Segurança

- Tokens de reset têm validade de 1 hora
- Links são únicos e não reutilizáveis
- Emails incluem avisos de segurança
- Logs de envio para auditoria

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs do servidor
2. Teste a configuração com um email simples
3. Verifique as configurações de firewall
4. Entre em contato com o suporte técnico
