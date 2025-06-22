FROM node:18-alpine

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

WORKDIR /app

# Instalar dependências do sistema necessárias
RUN apk add --no-cache python3 make g++

# Copiar package.json e instalar dependências de produção
COPY package.json package-lock.json ./
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Copiar código já compilado (dist/) e outros arquivos necessários
COPY dist/ ./dist/
COPY prisma/ ./prisma/

# Instalar bcrypt compatível
RUN npm uninstall bcrypt 2>/dev/null || true && npm install bcryptjs

# Gerar Prisma client
RUN npx prisma generate

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"] 