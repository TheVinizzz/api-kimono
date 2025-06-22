# 🧪 Exemplos de CURL - MinIO Shopping API

## 📋 Pré-requisitos

1. **Servidor rodando**: `npm run dev`
2. **Token de autenticação**: Faça login primeiro para obter o token

---

## 🔐 1. Login (Obter Token)

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "sua-senha"
  }'
```

**Resposta esperada:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "role": "ADMIN"
  }
}
```

> ⚠️ **Copie o token** da resposta para usar nos próximos comandos!

---

## 📤 2. Upload de Imagem de Produto

```bash
curl -X POST http://localhost:3001/api/upload/product \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -F "image=@/caminho/para/sua/imagem.jpg"
```

**Para testar sem arquivo real, crie um arquivo de teste:**
```bash
# Criar arquivo de teste
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" | base64 --decode > test-image.png

# Upload do arquivo
curl -X POST http://localhost:3001/api/upload/product \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -F "image=@test-image.png"
```

**Resposta esperada:**
```json
{
  "success": true,
  "fileUrl": "https://shop-shop.9kbfkm.easypanel.host/shopping-images/products/uuid-gerado.png",
  "fileName": "uuid-gerado.png",
  "originalName": "test-image.png",
  "size": 67,
  "mimetype": "image/png"
}
```

---

## 🏷️ 3. Upload de Imagem de Categoria

```bash
curl -X POST http://localhost:3001/api/upload/category \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -F "image=@test-image.png"
```

---

## 📦 4. Upload Múltiplo

```bash
# Criar mais arquivos de teste
cp test-image.png test-image-2.png
cp test-image.png test-image-3.png

# Upload múltiplo
curl -X POST http://localhost:3001/api/upload/multiple \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -F "images=@test-image.png" \
  -F "images=@test-image-2.png" \
  -F "images=@test-image-3.png" \
  -F "folder=misc"
```

**Resposta esperada:**
```json
{
  "success": true,
  "files": [
    {
      "fileUrl": "https://shop-shop.9kbfkm.easypanel.host/shopping-images/misc/uuid-1.png",
      "fileName": "uuid-1.png",
      "originalName": "test-image.png",
      "size": 67,
      "mimetype": "image/png"
    },
    // ... outros arquivos
  ]
}
```

---

## 📋 5. Listar Arquivos

### Listar todos os arquivos:
```bash
curl -X GET http://localhost:3001/api/upload/files \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Listar arquivos de uma pasta específica:
```bash
curl -X GET "http://localhost:3001/api/upload/files?folder=products" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Listar arquivos de categorias:
```bash
curl -X GET "http://localhost:3001/api/upload/files?folder=categories" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**Resposta esperada:**
```json
{
  "success": true,
  "files": [
    {
      "fileName": "products/uuid-arquivo.png",
      "url": "https://shop-shop.9kbfkm.easypanel.host/shopping-images/products/uuid-arquivo.png"
    }
  ]
}
```

---

## 🗑️ 6. Deletar Arquivo

```bash
curl -X DELETE http://localhost:3001/api/upload/file/products%2Fuuid-arquivo.png \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

> **Nota**: `%2F` é a codificação URL para `/` (barra)
> Para arquivo `products/uuid-arquivo.png` → `products%2Fuuid-arquivo.png`

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Arquivo deletado com sucesso"
}
```

---

## 🔗 7. Gerar URL de Upload Pré-assinada

```bash
curl -X POST http://localhost:3001/api/upload/generate-url \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "products/meu-produto-especial.jpg",
    "contentType": "image/jpeg"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "uploadUrl": "https://shop-shop.9kbfkm.easypanel.host/shopping-images/products/meu-produto-especial.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
  "publicUrl": "https://shop-shop.9kbfkm.easypanel.host/shopping-images/products/meu-produto-especial.jpg"
}
```

---

## 🔧 Para usar no Insomnia:

### 1. **Criar Environment:**
```json
{
  "base_url": "http://localhost:3001",
  "token": "seu_token_aqui"
}
```

### 2. **Request de Login:**
- **Method**: `POST`
- **URL**: `{{base_url}}/api/auth/login`
- **Body** (JSON):
```json
{
  "email": "admin@example.com",
  "password": "sua-senha"
}
```

### 3. **Request de Upload:**
- **Method**: `POST`
- **URL**: `{{base_url}}/api/upload/product`
- **Headers**: `Authorization: Bearer {{token}}`
- **Body** (Multipart Form):
  - `image`: [Arquivo de imagem]

### 4. **Request de Listar:**
- **Method**: `GET`
- **URL**: `{{base_url}}/api/upload/files?folder=products`
- **Headers**: `Authorization: Bearer {{token}}`

---

## 🎯 Sequência de Teste Rápido:

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"sua-senha"}' | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token: $TOKEN"

# 2. Criar arquivo de teste
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" | base64 --decode > test.png

# 3. Upload
curl -X POST http://localhost:3001/api/upload/product \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@test.png"

# 4. Listar
curl -X GET http://localhost:3001/api/upload/files \
  -H "Authorization: Bearer $TOKEN"

# 5. Cleanup
rm test.png
```

---

## ❌ Possíveis Erros:

### 401 - Unauthorized
```json
{"error": "Acesso não autorizado"}
```
**Solução**: Verifique se o token está correto e não expirado.

### 400 - Bad Request
```json
{"error": "Nenhum arquivo foi enviado"}
```
**Solução**: Certifique-se de enviar o arquivo com o campo correto (`image`).

### 500 - Internal Server Error
```json
{"error": "Erro interno do servidor ao fazer upload da imagem"}
```
**Solução**: Verifique as configurações do MinIO no `.env` e se o MinIO está acessível.

---

**✅ Copie e cole esses comandos no Insomnia para testar!** 