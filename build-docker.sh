#!/bin/bash

# Script de build do Docker com fallback para diferentes imagens base

echo "🐳 Iniciando build do Docker..."

# Tentar com Node.js 20 Alpine primeiro
echo "📦 Tentando build com node:20-alpine..."
if docker build -t kimono-api:latest .; then
    echo "✅ Build bem-sucedido com node:20-alpine"
    exit 0
fi

echo "❌ Falha com node:20-alpine, tentando node:18-alpine..."

# Fallback para Node.js 18 Alpine
if docker build --build-arg NODE_VERSION=18-alpine -t kimono-api:latest .; then
    echo "✅ Build bem-sucedido com node:18-alpine"
    exit 0
fi

echo "❌ Falha com node:18-alpine, tentando node:20-slim..."

# Fallback para Node.js 20 Slim (Ubuntu-based)
cat > Dockerfile.slim << 'EOF'
FROM node:20-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copiar arquivos de configuração
COPY package*.json tsconfig.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Gerar Prisma client
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# Limpar cache npm
RUN npm cache clean --force

# Definir variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=4000

# Expor porta
EXPOSE 4000

# Comando para iniciar a aplicação
CMD ["npm", "start"]
EOF

if docker build -f Dockerfile.slim -t kimono-api:latest .; then
    echo "✅ Build bem-sucedido com node:20-slim"
    rm Dockerfile.slim
    exit 0
fi

echo "❌ Todas as tentativas de build falharam"
rm -f Dockerfile.slim
exit 1
