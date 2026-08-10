# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Environment

The entire development workflow runs inside Docker. All commands below must be run inside the container unless noted otherwise.

### Initial setup (first time)
```bash
# En el HOST — configurar ADB por WiFi con el teléfono conectado por USB
adb start-server
adb tcpip 5555
adb connect 192.168.1.198:5555   # IP del teléfono en la red local

# Levantar el contenedor
docker compose up -d

# Compilar e instalar el APK en el teléfono (solo la primera vez)
docker compose exec expo adb connect 192.168.1.198:5555
docker compose exec expo npx expo run:android
```

### Daily development
```bash
docker compose up -d
docker compose exec expo npx expo start --dev-client   # Metro + Fast Refresh
```

### Modo web
```bash
docker compose exec expo npx expo start --web   # http://localhost:8081
```

### After adding new dependencies
```bash
docker compose exec expo npm install
docker compose exec expo npx expo run:android   # Rebuild necesario
```

## Testing

```bash
docker compose exec expo npm test                  # Todos los tests
docker compose exec expo npm run test:watch        # Modo watch
docker compose exec expo npm run test:coverage     # Con cobertura
docker compose exec expo npm run validate:build    # Valida config antes de compilar
```

Run a single test file:
```bash
docker compose exec expo npx jest src/api/__tests__/client.test.js
```

**Important:** `jest.global-setup.js` valida conectividad con el backend antes de correr los tests. Si el backend local no está disponible, algunos tests pueden fallar o saltarse. Usar `BUILD=true npm test` para el entorno de CI/build.

## Build y Deploy

### Build local (AAB de producción) — recomendado
```bash
docker compose -f docker-compose-build.yml --profile build run --rm build-aab
```
Ejecuta automáticamente: tests → validate:build → bump:patch → compilación AAB.

### Build en EAS Cloud
```bash
docker compose exec expo eas build --platform android --profile production   # Play Store
docker compose exec expo eas build --platform android --profile preview       # APK de prueba
```
EAS Cloud no corre tests ni hace bump automático; hacerlo manual antes.

### Versioning
```bash
npm run bump:patch   # 1.0.x → 1.0.x+1 (actualiza package.json, app.json versionCode/buildNumber)
npm run bump:minor
npm run bump:major
```

## Arquitectura

### Navegación y roles (`App.js`)

`App.js` es el único lugar donde vive toda la configuración de navegación: stacks, drawers, deep links y handlers globales. No agregar lógica de pantallas completas aquí.

Hay dos roles con drawers distintos:
- **Operador**: `ReportFault → FaultSummary → Equipment → MyProfile`
- **Supervisor**: `FaultSummary → ReportFault → Equipment → MyProfile` (más acceso a editar/cerrar fallas)

El rol activo se lee de `useAuthStore().roles` y determina qué drawer se monta. Las pantallas de detalle (`FaultDetail`, `EditFault`, `CloseFault`, `EquipmentDetail`) viven en un `AppStack` sobre el drawer.

### Estado global (`src/store/`)

- **`authStore.js`**: fuente de verdad de `token`, `user`, `roles` y `pendingRoute` (ruta pendiente para deep links recibidos sin sesión). Persiste en AsyncStorage bajo la clave `@ironflow_auth`.
- **`configStore.js`**: controla `apiBaseUrl` entre producción (`https://tryironflow.com/api/v1`) y local (`http://localhost:8090/api/v1`). Se puede cambiar desde `DevConfigScreen` en desarrollo.

### Cliente HTTP (`src/api/client.js`)

Axios con dos interceptores:
- **Request**: inyecta `Authorization: Bearer <token>` y `baseURL` desde los stores (leídos fuera del ciclo React con `.getState()`).
- **Response**: ante 401, llama `clearAuth()` para forzar el logout automático.

Toda llamada al backend debe pasar por funciones en `src/api/` (nunca llamar Axios directo desde pantallas).

### Offline-first (`src/services/`)

- **`offlineQueue.js`**: cola persistida en AsyncStorage (`@ironflow_offline_queue`). Opera tipos `create_fault`, `update_fault`, `close_fault`.
- **`syncService.js`**: consume la cola cuando hay conectividad. Usa `Idempotency-Key` (el `localId` local) para evitar duplicados. Los conflictos 409/422 se resuelven removiendo de la cola y notificando; los errores 5xx se reintentan.
- **`networkService.js`**: monitorea conectividad y dispara `syncAll()` al reconectar. Se activa/desactiva según el estado de autenticación en `App.js → DeepLinkHandler`.

### Data fetching

React Query (`@tanstack/react-query`) para server state. El `QueryClient` se configura en `App.js` con `staleTime` y `gcTime` desde `src/constants/index.js`.

### Internacionalización (`src/i18n/`)

Custom i18n con soporte `en`, `es`, `pt`. Idioma guardado en AsyncStorage (`@ironflow_lang`). Consumir con `useTranslation()` que expone `t(key)` (dot-notation), `locale` y `setLocale`.

### Deep links

Esquemas registrados: `ironflow://` y `https://tryironflow.com` / `http://tryironflow.com`.

Ruta implementada: `equipment/:equipmentId` → navega a `EquipmentDetail`. Si el usuario no está autenticado, el link se guarda en `pendingRoute` y se procesa tras el login.

### Notificaciones push (`src/utils/notifications.js`)

Usa `expo-notifications`. Al recibir una notificación con `data.url`, navega a `EquipmentDetail`; con `data.type === 'fault_created'`, navega a `FaultDetail`. El token push se registra en `App.js` y se expone via `NotificationContext`.

### Version check (`src/services/versionCheck.js`)

Al iniciar sesión, consulta al backend la versión mínima requerida. Si `updateRequired && force` es true, muestra `ForceUpdateScreen` bloqueante. Si solo `updateRequired`, muestra un aviso descartable.

## Reglas de arquitectura

- `src/api/` solo HTTP — sin UI, sin navegación, sin estado global.
- `src/store/` solo estado global persistente — sin llamadas HTTP complejas, sin componentes.
- `src/screens/` pantallas navegables; no duplicar lógica HTTP que ya existe en `src/api/`.
- `src/components/` componentes reutilizables en más de una pantalla.
- `App.js` toda la configuración de navegación raíz, stacks, drawers y deep links.
- `app.json` toda configuración nativa (scheme, package, versionCode, intentFilters, associatedDomains).
- No crear carpetas `Controllers`, `Services`, `Repositories` o `Views` — este no es un proyecto MVC.
- Usar siempre `docker compose` (sin guion).
- Los tests van en carpetas `__tests__/` cercanas a la capa que prueban.
- La ruta `@/` mapea a `src/` (configurado en `jest.config.js` y Babel).
