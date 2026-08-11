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

> `jest.global-setup.js` valida conectividad con el backend antes de correr los tests. Si el backend local no está disponible, algunos tests pueden fallar o saltarse. Usa `BUILD=true` en el entorno de CI/build para evitar ese chequeo.

## Validar configuración de build antes de generar AAB

```bash
docker compose exec expo npm run validate:build
```

Este script valida (contra la variante resuelta por `APP_VARIANT`, `production` por defecto):
- Campos obligatorios en `app.config.js` (nombre, slug, versión, `bundleIdentifier`, `package`, `projectId`, etc.)
- Configuración de `gradle.properties`
- Existencia de assets (íconos, splash)
- Dependencias críticas
- Consistencia de versión entre `app.config.js` y `package.json`
- Conectividad con el backend de producción (`tryironflow.com`)
