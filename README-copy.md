# IronFlow App

## Requisitos

- Docker y Docker Compose instalados
- Teléfono Android con **depuración USB** activada
- Misma red WiFi que la PC

---

## 1. Clonar y construir el contenedor

```bash
git clone <repo>
cd ironflow-app
docker compose build
```

---

## 2. Configurar ADB por WiFi (solo la primera vez)

Conecta el teléfono **por USB** a la PC. En el **HOST** (tu PC, fuera de Docker):

```bash
adb start-server             # Iniciar ADB (Ubuntu no lo levanta solo)
adb devices                  # Verificar: debe aparecer el teléfono (ej: DYAER8PRHMHUOJ9P  device)
adb tcpip 5555               # Cambiar ADB a modo TCP/IP
```

**Desconecta el USB.** Ahora conecta por WiFi:

```bash
adb connect 192.168.1.198:5555
adb devices                  # Debe aparecer: 192.168.1.198:5555  device
```

> ADB debe quedar activo en el host. Si pierdes conexión, repite `adb connect`.

---

## 3. Iniciar el contenedor

```bash
docker compose up -d
```

---

## 4. Compilar e instalar el APK (solo la primera vez, ~10 min)

```bash
docker compose exec expo adb connect 192.168.1.198:5555
docker compose exec expo npx expo run:android
```

Esto compila el development build (incluye Notifee, Firebase, etc.) y lo instala en el teléfono. Metro se queda corriendo en esta terminal.

**Abre la app "IronFlow" en tu teléfono** → se conecta automáticamente y tienes Fast Refresh.

---

## 5. Día a día — Desarrollo

Asegúrate de que el contenedor esté arriba:

```bash
docker compose up -d
```

En otra terminal, inicia Metro:

```bash
docker compose exec expo npx expo start --dev-client
```

Abre la app IronFlow en el teléfono. Los cambios en `src/` se reflejan al guardar. Sin cables, sin ADB.

### Si agregaste dependencias nuevas

```bash
docker compose exec expo npm install
docker compose exec expo npx expo run:android    # Rebuildear el APK
```

---

## 6. Modo Web (navegador)

```bash
docker compose exec expo npx expo start --web
# Abrir http://localhost:8081
```

---

## Testing

```bash
docker compose exec expo npm test                 # Tests unitarios
docker compose exec expo npm run test:watch       # Modo watch
docker compose exec expo npm run test:coverage    # Con cobertura
docker compose exec expo npm run validate:build   # Validar build
```

---

## Despliegue a Google Play Store

### Configurar EXPO_TOKEN

1. Obtén tu token de Expo:
```bash
docker compose exec expo bash
eas login
eas whoami
```

2. Crea `.env` en la raíz del proyecto:
```bash
echo "EXPO_TOKEN=tu_token_aqui" > .env
```

3. Reinicia el contenedor:
```bash
docker compose down
docker compose up -d
```

### Opción 1 — Build local (dentro del contenedor)

Compila, testea, valida y sube versión automáticamente:

```bash
docker compose -f docker-compose-build.yml --profile build run --rm build-aab
```

Este comando:
- Ejecuta `npm test`
- Ejecuta `npm run validate:build`
- Aumenta versión patch (ej: `1.0.15` → `1.0.16`)
- Compila el AAB de producción localmente
- El AAB queda disponible en el contenedor

### Opción 2 — Build en servidores de Expo (EAS Cloud)

```bash
# AAB de producción (Play Store)
docker compose exec expo eas build --platform android --profile production

# APK de prueba interna
docker compose exec expo eas build --platform android --profile preview
```

> No ejecutan tests ni bump. Debes hacerlo manual antes:
> ```bash
> npm test && npm run validate:build && npm run bump:patch
> ```

---

## Gestión de la Imagen Base (GitHub Packages / GHCR)

La imagen base usada es `ghcr.io/luiscarneiro13/reactnative:v1.0.0` (Node 22, Java 17, Android SDK).

### Publicar una nueva versión

```bash
docker build -f Dockerfile.base -t ghcr.io/luiscarneiro13/reactnative:v1.0.1 .
docker push ghcr.io/luiscarneiro13/reactnative:v1.0.1
```

Requieres un Personal Access Token (PAT) de GitHub con permisos `write:packages` y `read:packages`.
