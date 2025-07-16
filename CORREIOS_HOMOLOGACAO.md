# Homologação da Integração com os Correios

Este guia explica como configurar e testar a integração com a API dos Correios para geração automática de códigos de rastreio.

## 📋 Pré-requisitos

Antes de começar, você precisa ter:

1. **Credenciais dos Correios**:
   - ID/Usuário
   - Código de acesso/senha
   - Número do contrato
   - Número do cartão de postagem

2. **Dados do remetente**:
   - Nome da empresa
   - CNPJ
   - Endereço completo
   - Telefone e email

## 🛠️ Configuração do Ambiente

Para facilitar a configuração, criamos um script interativo que vai guiar você pelo processo:

```bash
node configurar-correios.js
```

Este script vai:
1. Solicitar todas as informações necessárias
2. Validar os dados fornecidos
3. Salvar as configurações no arquivo `.env`
4. Oferecer a opção de executar um teste de homologação

## 🧪 Testando a Integração

Para testar a integração com os Correios, execute:

```bash
node test-correios-homologacao.js
```

Este script realiza os seguintes testes:

1. **Autenticação**: Verifica se as credenciais estão corretas
2. **Status da integração**: Verifica se todas as configurações estão válidas
3. **Conexão direta**: Testa a conexão com a API dos Correios
4. **Pedido de teste**: Cria um pedido de teste ou usa um existente
5. **Geração de código de rastreio**: Tenta gerar um código de rastreio para o pedido
6. **Rastreamento**: Tenta rastrear o código gerado
7. **Processamento automático**: Testa o processamento automático de pedidos pagos

## 🔄 Fluxo Automático

Após a configuração, o sistema irá automaticamente:

1. Detectar pedidos pagos sem código de rastreio
2. Gerar códigos de rastreio através da API dos Correios
3. Atualizar os pedidos com os códigos gerados
4. Enviar emails aos clientes com os códigos de rastreio
5. Permitir o rastreamento dos pedidos

Este processo ocorre automaticamente a cada 30 minutos, sem necessidade de intervenção manual.

## ⚠️ Solução de Problemas

Se encontrar problemas durante a homologação:

1. **Erro 401 (Não autorizado)**:
   - Verifique se as credenciais estão corretas
   - Confirme se o contrato permite acesso à API
   - Verifique se o ambiente está configurado corretamente (HOMOLOGACAO ou PRODUCAO)

2. **Erro ao gerar código de rastreio**:
   - Verifique se o endereço está completo e no formato correto
   - Confirme se o cartão de postagem está ativo
   - Verifique se o serviço escolhido (PAC/SEDEX) está disponível no contrato

3. **Erro ao rastrear código**:
   - Códigos recém-gerados podem demorar algumas horas para serem ativados no sistema dos Correios
   - Verifique se o código está no formato correto

## 📝 Variáveis de Ambiente

As seguintes variáveis de ambiente são necessárias:

```
CORREIOS_AMBIENTE=HOMOLOGACAO
CORREIOS_ID=seu_id
CORREIOS_CODIGO_ACESSO=sua_senha
CORREIOS_CONTRATO=seu_contrato
CORREIOS_CARTAO_POSTAGEM=seu_cartao
CORREIOS_REMETENTE_NOME=Nome da Empresa
CORREIOS_REMETENTE_CNPJ=12345678000199
CORREIOS_REMETENTE_IE=
CORREIOS_REMETENTE_ENDERECO=Rua Exemplo
CORREIOS_REMETENTE_NUMERO=123
CORREIOS_REMETENTE_COMPLEMENTO=Sala 1
CORREIOS_REMETENTE_BAIRRO=Centro
CORREIOS_REMETENTE_CIDADE=São Paulo
CORREIOS_REMETENTE_UF=SP
CORREIOS_REMETENTE_CEP=01310100
CORREIOS_REMETENTE_TELEFONE=11999998888
CORREIOS_REMETENTE_EMAIL=contato@seusite.com
```

## 🚀 Próximos Passos

Após concluir a homologação com sucesso:

1. Configure o ambiente de produção alterando `CORREIOS_AMBIENTE=PRODUCAO`
2. Verifique se o job agendado está funcionando corretamente
3. Monitore os primeiros pedidos para garantir que os códigos estão sendo gerados corretamente 