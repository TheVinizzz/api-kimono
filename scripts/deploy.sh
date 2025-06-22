#!/bin/bash

set -e

echo "🚀 Iniciando processo de deploy..."

# Limpar build anterior
echo "🧹 Limpando build anterior..."
rm -rf dist/

# Instalar dependências
echo "📦 Instalando dependências..."
npm ci

# Compilar TypeScript
echo "🔨 Compilando TypeScript..."
npm run build

# Verificar build
echo "✅ Verificando build..."
npm run verify

# Gerar Prisma client
echo "🔧 Gerando Prisma client..."
npx prisma generate

echo "✅ Build concluído com sucesso!"
echo "📁 Arquivos prontos para deploy:"
ls -la dist/

echo "🎯 Agora você pode fazer o deploy no Easypanel"
echo "   Os arquivos estão compilados e prontos em ./dist/" 