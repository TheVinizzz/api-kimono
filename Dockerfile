FROM node:18-alpine

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache python3 make g++

# Copiar arquivos de configuração
COPY package*.json tsconfig.json ./

# Instalar dependências
RUN npm ci --silent

# Copiar código fonte
COPY . .

# Instalar bcryptjs
RUN npm uninstall bcrypt 2>/dev/null || true && npm install bcryptjs --silent

# Gerar Prisma client
RUN npx prisma generate

# Compilar TypeScript OBRIGATORIAMENTE
RUN npx tsc

# Definir NODE_ENV como production
ENV NODE_ENV=production

# Remover devDependencies
RUN npm prune --production

# Expor porta
EXPOSE 4000

# Executar direto o JavaScript compilado
CMD ["node", "dist/index.js"] 