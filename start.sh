#!/bin/sh

echo "🚀 Iniciando Kimono API..."

# Verificar se existe dist/index.js
if [ -f "dist/index.js" ]; then
    echo "✅ Usando versão compilada"
    exec node dist/index.js
else
    echo "⚠️  Versão compilada não encontrada, tentando compilar..."
    
    # Tentar compilar se tsc estiver disponível
    if command -v tsc >/dev/null 2>&1; then
        echo "🔨 Compilando TypeScript..."
        tsc --skipLibCheck || echo "❌ Falha na compilação, usando ts-node"
    fi
    
    # Se compilou com sucesso, usar versão compilada
    if [ -f "dist/index.js" ]; then
        echo "✅ Compilação bem-sucedida, usando versão compilada"
        exec node dist/index.js
    else
        echo "🔄 Usando ts-node como fallback"
        exec npx ts-node src/index.ts
    fi
fi 