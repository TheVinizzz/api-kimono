#!/bin/bash

echo "🐳 Construindo e rodando a API Kimono..."

# Parar container se estiver rodando
echo "Parando container existente..."
docker stop kimono-api 2>/dev/null || true
docker rm kimono-api 2>/dev/null || true

# Construir imagem
echo "Construindo imagem Docker..."
docker build -f Dockerfile.simple -t kimono-api:simple .

if [ $? -ne 0 ]; then
    echo "❌ Erro ao construir a imagem"
    exit 1
fi

echo "✅ Imagem construída com sucesso!"

# Rodar container
echo "Iniciando container..."
docker run -d \
  --name kimono-api \
  -p 4000:4000 \
  -e NODE_ENV=production \
  -e PORT=4000 \
  kimono-api:simple

if [ $? -ne 0 ]; then
    echo "❌ Erro ao iniciar o container"
    exit 1
fi

echo "✅ Container iniciado com sucesso!"
echo "🚀 API rodando em: http://localhost:4000"
echo ""
echo "Comandos úteis:"
echo "  Ver logs: docker logs -f kimono-api"
echo "  Parar: docker stop kimono-api"
echo "  Status: docker ps | grep kimono-api"

# Aguardar alguns segundos e testar
echo ""
echo "Aguardando API inicializar..."
sleep 5

# Testar se está respondendo
if curl -s http://localhost:4000/api/health > /dev/null 2>&1; then
    echo "✅ API está respondendo!"
    echo "Health check: http://localhost:4000/api/health"
else
    echo "⚠️  API ainda não está respondendo, pode levar alguns segundos..."
    echo "Verifique os logs: docker logs kimono-api"
fi 