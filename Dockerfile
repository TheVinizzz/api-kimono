FROM node:18-alpine

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache python3 make g++

# Copiar package files
COPY package*.json ./

# Instalar todas as dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Instalar bcryptjs (compatível com Alpine)
RUN npm uninstall bcrypt 2>/dev/null || true && npm install bcryptjs

# Gerar Prisma client
RUN npx prisma generate

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Definir ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expor porta
EXPOSE 4000

# Usar ts-node diretamente para evitar problemas de build
CMD ["npx", "ts-node", "src/index.ts"] 