FROM node:18-alpine

WORKDIR /app

# Definir NODE_ENV como production
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=256"

# Instalar dependências do sistema
RUN apk add --no-cache python3 make g++

# Copiar package files
COPY package*.json ./

# Instalar apenas dependências de produção primeiro
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Instalar bcryptjs (compatível com Alpine)
RUN npm uninstall bcrypt 2>/dev/null || true && npm install bcryptjs

# Gerar Prisma client (com fallback)
RUN npx prisma generate || echo "Prisma generate failed, continuing..."

# Instalar ts-node para produção se necessário
RUN npm install ts-node typescript

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Tornar o script executável
RUN chmod +x start.sh

# Definir ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expor porta
EXPOSE 4000

# Health check para EasyPanel
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Usar o script de inicialização
CMD ["./start.sh"] 