#!/bin/sh

echo "🚀 Iniciando Kimono API..."
echo "📍 NODE_ENV: ${NODE_ENV:-development}"
echo "🔌 PORT: ${PORT:-4000}"

# Verificar se existe dist/index.js
if [ -f "dist/index.js" ]; then
    echo "✅ Usando versão compilada (dist/index.js)"
    exec node dist/index.js
else
    echo "⚠️  dist/index.js não encontrado"
    
    # Verificar se conseguimos compilar
    if [ -f "src/index.ts" ] && command -v tsc >/dev/null 2>&1; then
        echo "🔨 Tentando compilar TypeScript..."
        if tsc --skipLibCheck --outDir dist src/index.ts; then
            echo "✅ Compilação bem-sucedida"
            exec node dist/index.js
        else
            echo "❌ Falha na compilação"
        fi
    fi
    
    # Fallback para ts-node
    if [ -f "src/index.ts" ]; then
        echo "🔄 Usando ts-node como fallback"
        exec npx ts-node src/index.ts
    else
        echo "❌ Nenhum arquivo de entrada encontrado"
        exit 1
    fi
fi 