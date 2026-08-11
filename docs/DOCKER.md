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
APP_VARIANT: development   # o production, según el servicio/perfil
EXPO_DEVTOOLS_LISTEN_ADDRESS: 0.0.0.0
CHOKIDAR_USEPOLLING: "true"
CHOKIDAR_INTERVAL: "1000"
WATCHPACK_POLLING: "true"
WATCHPACK_POLLING_INTERVAL: "1000"
FAST_REFRESH: "true"
```

Necesarias para que el file watching funcione dentro del contenedor en Linux (los eventos inotify no siempre atraviesan el bind mount).

## APP_VARIANT y variantes de la app

`app.config.js` lee `process.env.APP_VARIANT` para decidir nombre y `applicationId`/`bundleIdentifier`:

| APP_VARIANT | Nombre | Android package | iOS bundle id |
|---|---|---|---|
| `development` (o no seteado en local) | Tryironflow (Dev) | `com.tryironflow.app.dev` | `com.tryironflow.app.dev` |
| `production` | Tryironflow | `com.tryironflow.app` | `com.tryironflow.app` |

Se fija en dos lugares:
- **Docker**: `environment.APP_VARIANT` en cada servicio de los `docker-compose*.yml`
- **EAS**: `env.APP_VARIANT` en cada perfil de `eas.json`

Ambos deben coincidir con el uso esperado (compilar producción con `APP_VARIANT=production`, todo lo demás con `development`).

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
