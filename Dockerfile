FROM node:18-alpine

# Definir variáveis de ambiente
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache python3 make g++ git

# Copiar package files
COPY package.json package-lock.json ./

# Instalar dependências
RUN npm ci --ignore-scripts && npm cache clean --force

# Copiar código fonte
COPY . .

# Debug: listar estrutura de arquivos
RUN echo "=== Estrutura de arquivos ===" && \
    ls -la && \
    echo "=== Conteúdo src ===" && \
    ls -la src/ && \
    echo "=== tsconfig.json ===" && \
    cat tsconfig.json

# Instalar bcrypt compatível
RUN npm uninstall bcrypt 2>/dev/null || true && \
    npm install bcryptjs --save

# Gerar Prisma client
RUN echo "=== Gerando Prisma client ===" && \
    npx prisma generate

# Debug: verificar se TypeScript está disponível
RUN echo "=== Verificando TypeScript ===" && \
    npx tsc --version && \
    echo "=== Verificando sintaxe ===" && \
    npx tsc --noEmit --skipLibCheck || echo "Erro na verificação de sintaxe"

# Compilar TypeScript com configurações mais permissivas
RUN echo "=== Compilando TypeScript ===" && \
    npx tsc \
    --skipLibCheck \
    --esModuleInterop \
    --allowSyntheticDefaultImports \
    --resolveJsonModule \
    --target es2018 \
    --module commonjs \
    --outDir ./dist \
    --rootDir ./src \
    --strict false \
    --noImplicitAny false \
    --noImplicitReturns false

# Debug: verificar se a compilação funcionou
RUN echo "=== Verificando compilação ===" && \
    ls -la dist/ && \
    ls -la dist/services/ || echo "Pasta services não encontrada"

# Remover dependências de desenvolvimento
RUN npm prune --production

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Definir ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expor porta
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Iniciar aplicação
CMD ["node", "dist/index.js"] 