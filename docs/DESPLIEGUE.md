# Despliegue a Google Play Store

## Configurar EXPO_TOKEN

Para builds con EAS (development, preview o production) necesitas el token de Expo configurado.

1. Copia `.env.example` a `.env` y completa el token:

```bash
cp .env.example .env
```

```
EXPO_TOKEN=tu_token_aqui
```

El token se obtiene en [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens).

2. Si necesitas regenerarlo, entra al contenedor y haz login:

```bash
docker compose exec expo bash
eas login
eas whoami
```

3. Reinicia el contenedor para que tome el nuevo valor:

```bash
docker compose down
docker compose up -d
```

`.env` está en `.gitignore` — nunca se commitea.

---

## Construir AAB de producción

El perfil `production` de `eas.json` fija `APP_VARIANT=production`, que resuelve en `app.config.js` al paquete `com.tryironflow.app` (nombre "Tryironflow") — la app real de Play Store.

### Opción 1: Build local con Docker (recomendado)

```bash
docker compose up -d
docker compose -f docker-compose-build.yml --profile build run --rm build-aab
```

Este comando ejecuta automáticamente:
1. Chequeo de conectividad con el backend de producción
2. Tests unitarios (`BUILD=true npm test`)
3. `npm run validate:build`
4. Incremento de versión (`patch`, sobre `app.config.js` y `package.json`)
5. Compilación del AAB (`eas build --profile production --local`)

Requiere al menos 8 GB de RAM y 15 GB de disco libre en el host.

### Opción 2: EAS Cloud

```bash
docker compose exec expo npm test
docker compose exec expo npm run validate:build
docker compose exec expo npm run bump:patch
docker compose exec expo eas build --platform android --profile production
```

> A diferencia de la Opción 1, EAS Cloud no corre tests ni hace bump automático — hay que hacerlo manualmente antes, en ese orden.

---

## Gestión de versiones

```bash
npm run bump:patch   # 1.0.x → 1.0.x+1
npm run bump:minor
npm run bump:major
```

Actualiza `version`, `android.versionCode` e `ios.buildNumber` en `app.config.js`, y `version` en `package.json`. Como producción y desarrollo son apps distintas (`applicationId` separados), este `versionCode` compartido solo importa para la app de producción subida a Play Store — el build de desarrollo nunca se sube a ninguna store.

---

## Submit a Play Store

```bash
docker compose exec expo eas submit --platform android --profile production
```

Requiere tener el AAB ya generado y las credenciales de Play Console configuradas en el proyecto EAS.
