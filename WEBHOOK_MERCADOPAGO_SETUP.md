# 🔔 GUIA COMPLETO - CONFIGURAÇÃO WEBHOOK MERCADO PAGO

## 📍 **ROTA DO WEBHOOK ATUAL**

### **URL do Webhook:**
```
https://SEU_DOMINIO.com/api/mercadopago/webhook
```

### **Rotas Configuradas:**
- **Desenvolvimento**: `http://localhost:4000/api/mercadopago/webhook`
- **Produção**: `https://seu-dominio.com/api/mercadopago/webhook`

## 🛠️ **COMO CONFIGURAR NO MERCADO PAGO**

### **Método 1: Pelo Painel Web (Recomendado)**

#### **Passo 1: Acessar o Painel**
1. Acesse: https://www.mercadopago.com.br/developers
2. Faça login com sua conta
3. Vá em **"Suas integrações"**
4. Selecione sua aplicação

#### **Passo 2: Configurar Webhook**
1. Clique na aba **"Webhooks"**
2. Clique em **"Configurar notificações"**
3. Cole a URL: `https://seu-dominio.com/api/mercadopago/webhook`
4. Selecione os eventos:
   - ✅ **Pagamentos** (payment)
   - ✅ **Planos** (plan) - opcional
   - ✅ **Assinaturas** (subscription) - opcional
   - ✅ **Faturas** (invoice) - opcional

#### **Passo 3: Testar Webhook**
1. Clique em **"Simular notificação"**
2. Escolha o evento **"payment"**
3. Verificar se retorna status **200 OK**

### **Método 2: Via API (Programático)**

```bash
curl -X POST \
  'https://api.mercadopago.com/v1/webhooks' \
  -H 'Authorization: Bearer SEU_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://seu-dominio.com/api/mercadopago/webhook",
    "events": [
      {
        "topic": "payment"
      }
    ]
  }'
```

## 🔧 **CONFIGURAÇÃO NO CÓDIGO**

### **1. Verificar Rota Atual**

```typescript
// api/src/routes/mercadopago.routes.ts
import { mercadoPagoWebhook } from '../controllers/mercadopago.controller';

const router = Router();

// ✅ Webhook configurado (SEM autenticação)
router.post('/webhook', mercadoPagoWebhook);
```

### **2. Controller do Webhook**

```typescript
// api/src/controllers/payment.controller.ts
export const mercadoPagoWebhook = async (req: Request, res: Response) => {
  try {
    console.log('🔔 Webhook recebido do Mercado Pago:', req.body);
    
    const { type, action, data } = req.body;

    // Verificar se é um webhook de pagamento
    if (type !== 'payment') {
      console.log('Webhook ignorado - não é de pagamento:', type);
      return res.status(200).json({ received: true });
    }

    // Buscar detalhes do pagamento
    const payment = await mercadoPagoService.getPaymentStatus(data.id);
    
    // Buscar pedido pela referência externa
    const order = await prisma.order.findUnique({
      where: { id: Number(payment.external_reference) }
    });

    if (order) {
      // Atualizar status do pedido
      const newStatus = mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status);
      
      await prisma.order.update({
        where: { id: order.id },
        data: { status: newStatus }
      });
      
      console.log(`✅ Pedido ${order.id} atualizado para: ${newStatus}`);
    }

    return res.status(200).json({ received: true, processed: true });
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
};
```

## 🔒 **CONFIGURAÇÃO DE SEGURANÇA (IMPLEMENTADA)**

### **🔑 Assinatura Secreta Configurada**

**Chave Secreta Atual:**
```
4862b799a3bb9fa8fd7ee3b25af593add5631a6af3f5e366564eb8f2e713fce9
```

### **1. Validação de Assinatura (✅ IMPLEMENTADA)**

```typescript
import crypto from 'crypto';

// Chave secreta do webhook (já configurada no código)
const WEBHOOK_SECRET = '4862b799a3bb9fa8fd7ee3b25af593add5631a6af3f5e366564eb8f2e713fce9';

// Função de validação implementada
const validateWebhookSignature = (req: Request): boolean => {
  try {
    const xSignature = req.headers['x-signature'] as string;
    const xRequestId = req.headers['x-request-id'] as string;
    const dataID = req.body?.data?.id;

    if (!xSignature || !xRequestId || !dataID) {
      return false;
    }

    // Extrair timestamp e hash
    const parts = xSignature.split(',');
    let ts = '';
    let hash = '';

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key && value) {
        const cleanKey = key.trim();
        const cleanValue = value.trim();
        if (cleanKey === 'ts') {
          ts = cleanValue;
        } else if (cleanKey === 'v1') {
          hash = cleanValue;
        }
      }
    }

    // Criar manifest para validação
    const manifest = `id:${dataID};request-id:${xRequestId};ts:${ts};`;
    
    // Gerar HMAC SHA256
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    hmac.update(manifest);
    const sha = hmac.digest('hex');

    return sha === hash;
  } catch (error) {
    console.error('Erro ao validar assinatura:', error);
    return false;
  }
};

// Webhook com validação de assinatura
export const mercadoPagoWebhook = async (req: Request, res: Response) => {
  // ✅ Validação de assinatura implementada
  if (!validateWebhookSignature(req)) {
    console.error('Assinatura do webhook inválida');
    return res.status(401).json({ error: 'Assinatura inválida' });
  }

  console.log('✅ Assinatura do webhook validada com sucesso');
  
  // ... resto do código
};
```

