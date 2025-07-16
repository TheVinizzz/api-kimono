# Configuração da API dos Correios

Este documento descreve a configuração e uso da API dos Correios para consulta de CEP, rastreamento de objetos e outros serviços.

## Requisitos

Para utilizar a API dos Correios, você precisa:

1. Ter um contrato ativo com os Correios
2. Credenciais de acesso (ID e código de acesso)
3. Cartão de postagem ativo (para alguns serviços)

## Variáveis de Ambiente

Configure as seguintes variáveis de ambiente no arquivo `.env`:

```
# Ambiente: PRODUCAO ou HOMOLOGACAO
CORREIOS_AMBIENTE=PRODUCAO

# Credenciais de acesso
CORREIOS_ID=seu_id_correios
CORREIOS_CODIGO_ACESSO=seu_codigo_acesso
CORREIOS_CONTRATO=seu_numero_contrato
CORREIOS_CARTAO_POSTAGEM=seu_cartao_postagem

# Dados do remetente
CORREIOS_REMETENTE_NOME=NOME_EMPRESA
CORREIOS_REMETENTE_RAZAO=RAZAO_SOCIAL_EMPRESA
CORREIOS_REMETENTE_CNPJ=00000000000000
CORREIOS_REMETENTE_IE=000000000000
CORREIOS_REMETENTE_LOGRADOURO=Rua Exemplo
CORREIOS_REMETENTE_NUMERO=123
CORREIOS_REMETENTE_COMPLEMENTO=Sala 1
CORREIOS_REMETENTE_BAIRRO=Centro
CORREIOS_REMETENTE_CIDADE=São Paulo
CORREIOS_REMETENTE_UF=SP
CORREIOS_REMETENTE_CEP=01310100
CORREIOS_REMETENTE_TELEFONE=11999998888
CORREIOS_REMETENTE_EMAIL=contato@empresa.com
```

## Serviços Disponíveis

A API dos Correios oferece diversos serviços, mas o acesso a cada um depende do seu contrato. Os principais serviços são:

1. **Consulta de CEP** - Obter informações de endereço a partir do CEP
2. **Rastreamento de objetos** - Consultar o status de entregas
3. **Cálculo de preço e prazo** - Estimar o custo e tempo de entrega
4. **Prepostagem** - Gerar etiquetas para envio

## Autenticação

A API dos Correios oferece diferentes métodos de autenticação:

1. **Autenticação direta** - Usando ID e código de acesso
2. **Autenticação com cartão de postagem** - Usando ID, código de acesso e cartão de postagem

Nossa implementação tenta primeiro a autenticação com cartão de postagem, pois ela oferece acesso a mais serviços, incluindo a API de CEP. Se falhar, tentamos a autenticação direta como fallback.

## Observações Importantes

1. **Acesso à API de CEP** - O acesso à API de CEP requer autenticação com cartão de postagem. A autenticação direta não tem permissão para acessar este serviço.

2. **Formato do CEP** - Os CEPs devem ser enviados sem formatação (apenas números, sem hífen).

3. **Ambiente de Homologação** - Para testes, use o ambiente de homologação (`CORREIOS_AMBIENTE=HOMOLOGACAO`).

4. **Limites de Consulta** - A API de CEP permite consultar até 20 CEPs por requisição.

## Solução de Problemas

### Erro 403 (Acesso não autorizado)

Se você receber um erro 403 ao tentar acessar um serviço, verifique:

1. Se seu contrato tem acesso ao serviço específico
2. Se você está usando o método de autenticação correto (alguns serviços exigem autenticação com cartão de postagem)
3. Se suas credenciais estão corretas

### Erro 401 (Não autorizado)

Indica credenciais inválidas. Verifique seu ID e código de acesso.

### Alternativas para Consulta de CEP

Se você não tiver acesso à API de CEP dos Correios, considere usar alternativas gratuitas:

1. **BrasilAPI** - `https://brasilapi.com.br/api/cep/v1/{cep}`
2. **ViaCEP** - `https://viacep.com.br/ws/{cep}/json/`

## Testes

Para testar a integração com a API dos Correios, use os scripts:

1. `test-correios-completo.js` - Testa diferentes métodos de autenticação e endpoints
2. `test-cep-service.js` - Testa especificamente o serviço de CEP

## Referências

- [Documentação Oficial da API dos Correios](https://api.correios.com.br/)
- [Documentação da API de CEP v3](https://api.correios.com.br/cep/v3/api-docs) 