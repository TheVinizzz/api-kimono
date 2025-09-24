FROM node:18-alpine

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache python3 make g++

# Copiar arquivos de configuração primeiro (para cache de dependências)
COPY package*.json tsconfig.json ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Copiar código fonte
COPY . .

# Gerar Prisma client
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# Limpar arquivos desnecessários e reinstalar apenas produção
RUN rm -rf src/ && npm ci --only=production && npm cache clean --force

# Definir variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=4000

# Expor porta
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node health-check.js || exit 1

# Comando para iniciar a aplicação
CMD ["node", "dist/index.js"] 