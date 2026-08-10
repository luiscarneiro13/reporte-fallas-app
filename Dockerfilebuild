# =========================================================================
# Dockerfile de Construcción y Ejecución para IronFlow
# Hereda de la imagen base personalizada en GitHub Container Registry
# =========================================================================

FROM ghcr.io/luiscarneiro13/reactnative:v1.0.0

WORKDIR /app

# Copiar archivos de definición de dependencias para caché eficiente
COPY package*.json ./

# Instalar dependencias en el contenedor
RUN npm install --legacy-peer-deps

# Copiar todo el código de la aplicación
COPY . .

# Exponer el puerto de Metro Packager
EXPOSE 8081

# Comando por defecto (será sobrescrito en desarrollo por docker-compose)
CMD ["npx", "expo", "start", "--host", "lan", "--clear"]