### **2. Configuração no .env**

Adicione no seu arquivo `.env`:

```env
# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=seu_access_token_aqui
MERCADOPAGO_PUBLIC_KEY=sua_public_key_aqui

# Webhook Secret (já configurado no código)
MERCADOPAGO_WEBHOOK_SECRET=4862b799a3bb9fa8fd7ee3b25af593add5631a6af3f5e366564eb8f2e713fce9

# URL da API
API_URL=https://seudominio.com
```

### **2. Rate Limiting**

```typescript
import rateLimit from 'express-rate-limit';

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // máximo 100 requests por minuto
  message: 'Muitas requisições de webhook'
});

router.post('/webhook', webhookLimiter, mercadoPagoWebhook);
```

### **3. Idempotência**

```typescript
const processedWebhooks = new Set<string>();

export const mercadoPagoWebhook = async (req: Request, res: Response) => {
  const webhookId = req.body.id;
  
  if (processedWebhooks.has(webhookId)) {
    console.log('Webhook já processado:', webhookId);
    return res.status(200).json({ received: true, duplicate: true });
  }
  
  processedWebhooks.add(webhookId);
  
  // ... processar webhook
};
```

## 🧪 **COMO TESTAR O WEBHOOK**

### **1. Teste Local com ngrok**

```bash
# Instalar ngrok
npm install -g ngrok

# Expor porta local
ngrok http 4000

# Usar URL gerada no Mercado Pago:
# https://abc123.ngrok.io/api/mercadopago/webhook
```

### **2. Teste com cURL**

```bash
# Simular webhook de pagamento aprovado
curl -X POST http://localhost:4000/api/mercadopago/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "action": "payment.updated",
    "api_version": "v1",
    "data": {
      "id": "123456789"
    },
    "date_created": "2024-01-01T00:00:00Z",
    "id": 12345,
    "live_mode": false,
    "type": "payment",
    "user_id": "123456"
  }'
```

### **3. Logs para Debug**

```typescript
// Adicionar logs detalhados
export const mercadoPagoWebhook = async (req: Request, res: Response) => {
  console.log('🔔 WEBHOOK RECEBIDO:', {
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString()
  });
  
  // ... resto do código
};
```

## 📋 **CHECKLIST DE CONFIGURAÇÃO**

### **✅ Desenvolvimento**
- [ ] Webhook rodando em `http://localhost:4000/api/mercadopago/webhook`
- [ ] ngrok configurado para testes
- [ ] Logs detalhados ativados
- [ ] Teste com cURL funcionando

### **✅ Produção**
- [ ] Webhook configurado no painel MP: `https://seu-dominio.com/api/mercadopago/webhook`
- [ ] HTTPS obrigatório
- [ ] Validação de assinatura implementada
- [ ] Rate limiting configurado
- [ ] Monitoramento/alertas configurados

## 🚨 **PROBLEMAS COMUNS E SOLUÇÕES**

### **Problema: Webhook retorna 404**
**Solução**: Verificar se a rota está correta:
```typescript
// ✅ Correto
app.use('/api/mercadopago', mercadoPagoRoutes);

// ❌ Incorreto
app.use('/mercadopago', mercadoPagoRoutes);
```

### **Problema: Webhook não é chamado**
**Solução**: 
1. Verificar URL no painel MP
2. Testar com ngrok em desenvolvimento
3. Verificar firewall/proxy em produção

### **Problema: Webhook falha constantemente**
**Solução**:
1. Sempre retornar status 200
2. Processar de forma assíncrona
3. Implementar retry logic

### **Problema: Webhooks duplicados**
**Solução**: Implementar idempotência com cache de IDs processados

## 📞 **SUPORTE E DOCUMENTAÇÃO**

- **Documentação Oficial**: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
- **Simulador de Webhook**: https://www.mercadopago.com.br/developers/panel/webhooks
- **Status da API**: https://status.mercadopago.com/
- **Suporte**: developers@mercadopago.com

## 🎯 **URL FINAL PARA CONFIGURAR**

**Para seu projeto:**
```
https://SEU_DOMINIO.com/api/mercadopago/webhook
```

**Eventos para selecionar:**
- ✅ **payment** (obrigatório)
- ✅ **plan** (opcional)
- ✅ **subscription** (opcional) 