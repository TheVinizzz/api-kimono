# Integração com os Correios

Este documento explica detalhadamente a integração com a API dos Correios implementada no sistema, abrangendo desde a autenticação até a geração automática de códigos de rastreio para pedidos.

## Estrutura da Integração

A integração com os Correios foi implementada através dos seguintes componentes:

1. **Configuração** (`src/config/correios.ts`): Define os endpoints, credenciais e dados do remetente.
2. **Tipos** (`src/types/correios.types.ts`): Define as interfaces TypeScript para as requisições e respostas da API.
3. **Serviço** (`src/services/correios.service.ts`): Implementa a lógica de comunicação com a API dos Correios.
4. **Controlador** (`src/controllers/correios.controller.ts`): Expõe endpoints RESTful para acesso às funcionalidades.
5. **Rotas** (`src/routes/correios.routes.ts`): Define as rotas da API para acesso às funcionalidades.
6. **Job Agendado** (`src/index.ts`): Executa automaticamente a cada 30 minutos para processar pedidos pagos.

## Fluxo Completo

O fluxo de processamento completo funciona da seguinte forma:

1. **Cliente faz pedido e paga**:
   - O status do pedido é atualizado para `PAID`

2. **Job automático é executado a cada 30 minutos**:
   - Identifica pedidos com status `PAID` e sem código de rastreio
   - Para cada pedido encontrado:

3. **Geração do código de rastreio**:
   - Extrai dados do destinatário e endereço do pedido
   - Calcula o peso total com base nos produtos
   - Gera uma pré-postagem na API dos Correios
   - Obtém o código de rastreio

4. **Atualização do pedido**:
   - Atualiza o pedido com o código de rastreio obtido
   - Muda o status do pedido para `PROCESSING`

5. **Notificação ao cliente**:
   - Envia um email para o cliente informando o código de rastreio
   - Inclui estimativa de prazo de entrega

## Ambiente de Produção

A configuração para ambiente de produção inclui:

```
CORREIOS_AMBIENTE=PRODUCAO
CORREIOS_ID=seu_id_correios
CORREIOS_CODIGO_ACESSO=seu_codigo_acesso
CORREIOS_CONTRATO=seu_numero_contrato
CORREIOS_CARTAO_POSTAGEM=seu_cartao_postagem
```

### Endpoints Importantes

- **Autenticação**: `/token/v1/autentica` ou `/token/v1/autentica/cartaopostagem`
- **Pré-postagem**: `/prepostagem/v1/prepostagens`
- **Rastreamento**: `/srorastro/v1/objetos/{codigo}`

## Requisição de Pré-postagem

Para criar uma pré-postagem e obter um código de rastreio, a requisição deve incluir:

1. **Dados do remetente**:
   - Nome, CNPJ, endereço completo, telefone e email

2. **Dados do destinatário**:
   - Nome, documento, endereço completo, telefone e email

3. **Informações do pacote**:
   - Código do serviço (PAC, SEDEX)
   - Formato do objeto (Envelope, Pacote, Rolo)
   - Peso total em gramas
   - Dimensões (altura, largura, comprimento)
   - Declaração de conteúdo (itens, quantidades e valores)
   - Serviços adicionais (Valor Declarado, Aviso de Recebimento, etc)

Exemplo de requisição:

```json
{
  "remetente": {
    "nome": "KIMONO STORE",
    "cnpj": "48496267000148",
    "endereco": {
      "logradouro": "R VIEIRA PORTUENSE",
      "numero": "62",
      "bairro": "JARDIM ORIENTAL",
      "cidade": "SAO PAULO",
      "uf": "SP",
      "cep": "04347080"
    },
    "telefone": "11981019084",
    "email": "contato@kimonostore.com.br"
  },
  "destinatario": {
    "nome": "Cliente Teste",
    "documento": "12345678909",
    "endereco": {
      "logradouro": "Avenida Epitácio Pessoa",
      "numero": "1000",
      "bairro": "Tambaú",
      "cidade": "João Pessoa",
      "uf": "PB",
      "cep": "58039000"
    },
    "telefone": "83999999999",
    "email": "cliente@exemplo.com"
  },
  "codigoServico": "03298",
  "formatoObjeto": 2,
  "peso": 500,
  "volumes": [{
    "altura": 5,
    "largura": 25,
    "comprimento": 30,
    "peso": 500,
    "tipoObjeto": 2
  }],
  "servicosAdicionais": ["001"],
  "objetosProibidos": false,
  "declaracaoConteudo": {
    "itens": [
      {
        "descricao": "Kimono",
        "quantidade": 1,
        "valor": 99.90
      }
    ]
  }
}
```

## Melhorias Implementadas

1. **Automação Completa**:
   - Job agendado a cada 30 minutos para processar pedidos
   - Não requer intervenção manual

2. **Robustez**:
   - Mecanismo de retry com backoff exponencial para falhas temporárias
   - Tratamento robusto de dados do endereço com fallbacks para campos opcionais

3. **Notificação por Email**:
   - Envio automático de email ao cliente quando o código é gerado
   - Inclui link para rastreamento e estimativa de entrega

4. **Monitoramento**:
   - Endpoints para verificar o status da integração
   - Logs detalhados para facilitar troubleshooting

5. **Documentação**:
   - Scripts de teste e validação
   - Documentação completa do processo

## Scripts de Utilidade

1. **teste-produzir-xml.js**: Gera um XML de exemplo para uso em testes e homologação
2. **test-correios-producao.js**: Script para testar toda a integração em ambiente de produção
3. **configurar-correios.js**: Script interativo para configurar as variáveis de ambiente

## Possíveis Problemas e Soluções

1. **Erro 401 (Não Autorizado)**:
   - Verifique se as credenciais estão corretas
   - Certifique-se que o contrato está ativo
   - Verifique se o cartão de postagem é válido

2. **Erro 400 (Requisição inválida)**:
   - Confira todos os campos obrigatórios
   - Verifique formatos de dados (CEP, telefone, CNPJ)
   - Certifique-se que o formato do objeto está correto

3. **Falha no envio de emails**:
   - Verifique as credenciais de email
   - Para Gmail, use uma senha de aplicativo
   - O serviço inclui retry automático

## API Pública

O sistema expõe as seguintes rotas para integração com os Correios:

### Rotas Administrativas (requerem autenticação)

- **POST** `/api/correios/gerar-rastreio/:orderId`: Gera código de rastreio para um pedido específico
- **POST** `/api/correios/processar-pedidos`: Processa manualmente os pedidos pagos pendentes
- **GET** `/api/correios/testar-conexao`: Testa a conexão com a API dos Correios
- **GET** `/api/correios/status-integracao`: Verifica o status detalhado da integração

### Rotas Públicas

- **GET** `/api/correios/rastrear/:codigoRastreio`: Rastreia um objeto pelos Correios
- **GET** `/api/correios/status`: Verifica o status público da integração

## Conclusão

A integração com os Correios está totalmente funcional e automatizada. O sistema identifica pedidos pagos, gera códigos de rastreio, atualiza os pedidos e notifica os clientes sem intervenção manual.

Para modificações futuras, consulte a [documentação oficial dos Correios](https://www.correios.com.br/atendimento/developers). 