# Testing

## Ejecutar tests unitarios

```bash
docker compose exec expo npm test
```

## Ejecutar tests en modo watch

```bash
docker compose exec expo npm run test:watch
```

## Ejecutar tests con cobertura

```bash
docker compose exec expo npm run test:coverage
```

## Ejecutar un test específico

```bash
docker compose exec expo npx jest src/api/__tests__/client.test.js
```

## Tests en modo build/CI

```bash
docker compose exec expo npm run test:build   # BUILD=true jest
```

> Los tests no requieren backend: el cliente HTTP y las APIs nativas (`expo-notifications`, `expo-device`, `expo-constants`, AsyncStorage, etc.) están mockeados en `jest.setup-after.js`. Si usas una API nueva de `expo-notifications`, agrégala a ese mock.

## Ubicación de los tests

- `src/api/__tests__/`, `src/services/__tests__/`, `src/store/__tests__/`, `src/screens/__tests__/`
- `src/utils/__tests__/notifications.test.js`: resolución del destino al tocar una notificación (`getNotificationTarget`)

## Validar configuración de build antes de generar AAB

```bash
docker compose exec expo npm run validate:build
```

Este script (`scripts/validate-build.js`) valida:
- Campos obligatorios en `app.json` (nombre, slug, versión, `bundleIdentifier`, `package`, `versionCode`, `projectId`, etc.)
- Configuración de `gradle.properties`
- Existencia de assets (íconos, splash)
- Dependencias críticas
- Consistencia de versión entre `app.json` y `package.json`
