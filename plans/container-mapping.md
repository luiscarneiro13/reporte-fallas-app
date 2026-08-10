# Mapeo de Contenedores del Proyecto IronFlow

## Contenedores definidos

- **ironflow-expo** (servicio `expo` en `docker-compose.yml` y `docker-compose-build.yml`)
  - Imagen: `Dockerfile` (desarrollo) o `Dockerfilebuild` (build)
  - Volúmenes:
    - `.:/app`
    - `node_modules:/app/node_modules`
  - `working_dir`: `/app`
  - `network_mode`: `host` (permite acceso LAN para Metro Bundler)
  - Variables de entorno relevantes:
    - `NODE_ENV` (development/production)
    - `EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0`
    - `CHOKIDAR_USEPOLLING`, `CHOKIDAR_INTERVAL`, `WATCHPACK_POLLING`, `WATCHPACK_POLLING_INTERVAL`, `FAST_REFRESH`
    - `EXPO_TOKEN` (para builds con EAS)
  - Comandos de inicio:
    - Desarrollo: `npm install --legacy-peer-deps && npx expo start --host lan --clear`
    - Build (producción): `npm install && npx expo start --host lan --clear`
    - Build AAB (perfil `build`): secuencia de instalación, tests, validación, bump de versión y `eas build --platform android --profile production --local`

## Volúmenes Docker

- `node_modules` (volumen nombrado) para cachear dependencias entre reinicios.

## Uso de los contenedores

- **Instalar dependencias**: `docker exec ironflow-expo npm install`
- **Levantar servidor de desarrollo**: `docker compose up` o `docker compose exec expo npx expo start --host lan --clear`
- **Ejecutar tests**: `docker compose exec expo npm test`
- **Construir AAB local**: `docker compose -f docker-compose-build.yml --profile build run --rm build-aab`
- **Limpiar cache de Metro**: usar el flag `--clear` en los comandos de `expo start`.

## Información adicional

- El proyecto usa **Expo** dentro del contenedor, por lo que la compilación Android se realiza mediante `eas build` (cloud) o el flujo local descrito arriba.
- La integración de **Notifee** se maneja mediante el script `withNotifeeMavenRepository.js`, que inserta un repositorio Maven local en `android/app/build.gradle`.
- Para reconstruir con Notifee después de cambiar dependencias, es necesario limpiar la cache y volver a ejecutar el contenedor con los comandos de inicio que incluyen `--clear`.
