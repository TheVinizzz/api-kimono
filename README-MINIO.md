# MinIO - Sistema de Upload de Imagens

Este documento descreve como usar o sistema de upload de imagens integrado com MinIO no Shopping API.

## Configuração

### Variáveis de Ambiente

Adicione as seguintes variáveis no seu arquivo `.env`:

```env
MINIO_URL=https://shop-shop.9kbfkm.easypanel.host
MINIO_PUBLIC_URL=https://shop-shop.9kbfkm.easypanel.host
MINIO_PUBLIC_KEY=sua_access_key
MINIO_SECRET_KEY=sua_secret_key
MINIO_BUCKET=shopping-images
```

### Dependências

As seguintes dependências são necessárias:

```json
{
  "@aws-sdk/client-s3": "^3.832.0",
  "@aws-sdk/s3-request-presigner": "^3.832.0",
  "multer": "^1.4.5-lts.1",
  "uuid": "^11.1.0",
  "@types/multer": "^1.4.12",
  "@types/uuid": "^10.0.0"
}
```

## Endpoints Disponíveis

### 1. Upload de Imagem de Produto

**POST** `/api/upload/product`

- **Headers**: `Authorization: Bearer <token>`
- **Body**: FormData com campo `image`
- **Resposta**:
```json
{
  "success": true,
  "fileUrl": "https://shop-shop.9kbfkm.easypanel.host/shopping-images/products/uuid-gerado.jpg",
  "fileName": "uuid-gerado.jpg",
  "originalName": "produto.jpg",
  "size": 1024,
  "mimetype": "image/jpeg"
}
```

### 2. Upload de Imagem de Categoria

**POST** `/api/upload/category`

- **Headers**: `Authorization: Bearer <token>`
- **Body**: FormData com campo `image`
- **Resposta**: Mesmo formato do produto, mas na pasta `categories`

### 3. Upload Múltiplo

**POST** `/api/upload/multiple`

- **Headers**: `Authorization: Bearer <token>`
- **Body**: FormData com campo `images[]` (múltiplos arquivos) e `folder` (opcional)
- **Resposta**:
```json
{
  "success": true,
  "files": [
    {
      "fileUrl": "https://shop-shop.9kbfkm.easypanel.host/shopping-images/misc/uuid1.jpg",
      "fileName": "uuid1.jpg",
      "originalName": "imagem1.jpg",
      "size": 1024,
      "mimetype": "image/jpeg"
    }
  ]
}
```

### 4. Listar Arquivos

**GET** `/api/upload/files?folder=products`

- **Headers**: `Authorization: Bearer <token>`
- **Query**: `folder` (opcional)
- **Resposta**:
```json
{
  "success": true,
  "files": [
    {
      "fileName": "products/uuid-arquivo.jpg",
      "url": "https://shop-shop.9kbfkm.easypanel.host/shopping-images/products/uuid-arquivo.jpg"
    }
  ]
}
```

### 5. Deletar Arquivo

**DELETE** `/api/upload/file/:fileName`

- **Headers**: `Authorization: Bearer <token>`
- **Params**: `fileName` - Nome do arquivo (incluindo pasta)
- **Resposta**:
```json
{
  "success": true,
  "message": "Arquivo deletado com sucesso"
}
```

### 6. Gerar URL de Upload Pré-assinada

**POST** `/api/upload/generate-url`

- **Headers**: `Authorization: Bearer <token>`
- **Body**:
```json
{
  "fileName": "products/meu-produto.jpg",
  "contentType": "image/jpeg"
}
```
- **Resposta**:
```json
{
  "success": true,
  "uploadUrl": "https://shop-shop.9kbfkm.easypanel.host/shopping-images/products/meu-produto.jpg?...",
  "publicUrl": "https://shop-shop.9kbfkm.easypanel.host/shopping-images/products/meu-produto.jpg"
}
```

## Estrutura de Pastas

O sistema organiza os arquivos em pastas:

- `products/` - Imagens de produtos
- `categories/` - Imagens de categorias
- `misc/` - Outros arquivos (upload múltiplo sem pasta específica)

## Limitações

- **Tamanho máximo**: 5MB por arquivo
- **Tipos permitidos**: Apenas imagens (image/*)
- **Upload múltiplo**: Máximo 10 arquivos por vez
- **Autenticação**: Obrigatória para todas as operações

## Exemplos de Uso

### Frontend - Upload de Produto

```javascript
const uploadProductImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('/api/upload/product', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  return response.json();
};
```

### Frontend - Upload Múltiplo

```javascript
const uploadMultipleImages = async (files, folder = 'misc') => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('images', file);
  });
  formData.append('folder', folder);

  const response = await fetch('/api/upload/multiple', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  return response.json();
};
```

## Tratamento de Erros

O sistema retorna erros padronizados:

```json
{
  "error": "Mensagem de erro específica"
}
```

Códigos de status comuns:
- `400`: Requisição inválida (arquivo não enviado, etc.)
- `401`: Não autorizado (token inválido)
- `500`: Erro interno do servidor

## Segurança

- Todas as rotas requerem autenticação JWT
- Validação de tipo de arquivo (apenas imagens)
- Limitação de tamanho de arquivo
- Geração de nomes únicos para evitar conflitos
- URLs sempre forçadas para HTTPS

## Configuração do MinIO

### Docker Compose

```yaml
version: '3.8'
services:
  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: password123
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

volumes:
  minio_data:
```

### Criação do Bucket

Após subir o MinIO, acesse `http://localhost:9001` e crie o bucket `shopping-images` ou configure para criação automática. 