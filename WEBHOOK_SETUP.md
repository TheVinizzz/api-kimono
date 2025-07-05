# 🔔 CONFIGURAÇÃO WEBHOOK MERCADO PAGO

## 📋 **DADOS PARA CONFIGURAR NO PAINEL MP**

### **🌐 URL do Webhook**
```
https://e614-187-115-177-238.ngrok-free.app/api/mercadopago/webhook
```

### **📋 Eventos a Configurar**
Marque TODOS estes eventos no painel:

- ✅ `payment.created`
- ✅ `payment.updated` 
- ✅ `payment.authorized`
- ✅ `payment.approved`
- ✅ `payment.rejected`
- ✅ `payment.cancelled`
- ✅ `payment.refunded`

### **⚙️ Configurações**
- **Método**: POST
- **Content-Type**: application/json
- **Ambiente**: Sandbox (para testes)

---

## 🔗 **LINKS DIRETOS**

1. **Painel de Aplicações**: https://www.mercadopago.com.br/developers/panel
2. **Configurar Webhooks**: https://www.mercadopago.com.br/developers/panel/app/webhooks
3. **Documentação**: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/your-integrations/webhooks

---

## 🧪 **TESTE DE FUNCIONAMENTO**

### ✅ **Status da API**
- URL Base: https://e614-187-115-177-238.ngrok-free.app
- Status: ✅ Online
- Webhook Endpoint: ✅ Funcionando

### 🔧 **Comando para Testar**
```bash
curl -X POST https://e614-187-115-177-238.ngrok-free.app/api/mercadopago/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'
```

**Resposta Esperada**: `401 - Assinatura inválida` (isso é bom!)

---

## ⚠️ **IMPORTANTE**

### **1. Configurar Chave Secreta**
Após criar o webhook no painel, copie a chave secreta e adicione no `.env`:
```bash
MERCADOPAGO_WEBHOOK_SECRET=sua_chave_secreta_aqui
```

### **2. Reiniciar Servidor**
Depois de configurar o `.env`:
```bash
npm run dev
```

### **3. URL do ngrok**
⚠️ **A URL do ngrok muda a cada reinicialização!** 
Se reiniciar o ngrok, atualize a URL no painel do MP.

---

## 🎯 **CHECKLIST FINAL**

- [ ] Webhook criado no painel MP
- [ ] URL configurada: `https://e614-187-115-177-238.ngrok-free.app/api/mercadopago/webhook`
- [ ] Todos os eventos marcados
- [ ] Chave secreta copiada para `.env`
- [ ] Servidor reiniciado
- [ ] Teste realizado com sucesso

---

## 🆘 **RESOLUÇÃO DE PROBLEMAS**

### **❌ Webhook não recebe dados**
1. Verificar se a URL está correta
2. Verificar se o ngrok está rodando
3. Verificar logs do servidor

### **❌ Erro 401 - Assinatura inválida**
1. Verificar `MERCADOPAGO_WEBHOOK_SECRET` no `.env`
2. Verificar se copiou a chave correta do painel
3. Reiniciar o servidor após mudanças

### **❌ Timeout**
1. Verificar se a API está respondendo
2. Verificar configuração de timeout no MP
3. Verificar logs de rede

**✅ Tudo configurado corretamente!** 