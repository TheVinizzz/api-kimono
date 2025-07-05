# 📮 Configuração da Integração com os Correios

Este documento explica como configurar a integração com a API oficial dos Correios para gerar códigos de rastreio automaticamente.

## 🔧 Variáveis de Ambiente Necessárias

Adicione as seguintes variáveis ao seu arquivo `.env`:

```bash
# Configuração dos Correios
CORREIOS_AMBIENTE=HOMOLOGACAO  # ou PRODUCAO
CORREIOS_ID=00000000
CORREIOS_CODIGO_ACESSO=xxxxxxxxxxxxxx
CORREIOS_CONTRATO=000000000
CORREIOS_CARTAO_POSTAGEM=0000000000

# Dados do Remetente (sua empresa)
CORREIOS_REMETENTE_NOME=KIMONO STORE
CORREIOS_REMETENTE_RAZAO=KIMONO COMERCIO LTDA
CORREIOS_REMETENTE_CNPJ=00000000000000
CORREIOS_REMETENTE_IE=000000000

# Endereço do Remetente
CORREIOS_REMETENTE_LOGRADOURO=Rua das Flores
CORREIOS_REMETENTE_NUMERO=123
CORREIOS_REMETENTE_COMPLEMENTO=Sala 45
CORREIOS_REMETENTE_BAIRRO=Centro
CORREIOS_REMETENTE_CIDADE=São Paulo
CORREIOS_REMETENTE_UF=SP
CORREIOS_REMETENTE_CEP=01310100

# Contato do Remetente
CORREIOS_REMETENTE_TELEFONE=11999999999
CORREIOS_REMETENTE_EMAIL=contato@kimonostore.com
```

## 📋 Como Obter as Credenciais dos Correios

### 1. Contratar Serviço dos Correios
Para usar a API oficial dos Correios, você precisa:

1. **Ter um CNPJ ativo**
2. **Contratar um dos serviços**:
   - PAC Contrato
   - SEDEX Contrato
   - Outros serviços postais
3. **Solicitar acesso à API** junto aos Correios

### 2. Credenciais Necessárias

- **CORREIOS_ID**: Identificador único fornecido pelos Correios
- **CORREIOS_CODIGO_ACESSO**: Código de acesso para API
- **CORREIOS_CONTRATO**: Número do seu contrato com os Correios
- **CORREIOS_CARTAO_POSTAGEM**: Número do cartão de postagem

### 3. Ambientes

- **HOMOLOGACAO**: Para testes (não gera códigos reais)
- **PRODUCAO**: Para uso real (gera códigos válidos)

## 🚀 Como Usar

### 1. Testar Configuração

```bash
GET /api/correios/testar-conexao
Authorization: Bearer <admin_token>
```

### 2. Gerar Código de Rastreio Manual

```bash
POST /api/correios/gerar-rastreio/{orderId}
Authorization: Bearer <admin_token>
```

### 3. Processar Todos os Pedidos Pagos

```bash
POST /api/correios/processar-pedidos
Authorization: Bearer <admin_token>
```

### 4. Rastrear Objeto (Público)

```bash
GET /api/correios/rastrear/{codigoRastreio}
```

## ⚡ Funcionamento Automático

O sistema foi configurado para:

1. **Detectar pagamentos aprovados** automaticamente
2. **Gerar códigos de rastreio** para pedidos pagos
3. **Atualizar status** do pedido para "PROCESSING"
4. **Armazenar código de rastreio** no banco de dados

## 🔄 Processo de Geração de Código

1. Pedido é marcado como **PAID**
2. Sistema verifica se pedido já tem código de rastreio
3. Extrai dados do destinatário do pedido
4. Calcula peso estimado dos produtos
5. Cria prepostagem nos Correios
6. Recebe código de rastreio (BR123456789BR)
7. Atualiza pedido com código de rastreio

## 📊 Logs e Monitoramento

O sistema gera logs detalhados:

```
📮 Gerando código de rastreio para pedido 123...
✅ Prepostagem criada com sucesso: BR123456789BR
```

## ⚠️ Limitações e Considerações

1. **Peso Estimado**: Sistema usa 400g por kimono como padrão
2. **Dimensões**: Usa dimensões padrão de embalagem (30x25x5cm)
3. **Serviço Padrão**: PAC (03298) para economia
4. **Rate Limiting**: Aguarda 2s entre cada criação de prepostagem

## 🛠️ Alternativas para Desenvolvimento

Se você não tem contrato com os Correios ainda, pode:

1. **Usar ambiente HOMOLOGACAO** (não gera códigos reais)
2. **Implementar mock service** para desenvolvimento
3. **Usar outros transportadores** como base

## 📞 Suporte

Para questões sobre:
- **Credenciais dos Correios**: Entre em contato com os Correios
- **Problemas técnicos**: Verifique os logs da aplicação
- **Configuração**: Siga este guia passo a passo

## 🔗 Links Úteis

- [Portal dos Correios](https://www.correios.com.br/)
- [Documentação da API dos Correios](https://www.correios.com.br/api-corporativa)
- [Contratar Serviços dos Correios](https://www2.correios.com.br/empresas)

---

**Importante**: Esta integração é com a **API oficial dos Correios** e requer contrato comercial. Para uso em produção, certifique-se de ter todas as credenciais válidas. 