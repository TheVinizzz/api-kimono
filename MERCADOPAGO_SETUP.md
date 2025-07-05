# 🚀 MERCADO PAGO - INTEGRAÇÃO PROFISSIONAL 2025

## ✅ **MELHORIAS IMPLEMENTADAS**

### 🔧 **1. SDK Oficial Atualizado**
- **Antes**: Chamadas diretas via axios
- **Agora**: SDK oficial `mercadopago@^2.0.15`
- **Benefícios**: Type safety, validações automáticas, melhor manutenção

### 🛡️ **2. Segurança Aprimorada**
- ✅ Validação de webhook com HMAC SHA256
- ✅ Proteção contra replay attacks (timeout 5 min)
- ✅ Headers de segurança obrigatórios
- ✅ Idempotência em todas as requisições

### 📊 **3. Tratamento de Erros Profissional**
- ✅ Códigos de erro específicos
- ✅ Mensagens detalhadas para usuário
- ✅ Logs estruturados para debug
- ✅ Fallbacks para falhas de API

### 💳 **4. Métodos de Pagamento Otimizados**

#### **PIX**
- ✅ QR Code automático
- ✅ Expiração configurável (30 min)
- ✅ Status em tempo real
- ✅ Validação de CPF/CNPJ

#### **Cartão de Crédito**
- ✅ Tokenização segura
- ✅ Parcelamento até 12x
- ✅ Validação completa de dados
- ✅ Detecção automática de bandeira

#### **Boleto**
- ✅ Geração automática
- ✅ URL para impressão
- ✅ Expiração configurável (3 dias)
- ✅ Código de barras

### 🔄 **5. Webhook Robusto**
- ✅ Validação de assinatura obrigatória
- ✅ Processamento assíncrono
- ✅ Prevenção de duplicação
- ✅ Logs detalhados

---

## ⚙️ **CONFIGURAÇÃO OBRIGATÓRIA**

### 📝 **1. Variáveis de Ambiente (.env)**

```bash
# ===== MERCADO PAGO - CONFIGURAÇÕES OBRIGATÓRIAS =====

# 🔑 CREDENCIAIS (SUBSTITUIR PELAS REAIS)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
MERCADOPAGO_PUBLIC_KEY=APP_USR-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
MERCADOPAGO_ENVIRONMENT=production  # ou sandbox para testes

# 🔒 WEBHOOK SECURITY
MERCADOPAGO_WEBHOOK_SECRET=sua_chave_secreta_do_webhook
MERCADOPAGO_NOTIFICATION_URL=https://seudominio.com/api/mercadopago/webhook

# ⚡ CONFIGURAÇÕES AVANÇADAS
MERCADOPAGO_TIMEOUT=15000
MERCADOPAGO_MAX_RETRIES=3
PIX_EXPIRATION_MINUTES=30
BOLETO_EXPIRATION_DAYS=3
```

### 🌐 **2. URL da API**
```bash
# Base URL da sua API
API_URL=https://seudominio.com
```

---

## 🛠️ **COMO OBTER CREDENCIAIS**

### 1️⃣ **Criar Aplicação**
1. Acesse: https://www.mercadopago.com.br/developers/panel
2. Crie uma nova aplicação
3. Configure as URLs de callback

### 2️⃣ **Obter Credenciais**
1. Vá para **Credenciais** > **Produção**
2. Copie o `Access Token` e `Public Key`
3. Configure no `.env`

### 3️⃣ **Configurar Webhook**
1. Vá para **Webhooks** na aplicação
2. URL: `https://seudominio.com/api/mercadopago/webhook`
3. Eventos: `payment.created`, `payment.updated`
4. Copie a **chave secreta** gerada

---

## 🔧 **USO NO FRONTEND**

### 💳 **Pagamento com Cartão**
```typescript
import { paymentService } from '@/services/api';

// ✅ MÉTODO ATUALIZADO
const result = await paymentService.processAuthenticatedCard({
  orderId: 123,
  creditCard: {
    holderName: "João Silva",
    number: "4000000000000002",
    expiryMonth: "12",
    expiryYear: "2027",
    ccv: "123"
  },
  holderInfo: {
    name: "João Silva",
    email: "joao@email.com",
    cpfCnpj: "12345678901",
    postalCode: "01234567",
    addressNumber: "123",
    phone: "11999999999"
  },
  installments: 3
}, token);

console.log('Pagamento:', result.data.paymentId);
```

