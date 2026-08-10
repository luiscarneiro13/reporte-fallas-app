# IronFlow App

## Requisitos

- Docker y Docker Compose instalados
- Teléfono Android en la misma red WiFi que la PC
- App [Expo Go](https://expo.dev/go) instalada (solo para Modo 1)

---

## Configuración inicial

```bash
git clone <repo>
cd ironflow-app
docker compose build
echo "EXPO_TOKEN=tu_token_aqui" > .env
```

> El token se obtiene en [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens). Es necesario solo para builds EAS.

---

## Modo 1 — Expo Go

El más rápido. No requiere compilar nada, solo tener Expo Go instalado en el teléfono.

> **Limitación:** módulos nativos como `expo-notifications` no funcionan en Expo Go.

```bash
docker compose up -d
docker compose exec expo npx expo start --host lan --clear
```

Escanear el QR con Expo Go. Los cambios en `src/` se reflejan al guardar.

---

## Modo 2 — Web

```bash
docker compose up -d
docker compose exec expo npx expo start --web
```

Abrir `http://localhost:8081` en el navegador.

---

## Modo 3 — APK por WiFi (development client)

Permite probar funcionalidades nativas completas desde el teléfono sin cable ni ADB. Requiere compilar e instalar el APK la primera vez, o cuando se agregan dependencias nativas.

### Primera vez

**1. Compilar el APK**

```bash
docker compose up -d
docker compose exec expo npx expo run:android
```

El APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

**2. Servir el APK por HTTP desde la PC**

```bash
python3 -m http.server 9091 --directory android/app/build/outputs/apk/debug/
```

**3. Instalar el APK en el teléfono**

Desde el navegador del teléfono (en la misma red WiFi), abrir:

```
http://192.168.1.PC_IP:9091/app-debug.apk
```

Descargar e instalar. La IP de la PC se obtiene con `hostname -I` (primer valor).

**4. Conectar al servidor Metro**

Abrir la app **IronFlow** en el teléfono. Si no conecta automáticamente, ingresar manualmente en la pantalla de conexión:

```
http://192.168.1.PC_IP:8081
```

---

### Día a día

```bash
docker compose up -d
```

Abrir la app **IronFlow** en el teléfono. Metro arranca automáticamente con el contenedor.

**Si no conecta automáticamente**, ingresar en la pantalla de conexión:

```
http://192.168.1.PC_IP:8081
```

La IP exacta de la PC se puede ver con:

```bash
docker compose logs expo | grep "Metro waiting"
```

---

### Cuando se agregan dependencias nativas

```bash
docker compose exec expo npm install
docker compose exec expo npx expo run:android
```

Repetir el paso 2 y 3 de "Primera vez" para instalar el APK actualizado.

---

## Testing

```bash
docker compose exec expo npm test                  # Todos los tests
docker compose exec expo npm run test:watch        # Modo watch
docker compose exec expo npm run test:coverage     # Con cobertura
docker compose exec expo npm run validate:build    # Valida configuración de build
```

Correr un test específico:

```bash
docker compose exec expo npx jest src/api/__tests__/client.test.js
```

---

## Compilación y deploy

### Build local (AAB de producción)

Automatiza tests → validación → bump de versión → compilación:

```bash
docker compose -f docker-compose-build.yml --profile build run --rm build-aab
```

El AAB queda en el directorio del proyecto listo para subir al Play Store.

### Build en EAS Cloud

```bash
# AAB de producción (Play Store)
docker compose exec expo eas build --platform android --profile production

# APK de prueba interna
docker compose exec expo eas build --platform android --profile preview

# Development client
docker compose exec expo eas build --platform android --profile development
```

> EAS Cloud no corre tests ni hace bump automático. Antes de un build de producción:
> ```bash
> docker compose exec expo npm test && npm run validate:build && npm run bump:patch
> ```

### Gestión de versiones

```bash
npm run bump:patch   # 1.0.x → 1.0.x+1
npm run bump:minor
npm run bump:major
```

Actualiza `version` en `package.json` y `versionCode`/`buildNumber` en `app.json`.

---

## Imagen base Docker

La imagen base es `ghcr.io/luiscarneiro13/reactnative:v1.0.0` (Node 22, Java 17, Android SDK).

Para publicar una nueva versión:

```bash
docker build -f Dockerfile.base -t ghcr.io/luiscarneiro13/reactnative:v1.0.1 .
docker push ghcr.io/luiscarneiro13/reactnative:v1.0.1
```

Requiere un PAT de GitHub con permisos `write:packages` y `read:packages`.
