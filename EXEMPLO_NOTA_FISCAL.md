# Exemplo de Nota Fiscal Térmica - Formatação Profissional

## Layout Melhorado dos Totais

```
┌─────────────────────────────────────────────────────────────┐
│                    KIMONO STORE LTDA                        │
│              Rua das Flores, 123, Centro                    │
│              São Paulo - SP                                 │
│              CEP: 01310-100                                 │
│              CNPJ: 12.345.678/0001-90                      │
│              Tel: (11) 99999-9999                          │
├─────────────────────────────────────────────────────────────┤
│                 CUPOM FISCAL ELETRÔNICO                     │
│              NF-e: 001234                                  │
│              15/01/2024 14:30:25                          │
├─────────────────────────────────────────────────────────────┤
│ CLIENTE:                                                    │
│ João Silva                                                  │
│ CPF/CNPJ: 123.456.789-00                                   │
│ Rua das Palmeiras, 456, Jardim América                      │
│ São Paulo - SP                                             │
│ CEP: 01234-567                                             │
├─────────────────────────────────────────────────────────────┤
│ ITEM   DESCRIÇÃO                    QTD   UNIT     TOTAL   │
│ 1      Camiseta Básica - M          2    R$ 29,90  R$ 59,80│
│ 2      Calça Jeans - 42              1    R$ 89,90  R$ 89,90│
│ 3      Tênis Esportivo - 41          1    R$ 129,90 R$ 129,90│
├─────────────────────────────────────────────────────────────┤
│ Subtotal dos Produtos:                    R$ 279,60        │
│ ─────────────────────────────────────────────────────────── │
│ FRETE:                              R$ 15,00              │
│ ═══════════════════════════════════════════════════════════ │
│ TOTAL GERAL:                         R$ 294,60            │
├─────────────────────────────────────────────────────────────┤
│ FORMA DE PAGAMENTO:                                        │
│ Cartão de Crédito                                          │
├─────────────────────────────────────────────────────────────┤
│                    [QR CODE NFC-e]                         │
│              Chave de acesso:                              │
│ 12345678901234567890123456789012345678901234              │
├─────────────────────────────────────────────────────────────┤
│              contato@empresa.com.br                        │
│              OBRIGADO PELA PREFERÊNCIA!                    │
│              (11) 99999-9999                               │
│                                                             │
│              Documento Auxiliar da NFC-e                   │
│              Não permite aproveitamento de crédito de ICMS │
└─────────────────────────────────────────────────────────────┘
```

## Melhorias Implementadas

### 1. **Códigos Sequenciais Profissionais**
- ✅ **ITEM 1, 2, 3...**: Códigos sequenciais crescentes
- ✅ **Organização**: Facilita identificação dos produtos
- ✅ **Profissional**: Layout mais limpo e organizado

### 2. **Formatação Profissional do Frete**
- ✅ **Subtotal dos Produtos**: Valor claro dos produtos
- ✅ **FRETE**: Destacado com linha pontilhada e negrito
- ✅ **TOTAL GERAL**: Linha dupla e fonte maior para destaque

### 3. **Separação Visual**
- Linha pontilhada separa o frete do subtotal
- Linha dupla separa o total geral
- Espaçamento adequado entre seções

### 4. **Clareza na Informação**
- "ITEM" deixa claro que são códigos sequenciais
- "Subtotal dos Produtos" deixa claro que é apenas produtos
- "FRETE" em maiúsculo e negrito para destaque
- "TOTAL GERAL" com fonte maior para o valor final

### 5. **Compatibilidade**
- Funciona em impressoras 58mm e 80mm
- Layout responsivo e profissional
- Fonte Courier para compatibilidade térmica

## Campos da Empresa Configuráveis

A nota agora exibe corretamente:
- ✅ **Nome da Empresa** (configurável)
- ✅ **Endereço Completo** (configurável)
- ✅ **CNPJ** (configurável via admin)
- ✅ **Telefone** (configurável)
- ✅ **E-mail** (configurável via admin)

## Como Configurar

1. Acesse a tela de **Configurações** no admin
2. Preencha os campos:
   - Nome da Empresa
   - E-mail da Empresa
   - CNPJ da Empresa
   - Demais dados de endereço
3. Salve as configurações
4. As próximas notas fiscais já sairão com os dados corretos

## Resultado Final

A nota fiscal agora apresenta uma formatação **100% profissional** com:
- Códigos sequenciais organizados (1, 2, 3...)
- Frete claramente destacado
- Total geral bem visível
- Dados da empresa completos
- Layout compatível com impressoras térmicas
- QR Code para consulta da NFC-e 