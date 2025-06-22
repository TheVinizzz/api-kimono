FROM node:18-alpine

# Definir variáveis de ambiente para otimização
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

WORKDIR /app

# Instalar dependências necessárias para compilação
RUN apk add --no-cache python3 make g++ git

# Copiar arquivos de dependências primeiro (cache layer)
COPY package.json package-lock.json ./

# Instalar todas as dependências (dev + prod) para build
RUN npm ci --ignore-scripts && npm cache clean --force

# Copiar código fonte
COPY . .

# Instalar bcrypt compatível
RUN npm uninstall bcrypt 2>/dev/null || true && npm install bcryptjs

# Gerar Prisma client
RUN npx prisma generate

# Compilar TypeScript
RUN npx tsc --skipLibCheck

# Remover dependências de desenvolvimento após build
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