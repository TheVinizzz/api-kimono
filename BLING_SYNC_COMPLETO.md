# 🔄 Bling Sync - Sincronização Completa com Banco de Dados

## 📋 **O QUE FOI IMPLEMENTADO**

Sistema completo para **sincronizar produtos e estoque do Bling com seu banco de dados PostgreSQL**, incluindo:

- ✅ **Sincronização de Produtos** → Nome, preço, descrição, imagens
- ✅ **Sincronização de Estoque** → Quantidades em tempo real
- ✅ **Sincronização de Categorias** → Organização automática
- ✅ **Sincronização de Variações** → Tamanhos, preços, SKUs
- ✅ **Preview Mode (Dry Run)** → Testar antes de aplicar
- ✅ **Limpeza Automática** → Remove dados órfãos
- ✅ **Logs Detalhados** → Acompanhar todo o processo

---

## 🚀 **COMO USAR - PASSO A PASSO**

### **1. Pré-requisitos**
```bash
# Certifique-se que a autenticação OAuth está configurada
curl http://localhost:4000/api/bling-oauth/auth/status

# Se não estiver autenticado, faça primeiro:
curl http://localhost:4000/api/bling-oauth/auth/url
# Abra a URL no navegador e autorize
```

### **2. Preview da Sincronização (Recomendado)**
```bash
# Ver o que será sincronizado SEM alterar o banco
curl "http://localhost:4000/api/bling-sync/preview?limit=10"
```

### **3. Sincronização Completa**
```bash
# Sincronizar TUDO: produtos + categorias + estoque
curl -X POST "http://localhost:4000/api/bling-sync/all"

# Com opções específicas
curl -X POST "http://localhost:4000/api/bling-sync/all?limit=50&syncStock=true"
```

### **4. Sincronizações Específicas**
```bash
# Apenas produtos
curl -X POST "http://localhost:4000/api/bling-sync/products"

# Apenas estoque
curl -X POST "http://localhost:4000/api/bling-sync/stock"

# Apenas categorias
curl -X POST "http://localhost:4000/api/bling-sync/categories"
```

### **5. Verificar Status**
```bash
# Status do banco e estatísticas
curl http://localhost:4000/api/bling-sync/status
```

---

## 🔧 **ROTAS DISPONÍVEIS**

### **📊 Status e Preview**
```bash
GET  /api/bling-sync/status     # Status do banco e estatísticas
GET  /api/bling-sync/preview    # Preview sem alterar dados
```

### **🔄 Sincronização**
```bash
POST /api/bling-sync/all        # Sincronização completa
POST /api/bling-sync/products   # Apenas produtos
POST /api/bling-sync/stock      # Apenas estoque
POST /api/bling-sync/categories # Apenas categorias
```

### **🧹 Manutenção**
```bash
POST /api/bling-sync/cleanup    # Limpar dados órfãos
```

---

## ⚙️ **PARÂMETROS DISPONÍVEIS**

### **Sincronização Completa**
```bash
curl -X POST "http://localhost:4000/api/bling-sync/all?syncProducts=true&syncCategories=true&syncStock=true&dryRun=false&limit=100"
```

**Parâmetros:**
- `syncProducts=true/false` - Sincronizar produtos
- `syncCategories=true/false` - Sincronizar categorias  
- `syncStock=true/false` - Sincronizar estoque
- `dryRun=true/false` - Modo preview (não altera dados)
- `limit=100` - Limite de produtos por sincronização

### **Sincronização de Estoque**
```bash
curl -X POST "http://localhost:4000/api/bling-sync/stock?dryRun=false&productIds=123,456,789"
```

**Parâmetros:**
- `dryRun=true/false` - Modo preview
- `productIds=123,456` - IDs específicos do Bling (opcional)

---

## 📊 **EXEMPLOS DE RESPOSTA**

### **Status do Sistema**
```json
{
  "success": true,
  "message": "Status da sincronização obtido com sucesso",
  "database": {
    "products": 150,
    "categories": 12,
    "variants": 45,
    "images": 89,
    "recentlyUpdated": 5
  },
  "availableEndpoints": {
    "syncAll": "POST /api/bling-sync/all",
    "syncProducts": "POST /api/bling-sync/products",
    "preview": "GET /api/bling-sync/preview"
  }
}
```

### **Sincronização Completa**
```json
{
  "success": true,
  "message": "✅ Sincronização concluída: 25 produtos e 8 categorias",
  "stats": {
    "totalProducts": 25,
    "syncedProducts": 23,
    "syncedCategories": 8,
    "errors": 0,
    "skipped": 2
  },
  "details": {
    "products": [
      {
        "blingId": 123,
        "name": "Kimono Premium Branco",
        "status": "created"
      },
      {
        "blingId": 124,
        "name": "Kimono Tradicional Azul", 
        "status": "updated"
      }
    ],
    "categories": [
      {
        "blingId": 10,
        "name": "Kimonos",
        "status": "created"
      }
    ]
  }
}
```