### 📱 **Pagamento PIX**
```typescript
const result = await paymentService.processAuthenticatedPix({
  orderId: 123,
  cpfCnpj: "12345678901"
}, token);

console.log('QR Code:', result.data.pixInfo.qrCode);
console.log('QR Base64:', result.data.pixInfo.qrCodeBase64);
```

### 📄 **Pagamento Boleto**
```typescript
const result = await paymentService.processAuthenticatedBoleto({
  orderId: 123,
  cpfCnpj: "12345678901"
}, token);

console.log('Boleto:', result.data.boletoInfo);
```

### 🔍 **Verificar Status**
```typescript
const status = await paymentService.checkAuthenticatedPaymentStatus(123, token);
console.log('Status:', status.data.orderStatus);
```

---

## 🚨 **ENDPOINTS DISPONÍVEIS**

### 🔐 **Autenticados (com token)**
- `POST /api/mercadopago/credit-card` - Pagamento cartão
- `POST /api/mercadopago/pix` - Pagamento PIX  
- `POST /api/mercadopago/boleto` - Pagamento boleto
- `GET /api/mercadopago/status/:orderId` - Status do pagamento

### 👤 **Guest (sem token)**
- `POST /api/orders/guest/card` - Pagamento cartão guest
- `POST /api/orders/guest/pix` - Pagamento PIX guest
- `POST /api/orders/guest/boleto` - Pagamento boleto guest

### 🔔 **Webhook**
- `POST /api/mercadopago/webhook` - Notificações do MP

---

## 🧪 **TESTE DE CARTÕES**

### ✅ **Cartões Aprovados**
```
Visa: 4000000000000002
Mastercard: 5555555555554444
American Express: 374245455400126
```

### ❌ **Cartões Rejeitados**
```
Sem limite: 4000000000000069
Dados inválidos: 4000000000000127
```

### 💰 **PIX/Boleto Teste**
- Valores: R$ 1,00 a R$ 1.000,00
- Status: Aprovação automática em sandbox

---

## 📊 **MONITORAMENTO**

### 🔍 **Logs Importantes**
```bash
# Verificar logs do webhook
tail -f /var/log/app.log | grep "webhook"

# Verificar pagamentos
tail -f /var/log/app.log | grep "pagamento"
```

### 📈 **Métricas**
- Taxa de aprovação de cartões
- Tempo de resposta da API
- Erros de webhook
- Conversão PIX vs Cartão

---

## ⚠️ **PROBLEMAS COMUNS**

### 1️⃣ **Webhook Falha**
**Causa**: Assinatura inválida
**Solução**: Verificar `MERCADOPAGO_WEBHOOK_SECRET`

### 2️⃣ **Cartão Rejeitado**
**Causa**: Dados inválidos ou teste
**Solução**: Verificar dados e usar cartões de teste

### 3️⃣ **PIX não Gera QR**
**Causa**: Credenciais de sandbox/produção
**Solução**: Verificar ambiente correto

### 4️⃣ **Timeout**
**Causa**: API lenta
**Solução**: Aumentar `MERCADOPAGO_TIMEOUT`

---

## 📞 **SUPORTE**

### 🆘 **Emergência**
1. Verificar https://status.mercadopago.com
2. Consultar logs da aplicação
3. Testar com credenciais de sandbox

### 📚 **Documentação**
- [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
- [SDK Node.js](https://github.com/mercadopago/sdk-nodejs)
- [Webhooks](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/your-integrations/webhooks)

### 🔧 **Debug**
```bash
# Ativar logs detalhados
export DEBUG=mercadopago:*
npm run dev
```

---

## ✅ **CHECKLIST DE PRODUÇÃO**

- [ ] Credenciais de produção configuradas
- [ ] Webhook URL correta e SSL válido
- [ ] Timeout adequado (15s recomendado)
- [ ] Rate limiting configurado
- [ ] Logs estruturados ativos
- [ ] Monitoramento de erros
- [ ] Backup das configurações
- [ ] Teste de todos os métodos de pagamento
- [ ] Validação de CPF/CNPJ ativa
- [ ] Políticas de retry configuradas

---

**🎉 Integração do Mercado Pago atualizada com sucesso!**
**🔒 Segura, robusta e preparada para produção** 