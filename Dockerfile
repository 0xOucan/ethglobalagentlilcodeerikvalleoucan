FROM --platform=linux/arm64 node:20-alpine

WORKDIR /app

# Instalar dependencias del sistema
RUN apk add --no-cache python3 make g++

# Copiar archivos de proyecto
COPY package*.json ./
COPY tsconfig.json ./
COPY . .

# Instalar dependencias y construir
RUN npm ci
RUN npm run build

# Limpiar dependencias de desarrollo
RUN npm prune --production

# Configuración de usuario y volumen
RUN mkdir -p /app/data && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser && \
    chown -R nodeuser:nodejs /app

USER nodeuser

ENV NODE_ENV=production

VOLUME ["/app/data"]

CMD ["node", "dist/chatbot.js"] 