# Desarrollo local

## Primer inicio (instalar dependencias)

```bash
docker compose build
docker compose up -d
```

El contenedor instala las dependencias automáticamente al arrancar (`npm install --legacy-peer-deps`) y levanta el servidor de Metro en modo LAN.

---

## Iniciar servidor de desarrollo (manual)

Si el servidor de Expo no se levantó automáticamente o necesitas reiniciarlo con caché limpia:

```bash
docker compose up -d
docker compose exec expo npx expo start --dev-client --host lan --clear
```

- `--dev-client` asume que ya tienes instalado el APK de desarrollo en el teléfono (ver [Pruebas en teléfono por WiFi](PRUEBAS_TELEFONO.md))
- `--host lan` expone Metro en la IP local de la PC
- `--clear` limpia la caché de Metro (útil tras agregar módulos nativos)

---

## Modo Web (navegador)

```bash
docker compose up -d
docker compose exec expo npx expo start --web
```

La app corre en: http://localhost:8081

---

## Modo Celular (Expo Go)

El más rápido para iterar sobre UI/lógica pura, sin compilar nada.

```bash
docker compose up -d
docker compose exec expo npx expo start --host lan --clear
```

Escanea el QR que aparece en la terminal con [Expo Go](https://expo.dev/go).

> ⚠️ **Limitación:** módulos nativos como `expo-notifications` (push notifications) no funcionan en Expo Go. Para probar esas funcionalidades usa el APK de desarrollo — ver [Pruebas en teléfono por WiFi](PRUEBAS_TELEFONO.md).

Requisito: el teléfono debe estar en la misma red WiFi que la PC.

---

## Cuando agregues nuevas dependencias a package.json

```bash
docker compose exec expo npm install
```

Si la dependencia incluye código nativo (módulos con carpeta `android/`/`ios/` propia, o un config plugin), hay que recompilar el APK de desarrollo — ver "Cuando cambia algo nativo" en [Pruebas en teléfono por WiFi](PRUEBAS_TELEFONO.md).

## Los cambios en el código se reflejan automáticamente

Gracias a `CHOKIDAR_USEPOLLING` y `WATCHPACK_POLLING`, los cambios en `src/` se detectan dentro del contenedor y Metro aplica Fast Refresh sin reiniciar nada.
