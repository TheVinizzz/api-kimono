FROM node:18-alpine

# Definir variáveis de ambiente para otimização
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

WORKDIR /app

# Instalar dependências necessárias para compilação
RUN apk add --no-cache python3 make g++ git

# Copiar arquivos de dependências
COPY package.json package-lock.json ./

# Instalar dependências de produção apenas
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Copiar o restante dos arquivos
COPY . .

# Instalar dependências de dev temporariamente para build
RUN npm install --only=dev --ignore-scripts

# Instalar bcrypt de maneira compatível
RUN npm uninstall bcrypt && npm install bcryptjs

# Gerar os artefatos do Prisma
RUN npx prisma generate

# Compilar TypeScript para JavaScript
RUN npx tsc

# Remover dependências de dev após o build
RUN npm prune --production

# Remover arquivos de desenvolvimento
RUN rm -rf src/ tsconfig.json *.ts && \
    rm -rf node_modules/@types && \
    rm -rf node_modules/typescript && \
    rm -rf node_modules/ts-node

# Criar usuário não-root por segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Mudar ownership dos arquivos
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expor a porta da aplicação
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Comando para iniciar a aplicação
CMD ["node", "dist/index.js"] 