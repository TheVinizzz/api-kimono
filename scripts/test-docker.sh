#!/bin/bash

set -e

echo "🐳 Testando build do Docker..."

# Build da imagem
echo "📦 Construindo imagem Docker..."
docker build -t shopping-api-test .

echo "✅ Build concluído com sucesso!"

# Testar se a imagem pode ser executada
echo "🚀 Testando execução da imagem..."
docker run --rm -d --name shopping-api-test-container \
  -p 4001:4000 \
  -e DATABASE_URL="postgresql://test:test@localhost:5432/test" \
  -e JWT_SECRET="test-secret" \
  -e MINIO_URL="http://localhost:9000" \
  -e MINIO_PUBLIC_KEY="test" \
  -e MINIO_SECRET_KEY="test" \
  -e MINIO_BUCKET="test" \
  shopping-api-test

echo "⏳ Aguardando container inicializar..."
sleep 10

# Testar health check
echo "🔍 Testando health check..."
if curl -f http://localhost:4001/health > /dev/null 2>&1; then
  echo "✅ Health check passou!"
else
  echo "❌ Health check falhou"
  docker logs shopping-api-test-container
fi

# Limpar
echo "🧹 Limpando container de teste..."
docker stop shopping-api-test-container || true

echo "🎉 Teste do Docker concluído!" 