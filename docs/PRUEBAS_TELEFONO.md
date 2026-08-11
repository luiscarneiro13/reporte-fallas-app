# Pruebas en teléfono físico por WiFi (funcionalidades nativas)

Para probar funcionalidades que no corren en Expo Go (push notifications, deep links, etc.) necesitas instalar una APK de desarrollo y conectarla al servidor Metro por WiFi. Una vez instalada, **no hace falta cable ni ADB** para el día a día.

> ⚠️ **Importante:** `eas` está instalado **dentro del contenedor Docker**, no en el sistema anfitrión. Nunca ejecutes comandos `eas` directamente en la terminal del host — siempre usa `docker compose exec expo ...`.

> El `EXPO_TOKEN` se configura en el archivo `.env` en la raíz del proyecto (ver [Despliegue](DESPLIEGUE.md)), así no necesitas hacer `eas login` cada vez.

Esta build usa el paquete **`com.tryironflow.app.dev`** (nombre visible **"Tryironflow (Dev)"**), distinto del de producción (`com.tryironflow.app` / "Tryironflow"), configurado en `app.config.js` vía la variable de entorno `APP_VARIANT` que fija cada perfil en `eas.json`. Por eso conviven instaladas en el mismo teléfono sin pisarse, y cada una tiene su propia sesión y almacenamiento local. Las notificaciones push también funcionan en la build de desarrollo: `google-services.json` tiene un registro Firebase independiente para `com.tryironflow.app.dev`.

---

## Opción A: Development Build con hot reload (recomendado)

Instala la APK una vez y recarga el código por WiFi sin recompilar cada vez que haces un cambio.

### Paso 1 — Levantar el contenedor

```bash
docker compose up -d
docker compose ps   # el servicio "expo" debe estar en estado "running"
```

---

### Paso 2 — Compilar la APK de desarrollo

Tienes dos formas de compilar. El resultado es el mismo: una APK de desarrollo lista para instalar.

#### Alternativa 1: EAS Cloud (recomendado si no quieres ocupar recursos de tu PC)

```bash
docker compose exec expo eas build --platform android --profile development
```

- El código se sube y compila en los servidores de Expo (tarda entre 10 y 20 minutos)
- Puedes seguir el progreso en la terminal o en https://expo.dev → tu proyecto → Builds
- Al terminar, la terminal muestra un **enlace directo para descargar la APK** — continúa en el Paso 3

#### Alternativa 2: Build local con Docker (sin subir nada a EAS, consume recursos de tu PC)

Usa el contenedor de build (`Dockerfilebuild`), que incluye el Android SDK. La APK se genera directamente en tu máquina.

```bash
# Solo la primera vez: construir la imagen de build (tarda varios minutos)
docker compose -f docker-compose-build.yml build expo
```

```bash
# Compilar la APK localmente (todo en una sola línea)
docker compose -f docker-compose-build.yml run --rm expo sh -c "npm install && eas build --platform android --profile development --local"
```

> ⚠️ El comando debe copiarse y ejecutarse **completo en una sola línea**. Si lo cortas y ejecutas solo la primera parte, el contenedor arranca el servidor de desarrollo con QR en lugar de compilar.

- `--local` indica que el build corre en tu máquina, no en EAS Cloud
- Tarda entre 15 y 30 minutos según los recursos de tu PC (necesita al menos 8 GB de RAM y 15 GB de disco)
- Al terminar, la terminal muestra la ruta exacta donde quedó la APK (generalmente en la raíz del proyecto)
- **No necesitas descargar nada** — la APK ya está en tu PC, pasa directamente al Paso 4

> Solo necesitas repetir el Paso 2 cuando cambies algo nativo (agregar un plugin, modificar `app.config.js`, instalar una librería con código nativo). Para cambios de código JavaScript no hace falta recompilar.

---

### Paso 3 — Descargar la APK (solo si usaste EAS Cloud)

Cuando el build termine, la terminal muestra algo como:

```
✓ Build finished
  Android APK: https://expo.dev/artifacts/eas/xxxx.apk
```

Descarga ese archivo `.apk` desde el enlace, directamente en el teléfono (abriendo el enlace desde el navegador) o en la PC para transferirlo después.

---

### Paso 4 — Instalar la APK en el teléfono

1. Transfiere la APK al teléfono (cable USB, Drive, Telegram, o cualquier método)
2. En el teléfono ve a **Ajustes → Seguridad** (o **Ajustes → Aplicaciones → Instalar apps desconocidas** según el fabricante)
3. Activa **"Permitir instalar apps de fuentes desconocidas"** para el navegador o gestor de archivos que uses para abrir el APK
4. Abre el archivo `.apk` y toca **Instalar**
5. La app queda instalada como **"Tryironflow (Dev)"**, con su propio ícono, separada de "Tryironflow" (producción)

---

### Paso 5 — Conectar el teléfono y la PC a la misma red WiFi

- Ambos dispositivos deben estar en **el mismo router y misma red WiFi**
- No uses VPN en ninguno de los dos
- No uses datos móviles en el teléfono

---

### Paso 6 — Iniciar el servidor Metro en modo LAN

`docker compose up -d` ya levanta Metro automáticamente (el `command` del servicio `expo` corre `npx expo start --dev-client --host lan --clear`). Si necesitas reiniciarlo manualmente:

```bash
docker compose exec expo npx expo start --dev-client --host lan --clear
```

Cuando el servidor esté listo, la terminal muestra un **QR code** y la URL, por ejemplo:

```
Metro waiting on exp://192.168.1.XX:8081
```

Deja esta terminal abierta mientras uses la app.

---

### Paso 7 — Abrir la app y conectarla al servidor

1. Abre la app **"Tryironflow (Dev)"** en el teléfono
2. Verás la pantalla del **Expo Dev Client** con un campo para ingresar la URL del servidor
3. Dos opciones:
   - **Rápida:** toca **"Scan QR code"** y escanea el QR de la terminal
   - **Manual:** toca **"Enter URL manually"** e ingresa la URL mostrada, por ejemplo `exp://192.168.1.XX:8081`
4. La app descarga el bundle JavaScript desde tu PC y arranca normalmente

---

### Flujo de trabajo diario (ya con la APK instalada)

```bash
docker compose up -d
```

Eso es todo — Metro arranca automáticamente. Abre la app en el teléfono; si ya se conectó antes, reconecta sola. Los cambios en el código se recargan con Fast Refresh. Si no aplica, sacude el teléfono para abrir el menú de desarrollo y toca **"Reload"**.

---

## Opción B: APK standalone (sin servidor, más simple)

Una APK que funciona sola sin necesidad de correr Metro. Cada cambio de código requiere un nuevo build completo.

```bash
docker compose up -d
docker compose exec expo eas build --platform android --profile preview
```

- El perfil `preview` genera un APK autónomo (también con package `.dev`) que no necesita Metro corriendo
- Descárgalo e instálalo siguiendo los pasos 3 y 4 de la Opción A
- **Desventaja:** cada cambio de código requiere esperar otro build de 10–20 minutos

---

## Referencia rápida de builds

| Propósito | Comando |
|-----------|---------|
| APK de desarrollo (con hot reload) | `docker compose exec expo eas build --platform android --profile development` |
| APK standalone para testing | `docker compose exec expo eas build --platform android --profile preview` |
| AAB para Google Play | `docker compose exec expo eas build --platform android --profile production` |
| Ver todos los builds | `docker compose exec expo eas build:list` |
| Iniciar Metro por WiFi | `docker compose exec expo npx expo start --dev-client --host lan --clear` |
