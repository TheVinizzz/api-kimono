# 🔄 API Bling - Rotas e Endpoints

## 📋 Visão Geral

A API possui rotas completas para integração com o Bling, incluindo autenticação OAuth 2.0, sincronização de dados e testes de conectividade.

**Base URL:** `http://localhost:5000/api/bling`

## 🔐 Rotas de OAuth e Testes

### 1. **Verificar Status OAuth**
```http
GET /api/bling/oauth/status
```

**Descrição:** Verifica se a autenticação OAuth está válida.

**Resposta de Sucesso:**
```json
{
  "success": true,
  "authenticated": true,
  "message": "Autenticação OAuth válida",
  "tokenInfo": {
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "tokenType": "Bearer",
    "hasRefreshToken": true
  }
}
```

**Resposta sem Autenticação:**
```json
{
  "success": false,
  "authenticated": false,
  "message": "Nenhum token OAuth encontrado. Execute a autenticação primeiro.",
  "authUrl": "Execute: node scripts/bling-oauth-complete.js"
}
```

### 2. **Testar Conectividade**
```http
GET /api/bling/test/connection
```

**Descrição:** Testa a conectividade com a API do Bling.

**Resposta de Sucesso:**
```json
{
  "success": true,
  "connected": true,
  "message": "Conexão com Bling estabelecida com sucesso",
  "data": {
    "apiStatus": "OK",
    "responseTime": "2024-01-15T10:30:00.000Z",
    "company": {
      "name": "Sua Empresa Ltda",
      "email": "contato@empresa.com",
      "id": 12345
    },
    "tokenInfo": {
      "type": "Bearer",
      "expiresAt": "2024-12-31T23:59:59.000Z",
      "hasRefreshToken": true
    }
  }
}
```

## 📊 Rotas de Dados

### 3. **Obter Todos os Dados do Bling**
```http
GET /api/bling/data
```

**Parâmetros de Query (opcionais):**
- `includeCompany` (boolean) - Incluir dados da empresa (padrão: true)
- `includeProducts` (boolean) - Incluir produtos (padrão: true)
- `includeCategories` (boolean) - Incluir categorias (padrão: true)
- `includeOrders` (boolean) - Incluir pedidos (padrão: true)
- `includeContacts` (boolean) - Incluir contatos (padrão: true)
- `includeStock` (boolean) - Incluir estoque (padrão: true)
- `productLimit` (number) - Limite de produtos (padrão: 20)
- `orderLimit` (number) - Limite de pedidos (padrão: 10)
- `contactLimit` (number) - Limite de contatos (padrão: 10)

**Exemplo:**
```http
GET /api/bling/data?includeProducts=true&productLimit=50&includeOrders=false
```

**Resposta:**
```json
{
  "success": true,
  "message": "Dados do Bling obtidos com sucesso",
  "data": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "authenticated": true,
    "company": {
      "id": 12345,
      "nome": "Sua Empresa Ltda",
      "email": "contato@empresa.com"
    },
    "products": {
      "items": [...],
      "pagination": {...}
    },
    "categories": {
      "items": [...],
      "pagination": null
    },
    "orders": {
      "items": [...],
      "pagination": {...}
    },
    "summary": {
      "companyConfigured": true,
      "totalProducts": 45,
      "totalCategories": 8,
      "totalOrders": 23,
      "totalContacts": 156,
      "totalStockItems": 45
    }
  }
}
```

### 4. **Obter Produtos Detalhados**
```http
GET /api/bling/data/products
```

**Parâmetros de Query (opcionais):**
- `page` (number) - Página (padrão: 1)
- `limit` (number) - Limite por página (padrão: 20)
- `search` (string) - Buscar por nome ou código
- `category` (string) - Filtrar por categoria
- `active` (boolean) - Filtrar por status ativo

**Exemplo:**
```http
GET /api/bling/data/products?page=1&limit=10&search=kimono&active=true
```

