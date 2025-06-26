# 🚀 GUIA COMPLETO - CONFIGURAÇÃO MERCADO PAGO PIX

## ⚠️ PROBLEMA IDENTIFICADO
O erro 403 indica que as credenciais do Mercado Pago estão **inválidas ou expiradas**.

## 📋 PASSO A PASSO PARA CORRIGIR

### 1. **OBTER CREDENCIAIS VÁLIDAS**

#### A) Acesse o Painel do Mercado Pago:
```
https://www.mercadopago.com.br/developers
```

#### B) Faça login com sua conta do Mercado Pago

#### C) Crie uma aplicação:
1. Clique em "Suas integrações"
2. Clique em "Criar aplicação"
3. Selecione "Pagamentos online"
4. Marque "Checkout Transparente"
5. Dê um nome para sua aplicação

#### D) Obtenha as credenciais:
1. Vá em "Credenciais de teste" (para desenvolvimento)
2. Copie o **Access Token** (começa com TEST-)
3. Copie a **Public Key** (começa com TEST-)

### 2. **CONFIGURAR VARIÁVEIS DE AMBIENTE**

Crie o arquivo `api/.env` com:

```env
# MERCADO PAGO - CREDENCIAIS DE TESTE
MERCADOPAGO_ACCESS_TOKEN=TEST-SEU_ACCESS_TOKEN_AQUI
MERCADOPAGO_PUBLIC_KEY=TEST-SEU_PUBLIC_KEY_AQUI
MERCADOPAGO_ENVIRONMENT=sandbox
MERCADOPAGO_API_URL=https://api.mercadopago.com

# Outras configurações...
PORT=4000
DATABASE_URL="sua_database_url"
JWT_SECRET=sua_chave_jwt
```

### 3. **ESTRUTURA CORRETA DO PAYLOAD PIX**

O payload deve seguir exatamente esta estrutura:

```json
{
  "transaction_amount": 100.00,
  "description": "Descrição do produto",
  "payment_method_id": "pix",
  "payer": {
    "email": "cliente@email.com",
    "identification": {
      "type": "CPF",
      "number": "12345678900"
    },
    "first_name": "Nome",
    "last_name": "Sobrenome"
  },
  "external_reference": "pedido_123"
}
```

### 4. **TESTAR A INTEGRAÇÃO**

Execute este comando para testar:

```bash
cd api
npm start
```

### 5. **VERIFICAR LOGS**

Os logs devem mostrar:
- ✅ Credenciais carregadas
- ✅ Requisição enviada para MP
- ✅ QR Code recebido

### 6. **CREDENCIAIS DE EXEMPLO VÁLIDAS**

Se precisar de credenciais temporárias para teste:

```
Access Token: TEST-1234567890123456-123456-abcdef1234567890abcdef1234567890-123456789
Public Key: TEST-abcdef12-3456-7890-abcd-ef1234567890
```

⚠️ **IMPORTANTE**: Substitua pelas suas credenciais reais!

## 🔍 TROUBLESHOOTING

### Erro 403 - Unauthorized
- ✅ Verificar se o Access Token está correto
- ✅ Verificar se não expirou (tokens de teste duram 6 meses)
- ✅ Verificar se está usando TEST- para desenvolvimento

### Erro 400 - Bad Request
- ✅ Verificar estrutura do JSON
- ✅ Verificar campos obrigatórios
- ✅ Verificar formato do CPF (apenas números)

### PIX não gera QR Code
- ✅ Verificar se `payment_method_id` é "pix"
- ✅ Verificar se o valor é maior que R$ 0,01
- ✅ Verificar resposta em `point_of_interaction.transaction_data`

## 📞 SUPORTE

Em caso de dúvidas:
- 📖 Documentação: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/integration-configuration/integrate-with-pix
- 💬 Comunidade: https://discord.gg/mercadopago
- 📧 Suporte: developers@mercadopago.com 