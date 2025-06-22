# 🚀 Configuração do MinIO - Shopping API

## URL do MinIO
Sua instância MinIO está rodando em: `https://shop-shop.9kbfkm.easypanel.host`

## 📋 Passo a Passo

### 1. Configurar Variáveis de Ambiente

Adicione no seu arquivo `.env`:

```env
# MinIO Configuration
MINIO_URL=https://shop-shop.9kbfkm.easypanel.host
MINIO_PUBLIC_URL=https://shop-shop.9kbfkm.easypanel.host
MINIO_PUBLIC_KEY=sua_access_key_aqui
MINIO_SECRET_KEY=sua_secret_key_aqui
MINIO_BUCKET=shopping-images
```

### 2. Obter as Credenciais do EasyPanel

1. **Acesse seu projeto no EasyPanel**
2. **Vá para o serviço MinIO**
3. **Nas configurações, procure por:**
   - `Access Key` → cole em `MINIO_PUBLIC_KEY`
   - `Secret Key` → cole em `MINIO_SECRET_KEY`

### 3. Testar a Conexão

Execute o script de teste:

```bash
node test-minio.js
```

**Exemplo de saída esperada:**
```
🔍 Testando conexão com MinIO...

📋 Teste 1: Listando buckets...
✅ Buckets encontrados: ['shopping-images', 'outros-buckets']

🪣 Teste 2: Verificando bucket 'shopping-images'...
✅ Bucket 'shopping-images' existe!

📤 Teste 3: Teste de upload...
✅ Upload de teste realizado com sucesso!

📋 Teste 4: Listando objetos no bucket...
✅ Objetos encontrados: ['test/test-file.txt']

🔗 Teste 5: Gerando URL pública...
✅ URL pública: https://shop-shop.9kbfkm.easypanel.host/shopping-images/test/test-file.txt

🧹 Teste 6: Removendo arquivo de teste...
✅ Arquivo de teste removido!

🎉 Todos os testes passaram! MinIO está configurado corretamente.
```

### 4. Criar o Bucket (se necessário)

Se o bucket `shopping-images` não existir, você pode:

**Opção A - Via Interface Web do MinIO:**
1. Acesse `https://shop-shop.9kbfkm.easypanel.host` no navegador
2. Faça login com suas credenciais
3. Clique em "Create Bucket"
4. Nome: `shopping-images`
5. Deixe as configurações padrão

**Opção B - O script de teste criará automaticamente** se não existir.

### 5. Testar Upload via API

Com o servidor rodando (`npm run dev`), teste o upload:

```bash
# Primeiro, faça login para obter o token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "seu-email", "password": "sua-senha"}'

# Use o token retornado para fazer upload
curl -X POST http://localhost:3001/api/upload/product \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -F "image=@caminho/para/sua/imagem.jpg"
```

### 6. URLs das Imagens

Após o upload, as imagens ficarão disponíveis em:
- **Produtos**: `https://shop-shop.9kbfkm.easypanel.host/shopping-images/products/nome-do-arquivo.jpg`
- **Categorias**: `https://shop-shop.9kbfkm.easypanel.host/shopping-images/categories/nome-do-arquivo.jpg`

## 🔧 Solução de Problemas

### Erro: "Access Denied"
- Verifique se `MINIO_PUBLIC_KEY` e `MINIO_SECRET_KEY` estão corretas
- Certifique-se que as credenciais têm permissões de leitura/escrita

### Erro: "Network Error" ou "Connection Refused"
- Verifique se `MINIO_URL` está correta: `https://shop-shop.9kbfkm.easypanel.host`
- Teste se o MinIO está acessível no navegador

### Erro: "Bucket does not exist"
- Execute o script de teste que criará o bucket automaticamente
- Ou crie manualmente via interface web do MinIO

### Erro: "Invalid signature"
- Verifique se não há espaços extras nas variáveis de ambiente
- Confirme se as credenciais estão corretas

## 📝 Estrutura Final

Após configurar, sua estrutura de pastas no MinIO será:

```
shopping-images/
├── products/
│   ├── uuid-1234.jpg
│   ├── uuid-5678.png
│   └── ...
├── categories/
│   ├── uuid-abcd.jpg
│   └── ...
└── misc/
    └── outros arquivos...
```

## ✅ Checklist de Configuração

- [ ] Variáveis de ambiente configuradas no `.env`
- [ ] Credenciais obtidas do EasyPanel
- [ ] Script de teste executado com sucesso
- [ ] Bucket `shopping-images` criado
- [ ] Upload de teste via API funcionando
- [ ] URLs das imagens acessíveis

**Pronto! Seu MinIO está configurado e pronto para uso! 🎉** 