# 🐳 Docker - API Kimono

## Como usar

### 1. Construir a imagem Docker
```bash
docker build -f Dockerfile.simple -t kimono-api:simple .
```

### 2. Rodar o container
```bash
chmod +x run-docker.sh
./run-docker.sh
```

**OU manualmente:**
```bash
docker run -d --name kimono-api -p 4000:4000 kimono-api:simple
```

### 3. Verificar se está funcionando
- API: http://localhost:4000
- Health check: http://localhost:4000/api/health

## Comandos úteis

```bash
# Ver logs
docker logs -f kimono-api

# Parar container
docker stop kimono-api

# Remover container
docker rm kimono-api

# Ver containers rodando
docker ps

# Entrar no container
docker exec -it kimono-api sh
```

## Para Easypanel

Use o **Dockerfile.simple** que é mais direto e funcional.

### Variáveis de ambiente necessárias:
- `DATABASE_URL`
- `JWT_SECRET`
- `API_KEY`
- `MERCADOPAGO_ACCESS_TOKEN`
- `BLING_CLIENT_ID`
- `BLING_CLIENT_SECRET`
- `AWS_ACCESS_KEY_ID` (opcional)
- `AWS_SECRET_ACCESS_KEY` (opcional)
- `AWS_REGION` (opcional)
- `AWS_BUCKET_NAME` (opcional)

### Porta
A API roda na porta **4000** 