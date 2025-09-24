#!/bin/bash

# Script de deploy para EasyPanel
echo "🚀 Iniciando deploy da API..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: package.json não encontrado. Execute este script no diretório raiz da API."
    exit 1
fi

# Limpar builds anteriores
echo "🧹 Limpando builds anteriores..."
rm -rf dist/
rm -rf node_modules/.cache/

# Verificar se o TypeScript está instalado
echo "🔍 Verificando dependências..."
if ! command -v tsc &> /dev/null; then
    echo "📦 Instalando TypeScript..."
    npm install -g typescript
fi

# Build do projeto
echo "🔨 Fazendo build do projeto..."
npm run build

# Verificar se o build foi bem-sucedido
if [ ! -d "dist" ]; then
    echo "❌ Erro: Build falhou. Diretório dist não foi criado."
    exit 1
fi

# Verificar se o arquivo principal existe
if [ ! -f "dist/index.js" ]; then
    echo "❌ Erro: Arquivo dist/index.js não foi criado."
    exit 1
fi

echo "✅ Build concluído com sucesso!"
echo "📁 Arquivos gerados em: dist/"
echo "🎯 Arquivo principal: dist/index.js"

# Verificar health check
if [ -f "health-check.js" ]; then
    echo "✅ Health check configurado"
else
    echo "⚠️  Health check não encontrado"
fi

echo "🚀 Deploy pronto para o EasyPanel!"