**Resposta:**
```json
{
  "success": true,
  "message": "10 produtos encontrados",
  "data": {
    "products": [
      {
        "id": 12345,
        "name": "Kimono Tradicional",
        "code": "KIM001",
        "price": 299.90,
        "stock": 15,
        "virtualStock": 15,
        "category": "Roupas",
        "active": true,
        "imageUrl": "https://...",
        "description": "Kimono tradicional japonês",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "pages": 5
    },
    "filters": {
      "page": 1,
      "limit": 10,
      "search": "kimono",
      "category": "",
      "active": "true"
    }
  }
}
```

## 🔄 Rotas de Sincronização

### 5. **Sincronizar Estoque do Bling**
```http
PUT /api/bling/sync/stock/{productId}
```

**Descrição:** Sincroniza o estoque de um produto específico do Bling para o sistema local.

**Parâmetros:**
- `productId` (path) - ID do produto no Bling

**Exemplo:**
```http
PUT /api/bling/sync/stock/12345
```

**Resposta:**
```json
{
  "success": true,
  "message": "Estoque sincronizado com sucesso",
  "data": {
    "productId": 1,
    "productName": "Kimono Tradicional",
    "oldStock": 10,
    "newStock": 15,
    "blingData": {
      "id": 12345,
      "name": "Kimono Tradicional",
      "price": 299.90,
      "stock": 15
    }
  }
}
```

## 🔒 Rotas Protegidas (Requerem Autenticação Admin)

### 6. **Sincronizar Produto para Bling**
```http
POST /api/bling/sync/product/{id}
```

### 7. **Sincronizar Todos os Produtos**
```http
POST /api/bling/sync/products/all
```

### 8. **Sincronizar Pedido**
```http
POST /api/bling/sync/order/{id}
```

### 9. **Obter Configurações**
```http
GET /api/bling/config
```

### 10. **Atualizar Configurações**
```http
PUT /api/bling/config
```

### 11. **Listar Produtos do Bling (Original)**
```http
GET /api/bling/products
```

### 12. **Listar Pedidos do Bling**
```http
GET /api/bling/orders
```

### 13. **Obter Estoque de Produto**
```http
GET /api/bling/products/{id}/stock
```

## 🎯 Como Usar

### 1. **Primeiro Passo: Autenticar**
```bash
# Execute o script OAuth
cd api
node scripts/bling-oauth-complete.js
```

### 2. **Verificar Status**
```bash
curl http://localhost:5000/api/bling/oauth/status
```

### 3. **Testar Conectividade**
```bash
curl http://localhost:5000/api/bling/test/connection
```

### 4. **Obter Dados Completos**
```bash
curl http://localhost:5000/api/bling/data
```

### 5. **Obter Apenas Produtos**
```bash
curl "http://localhost:5000/api/bling/data/products?limit=10&active=true"
```

## ⚠️ Tratamento de Erros

### Erro de Autenticação
```json
{
  "success": false,
  "message": "Token OAuth inválido ou expirado",
  "authRequired": true
}
```

### Erro de Conexão
```json
{
  "success": false,
  "connected": false,
  "message": "Falha na conexão com Bling",
  "statusCode": 500
}
```

### Erro Interno
```json
{
  "success": false,
  "message": "Erro interno do servidor",
  "error": "Detalhes do erro..."
}
```

## 🚀 Próximos Passos

1. **Execute a autenticação OAuth:** `node scripts/bling-oauth-complete.js`
2. **Teste as rotas** usando Postman, Insomnia ou curl
3. **Integre com o frontend** para exibir dados do Bling
4. **Configure sincronização automática** usando as rotas protegidas

## 📝 Notas Importantes

- ✅ **Rotas de teste são públicas** para facilitar desenvolvimento
- ✅ **Renovação automática** de tokens implementada
- ✅ **Tratamento robusto** de erros e timeouts
- ✅ **Dados formatados** e enriquecidos para facilitar uso
- ✅ **Filtros e paginação** implementados
- ✅ **Logs detalhados** para debugging 