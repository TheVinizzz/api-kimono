#!/bin/bash

echo "🚀 Rodando API Kimono no Docker..."

# Parar container se estiver rodando
docker stop kimono-api 2>/dev/null
docker rm kimono-api 2>/dev/null

# Rodar container
docker run -d \
  --name kimono-api \
  -p 4000:4000 \
  kimono-api:simple

echo "✅ Container iniciado!"
echo "🌐 API disponível em: http://localhost:4000"
echo "📋 Health check: http://localhost:4000/api/health"
echo ""
echo "Para ver logs: docker logs -f kimono-api"
echo "Para parar: docker stop kimono-api" 