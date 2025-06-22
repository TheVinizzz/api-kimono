FROM node:18-alpine

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache python3 make g++

# Copiar package files
COPY package*.json ./

# Instalar todas as dependências (incluindo dev para build)
RUN npm ci

# Copiar código fonte
COPY . .

# Instalar bcryptjs (compatível com Alpine)
RUN npm uninstall bcrypt 2>/dev/null || true && npm install bcryptjs

# Gerar Prisma client
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# Remover devDependencies para produção
RUN npm prune --production

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Definir ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expor porta
EXPOSE 4000

# Comando de inicialização
CMD ["npm", "start"] 