# Integração com os Correios - Ambiente de Produção

Este documento contém instruções para configurar e usar a integração com os Correios em ambiente de produção.

## Configuração do Ambiente

Para que a integração funcione corretamente em produção, é necessário configurar as seguintes variáveis de ambiente:

```bash
# Ambiente (PRODUCAO ou HOMOLOGACAO)
CORREIOS_AMBIENTE=PRODUCAO

# Credenciais de acesso (fornecidas pelos Correios)
CORREIOS_ID=seu_id_correios
CORREIOS_CODIGO_ACESSO=seu_codigo_acesso
CORREIOS_CONTRATO=seu_numero_contrato
CORREIOS_CARTAO_POSTAGEM=seu_cartao_postagem

# Dados do remetente (sua empresa)
CORREIOS_REMETENTE_NOME=KIMONO STORE
CORREIOS_REMETENTE_RAZAO=KIMONO COMERCIO LTDA
CORREIOS_REMETENTE_CNPJ=00000000000000
CORREIOS_REMETENTE_IE=00000000
CORREIOS_REMETENTE_LOGRADOURO=Rua Exemplo
CORREIOS_REMETENTE_NUMERO=123
CORREIOS_REMETENTE_COMPLEMENTO=Sala 1
CORREIOS_REMETENTE_BAIRRO=Centro
CORREIOS_REMETENTE_CIDADE=João Pessoa
CORREIOS_REMETENTE_UF=PB
CORREIOS_REMETENTE_CEP=58000000
CORREIOS_REMETENTE_TELEFONE=83999999999
CORREIOS_REMETENTE_EMAIL=contato@exemplo.com

# Configuração de email para notificações
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_senha_app
EMAIL_FROM=noreply@seusite.com
```

## Fluxo de Integração

O sistema está configurado para processar automaticamente os pedidos pagos e gerar códigos de rastreio. O fluxo completo é:

1. Cliente realiza um pedido e efetua o pagamento
2. Sistema atualiza o status do pedido para PAID
3. Job automático executa a cada 30 minutos e identifica pedidos pagos sem código de rastreio
4. Para cada pedido, o sistema:
   - Extrai os dados do destinatário e endereço
   - Calcula o peso total dos produtos
   - Gera uma pré-postagem na API dos Correios
   - Obtém o código de rastreio
   - Atualiza o pedido com o código de rastreio
   - Envia email ao cliente com o código

## Endpoints Disponíveis

### Endpoints Administrativos (requerem autenticação)

- **POST** `/api/correios/gerar-rastreio/:orderId` - Gera código de rastreio para um pedido específico
- **POST** `/api/correios/processar-pedidos` - Processa todos os pedidos pagos pendentes
- **GET** `/api/correios/testar-conexao` - Testa a conexão com a API dos Correios
- **GET** `/api/correios/status-integracao` - Verifica o status detalhado da integração

### Endpoints Públicos

- **GET** `/api/correios/rastrear/:codigoRastreio` - Rastreia um objeto pelos Correios
- **GET** `/api/correios/status` - Verifica o status público da integração

## Serviços Disponíveis

Os seguintes serviços dos Correios estão configurados:

- **PAC Contrato**: Código 03298
- **SEDEX Contrato**: Código 03220
- **SEDEX Hoje**: Código 03204

## Monitoramento e Troubleshooting

### Verificar Status da Integração

```bash
curl -X GET http://seu-servidor/api/correios/status-integracao \
  -H "Authorization: Bearer seu_token_admin"
```

### Logs Importantes

Os logs do sistema contêm informações detalhadas sobre o processo de geração de códigos de rastreio. Procure por:

- `📦 Gerando código de rastreio para pedido` - Início do processo
- `✅ Código de rastreio gerado com sucesso` - Sucesso na geração
- `❌ Erro ao gerar código de rastreio` - Falha na geração
- `📧 Email com código de rastreio enviado` - Notificação enviada

### Problemas Comuns

1. **Erro 401 (Não Autorizado)**
   - Verifique se as credenciais estão corretas
   - Confirme se o contrato está ativo

2. **Erro na geração de etiquetas**
   - Verifique se o cartão de postagem está correto
   - Confirme se os dados do remetente estão completos

3. **Falha no envio de emails**
   - Verifique as credenciais de email
   - Para Gmail, use uma senha de aplicativo

## Processo de Homologação para Produção

1. **Teste de Conexão**: Verifique se a API consegue autenticar com as credenciais de produção
2. **Teste de Geração**: Gere um código de rastreio para um pedido de teste
3. **Teste de Rastreamento**: Verifique se o código gerado pode ser rastreado
4. **Teste de Email**: Confirme se os emails de notificação estão sendo enviados

## Suporte

Em caso de problemas com a integração:

1. Verifique os logs do sistema
2. Teste a conexão com a API usando o endpoint de teste
3. Verifique se todas as variáveis de ambiente estão configuradas
4. Entre em contato com o suporte dos Correios se os problemas persistirem 