### **Preview Mode**
```json
{
  "success": true,
  "message": "Preview da sincronização executado com sucesso",
  "preview": true,
  "note": "Este é apenas um preview. Nenhum dado foi alterado no banco.",
  "stats": {
    "totalProducts": 10,
    "syncedProducts": 8,
    "syncedCategories": 3,
    "errors": 0,
    "skipped": 2
  }
}
```

---

## 🎯 **FLUXO RECOMENDADO**

### **Primeira Sincronização**
```bash
# 1. Verificar status
curl http://localhost:4000/api/bling-sync/status

# 2. Fazer preview
curl "http://localhost:4000/api/bling-sync/preview?limit=5"

# 3. Sincronização completa
curl -X POST "http://localhost:4000/api/bling-sync/all?limit=50"

# 4. Verificar resultado
curl http://localhost:4000/api/bling-sync/status
```

### **Sincronizações Diárias**
```bash
# Apenas estoque (mais rápido)
curl -X POST "http://localhost:4000/api/bling-sync/stock"

# Ou produtos novos
curl -X POST "http://localhost:4000/api/bling-sync/products?limit=20"
```

### **Manutenção Semanal**
```bash
# Limpeza de dados órfãos
curl -X POST "http://localhost:4000/api/bling-sync/cleanup"

# Sincronização completa
curl -X POST "http://localhost:4000/api/bling-sync/all"
```

---

## 🔄 **MAPEAMENTO BLING → BANCO**

### **Produtos**
| Bling | Banco (Product) | Observações |
|-------|-----------------|-------------|
| `nome` | `name` | Nome do produto |
| `preco` | `price` | Preço principal |
| `descricao` | `description` | Descrição completa |
| `estoques[0].saldoFisico` | `stock` | Estoque físico |
| `imagemURL` | `imageUrl` | Imagem principal |
| `categoria.descricao` | `category.name` | Categoria |

### **Variações**
| Bling | Banco (ProductVariant) | Observações |
|-------|------------------------|-------------|
| `variacao.nome` | `size` | Tamanho/variação |
| `variacao.preco` | `price` | Preço da variação |
| `variacao.estoque` | `stock` | Estoque da variação |
| `variacao.codigo` | `sku` | Código único |

### **Categorias**
| Bling | Banco (Category) | Observações |
|-------|------------------|-------------|
| `categoria.descricao` | `name` | Nome da categoria |
| `categoria.id` | `description` | ID do Bling na descrição |

---

## 🛠️ **TROUBLESHOOTING**

### **Erro: "Não foi possível obter um token válido"**
```bash
# Solução: Reautenticar no Bling
curl http://localhost:4000/api/bling-oauth/auth/url
# Abrir URL e autorizar
```

### **Erro: "Database connection failed"**
```bash
# Verificar conexão do banco
curl http://localhost:4000/api/health

# Verificar variáveis de ambiente
echo $DATABASE_URL
```

### **Muitos produtos para sincronizar**
```bash
# Usar limite menor
curl -X POST "http://localhost:4000/api/bling-sync/all?limit=20"

# Ou sincronizar por partes
curl -X POST "http://localhost:4000/api/bling-sync/products?limit=50"
curl -X POST "http://localhost:4000/api/bling-sync/stock"
```

### **Dados duplicados**
```bash
# Limpeza automática
curl -X POST "http://localhost:4000/api/bling-sync/cleanup"
```

---

## 📈 **MONITORAMENTO**

### **Logs Detalhados**
O sistema gera logs completos no console:
```
🚀 Iniciando sincronização completa do Bling...
📂 Sincronizando categorias...
✅ Categoria sincronizada: Kimonos
📦 Sincronizando produtos...
✅ Produto criado: Kimono Premium Branco
✅ Produto atualizado: Kimono Tradicional Azul
✅ Sincronização completa finalizada!
```

### **Estatísticas em Tempo Real**
```bash
# Status detalhado
curl http://localhost:4000/api/bling-sync/status

# Resposta inclui:
# - Total de produtos no banco
# - Produtos atualizados nas últimas 24h
# - Categorias, variações, imagens
# - Endpoints disponíveis
```

---

## 🎉 **RESULTADO FINAL**

### **O QUE VOCÊ TEM AGORA:**
- ✅ **Sincronização completa** → Bling → Banco PostgreSQL
- ✅ **Produtos atualizados** → Nome, preço, estoque, imagens
- ✅ **Categorias organizadas** → Estrutura automática
- ✅ **Variações suportadas** → Tamanhos, preços, SKUs
- ✅ **Preview mode** → Testar sem riscos
- ✅ **Logs detalhados** → Acompanhar processo
- ✅ **Limpeza automática** → Manutenção do banco
- ✅ **APIs RESTful** → Integração fácil

### **PRÓXIMOS PASSOS:**
1. Faça um preview: `GET /api/bling-sync/preview`
2. Execute sincronização: `POST /api/bling-sync/all`
3. Configure cron job para sincronização automática
4. Monitor com: `GET /api/bling-sync/status`

**Sistema de sincronização implementado com sucesso! 🎯** 