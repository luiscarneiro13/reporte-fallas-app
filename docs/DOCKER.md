# Arquitectura Docker

## Archivos Docker del proyecto

| Archivo | Propósito |
|---|---|
| `Dockerfile` | Imagen de desarrollo (día a día, `docker-compose.yml`) |
| `Dockerfilebuild` | Imagen para builds locales de EAS y CI (`docker-compose-build.yml`); mismo contenido que `Dockerfile` |
| `Dockerfile.base` | Imagen base publicada en GHCR (Node 20, JDK 17, Android SDK, EAS CLI) — se construye y publica aparte, no la usan los compose de este repo directamente |
| `Dockerfile.linux` | Variante Alpine liviana opcional, sin Android SDK (no usada por los compose actuales) |
| `docker-compose.yml` | Orquestación para desarrollo diario |
| `docker-compose-build.yml` | Orquestación para compilar APK/AAB (perfil `build` + servicio `expo` para builds locales ad-hoc) |

`Dockerfile` y `Dockerfilebuild` parten de la imagen ya publicada:

```dockerfile
FROM ghcr.io/luiscarneiro13/reactnative:v1.0.0
```

## Red

Todos los servicios usan `network_mode: host`. No hay mapeo de puertos — Metro, Expo Dev Tools y cualquier puerto expuesto están directamente en la red del host, lo que permite que el teléfono se conecte por WiFi sin configuración extra.

## Variables de entorno de polling

```yaml
NODE_ENV: development
EXPO_DEVTOOLS_LISTEN_ADDRESS: 0.0.0.0
CHOKIDAR_USEPOLLING: "true"
CHOKIDAR_INTERVAL: "1000"
WATCHPACK_POLLING: "true"
WATCHPACK_POLLING_INTERVAL: "1000"
FAST_REFRESH: "true"
```

Necesarias para que el file watching funcione dentro del contenedor en Linux (los eventos inotify no siempre atraviesan el bind mount).

## Variantes de la app

No hay `app.config.js` ni variable `APP_VARIANT`: todas las builds (development, preview, production) toman la configuración de `app.json`:

| Nombre | Android package | iOS bundle id |
|---|---|---|
| Casmar | `com.casmar.app` | `com.servicioscasmar.app` |

Consecuencia: un APK de desarrollo/prueba **no convive** con la app instalada desde Play Store; hay que desinstalar la de producción antes de instalarlo.

## Builds locales con salida fuera del proyecto

`eas build --local --output <ruta>` escribe el artefacto en una ruta del contenedor. Para dejarlo un directorio arriba del proyecto se monta la carpeta padre:

```bash
docker compose -f docker-compose-build.yml run --rm -v "$(pwd)/..:/output" expo sh -c "npm install && eas build --platform android --profile development --local --output /output/casmar-dev.apk"
```

El archivo queda con dueño `root` (`sudo chown $USER ../casmar-dev.apk` para manipularlo).

## Named volume para node_modules

```yaml
volumes:
  node_modules:
```

Montado como `- node_modules:/app/node_modules` para no pisar la carpeta `node_modules` del host con la del contenedor (arquitecturas distintas).

## npm install: ¿en cada up o solo en build?

- `Dockerfile`/`Dockerfilebuild`: `RUN npm install --legacy-peer-deps` (capa de imagen)
- `docker-compose.yml` (`command`): `[ -d node_modules/react ] || npm install --legacy-peer-deps` — solo instala si falta, para arrancar rápido en los `up` siguientes
- `docker-compose-build.yml` servicio `expo`: `npm install` (sin flags) en cada `run`, para builds ad-hoc con dependencias frescas
- `docker-compose-build.yml` servicio `build-aab`: `npm install --include=dev`, porque el pipeline corre tests (necesita devDependencies)

## Servicios de `docker-compose-build.yml`

- **`expo`**: mismo propósito que el servicio de `docker-compose.yml` pero con Android SDK disponible (para `eas build --local`). Se usa con `run --rm expo sh -c "..."` para builds puntuales, sobrescribiendo el `command` por defecto.
- **`build-aab`**: pipeline completo de producción (tests → validate:build → bump:patch → build). Vive bajo el perfil `build`:

```bash
docker compose -f docker-compose-build.yml --profile build run --rm build-aab
```

---

## Gestión de la imagen base

La imagen base (`ghcr.io/luiscarneiro13/reactnative:v1.0.0`) tiene Node 22, Java y Android SDK preconfigurados, hospedada en GitHub Container Registry.

### Publicar una nueva versión

```bash
docker build -f Dockerfile.base -t ghcr.io/luiscarneiro13/reactnative:v1.0.1 .
docker push ghcr.io/luiscarneiro13/reactnative:v1.0.1
```

Requiere un PAT de GitHub con permisos `write:packages` y `read:packages`, y `docker login ghcr.io` con ese token.

Después de publicar una nueva versión, actualizar el tag en `FROM` de `Dockerfile` y `Dockerfilebuild`.
