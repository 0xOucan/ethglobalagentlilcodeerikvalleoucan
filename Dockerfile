# Etapa de construcción
FROM node:20-slim AS builder

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar solo los archivos necesarios para instalar dependencias
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependencias incluyendo las de desarrollo
RUN npm ci

# Copiar el código fuente
COPY . .

# Compilar la aplicación TypeScript
RUN npm run build

# Etapa de producción
FROM node:20-slim AS production

# Establecer el directorio de trabajo
WORKDIR /app

# Crear directorio para datos persistentes
RUN mkdir -p /app/data

# Copiar solo los archivos necesarios desde la etapa de construcción
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.env ./.env

# Instalar solo las dependencias de producción
RUN npm ci --only=production

# Crear un usuario no root para mayor seguridad
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nodeuser \
    && chown -R nodeuser:nodejs /app

USER nodeuser

# Variables de entorno
ENV NODE_ENV=production

# Healthcheck para verificar que la aplicación está funcionando
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "process.exit(1)"

# Comando para ejecutar la aplicación
CMD ["node", "dist/chatbot.js"]

# Volumen para datos persistentes
VOLUME ["/app/data"] 