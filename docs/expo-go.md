# Levantar el proyecto con Expo Go (sin instalar APK)

Expo Go es la app genérica de Expo (Play Store / App Store). Sirve para probar la UI y la lógica JavaScript **sin compilar ni instalar nada nativo** — ideal para revisar cambios rápido. A cambio, **no soporta código nativo personalizado**: los plugins de `app.json` (ícono/color de `expo-notifications`, `google-services.json`, el scheme `casmar://`, deep links, etc.) no se aplican dentro de Expo Go. Para probar esas funcionalidades hace falta el development build (ver [PRUEBAS_TELEFONO.md](PRUEBAS_TELEFONO.md)).

> Requisito: la app **Expo Go** instalada en el teléfono debe soportar el SDK del proyecto (`expo` `~54.x` en `package.json`). Si Expo Go muestra un error de versión incompatible, actualiza la app desde la tienda.

---

## Paso 1 — Verificar que no haya otro Metro corriendo

El contenedor `casmar-expo` normalmente ya tiene Metro levantado en modo **dev-client** (`--dev-client`), que ocupa el puerto 8081. Solo puede haber un proceso escuchando ese puerto a la vez.

```bash
docker compose ps
```

Si el servicio `expo` está `Up`, detenlo antes de continuar:

```bash
docker compose stop expo
```

---

## Paso 2 — Levantar Metro en modo Expo Go (sin `--dev-client`)

```bash
docker compose run --rm --name casmar-expo-go expo sh -c "npx expo start --go --host lan --clear"
```

- `--rm` borra el contenedor temporal al cerrarlo (no interfiere con el servicio normal definido en `docker-compose.yml`)
- **El flag `--go` es obligatorio.** El proyecto tiene `expo-dev-client` instalado como dependencia, así que Expo CLI arranca en modo "development build" (`exp+casmar://...`) **aunque no pases `--dev-client`** — sin `--go` la terminal seguirá mostrando `Using development build` y Expo Go no va a poder abrir el QR (no pasa nada al escanear)
- Con `--go`, Expo CLI sirve el bundle en el formato que Expo Go entiende (`exp://...`)
- Deja la terminal abierta mientras uses la app; el QR aparece ahí directamente

---

## Paso 3 — Escanear el QR

1. Abre **Expo Go** en el teléfono
2. Toca **"Scan QR code"** y apunta a la terminal
3. Alternativa manual: en Expo Go toca **"Enter URL manually"** e ingresa `exp://<IP-DE-TU-PC>:8081` (la IP aparece en la terminal, ej. `exp://192.168.1.77:8081`)

Ambos deben estar en la **misma red WiFi**, sin VPN activa.

---

## Volver al modo development build (dev-client)

Cuando termines de probar en Expo Go, cierra ese contenedor (Ctrl+C o `docker rm -f casmar-expo-go`) y vuelve a levantar el servicio normal:

```bash
docker compose up -d
```

---

## Solución de problemas

### Error: `Conflict. The container name "/casmar-expo-go" is already in use`

Significa que quedó un contenedor `casmar-expo-go` de una sesión anterior (por ejemplo, si se cerró con `docker compose down` en vez de detener este contenedor puntual — `down` no lo toca porque no es parte del `docker-compose.yml`). `docker compose down` **no** lo elimina.

Elimínalo manualmente y vuelve a correr el Paso 2:

```bash
docker rm -f casmar-expo-go
```

---

## Referencia rápida

| Objetivo | Comando |
|----------|---------|
| Metro para development build (dev-client) | `docker compose up -d` *(o `docker compose exec expo npx expo start --dev-client --host lan --clear` si ya está levantado)* |
| Metro para Expo Go (sin dev-client) | `docker compose run --rm --name casmar-expo-go expo sh -c "npx expo start --go --host lan --clear"` *(el `--go` es obligatorio, ver Paso 2)* |
| Detener el servicio normal antes de usar Expo Go | `docker compose stop expo` |
