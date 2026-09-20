# Despliegue (Google Play Store / Apple App Store)

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

## Construir AAB de producción (Android)

El perfil `production` de `eas.json` compila el `app-bundle` con el `package` definido en `app.json`: `com.casmar.app` (nombre "Casmar") — la app real de Play Store.

### Opción 1: Build local con Docker (recomendado)

```bash
docker compose up -d
docker compose -f docker-compose-build.yml --profile build run --rm build-aab
```

Este comando ejecuta automáticamente:
1. Tests unitarios (`BUILD=true npm test`)
2. `npm run validate:build`
3. Incremento de versión (`patch`, sobre `app.json` y `package.json`)
4. Compilación del AAB (`eas build --profile production --local`)

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

## Compilar y publicar en iOS (App Store)

### Flujo normal (sin depender de la cuenta de Apple)

```bash
npm run bump:patch                                                 # sube versión + buildNumber
docker compose exec expo eas build -p ios --profile production     # responde "n" al login de Apple
docker compose exec expo eas submit -p ios --profile production    # usa la ASC API Key, sin login
```

**Importante:** cuando `eas build` pregunte `Do you want to log in to your Apple account?` responde **`n`**. Las credenciales de firma ya están guardadas en los servidores de EAS y se reutilizan solas; responder `y` obliga a pedir el Apple ID del Account Holder sin necesidad.

Tras el submit, Apple procesa el binario en 5-10 min y el build aparece en
[TestFlight](https://appstoreconnect.apple.com/apps/6813633043/testflight/ios).

### Credenciales de iOS almacenadas en EAS

Generadas el 19/09/2026 con el Apple ID del Account Holder (cuenta **individual**, team `C3B8X39F3H`). Todas viven en los servidores de EAS, no en el repo:

| Credencial | ID | Caduca |
|---|---|---|
| Distribution certificate | `29B4CAB0431FD56A5FB1EF3F0A833882` | sep 2027 |
| Provisioning profile | `ML7TL2CLF6` | sep 2027 |
| Push key (APNs) | `7BBQ5HQJNN` | nunca |
| App Store Connect API Key (rol ADMIN) | `955D9F9A87` | nunca |

Se pueden inspeccionar con `eas credentials -p ios` o en
expo.dev → proyecto `casmar` → *Credentials* → iOS.

### Cuándo se vuelve a necesitar al Account Holder

La cuenta de Apple está inscrita como **Individual**, y en ese tipo de cuenta **solo el Account Holder puede generar credenciales de firma** (los demás usuarios, incluso con rol Admin en App Store Connect, no son parte del team en el Developer Portal y obtienen el error `You have no team associated with your Apple account`).

Hace falta su intervención solo para:

- Renovar el **provisioning profile** y el **distribution certificate** → **septiembre 2027**
- Agregar o quitar capabilities nativas (ej. si se retoman los deep links / Universal Links)

Después de una sesión con su Apple ID, conviene limpiar la sesión cacheada en el contenedor:

```bash
docker compose exec expo rm -rf /root/.app-store/auth
```

### Requisitos de eas-cli

Las versiones viejas de `eas-cli` fallan al autenticar con Apple (`iTunes service key is empty`). Los `Dockerfile` y `Dockerfilebuild` instalan `eas-cli@latest` sobre la imagen base por ese motivo — si cambias la imagen, mantén esa línea.

---

## Gestión de versiones

```bash
npm run bump:patch   # 1.0.x → 1.0.x+1
npm run bump:minor
npm run bump:major
```

Actualiza `version`, `android.versionCode` e `ios.buildNumber` en `app.json`, `version` en `package.json` y `APP_VERSION` en `src/constants/index.js`.

Cada build subido a App Store Connect necesita un `buildNumber` mayor al anterior (Apple lo rechaza si se repite), igual que `versionCode` en Play Store.

---

## Submit a Play Store

```bash
docker compose exec expo eas submit --platform android --profile production
```

Requiere tener el AAB ya generado y las credenciales de Play Console configuradas en el proyecto EAS.

---

## Identificadores de las tiendas

| | Android (Play Store) | iOS (App Store) |
|---|---|---|
| Package / Bundle ID | `com.casmar.app` | `com.servicioscasmar.app` |
| ID de la tienda | — | Apple ID `6813633043`, SKU `servicios_casmar` |
| Apple Team ID | — | `C3B8X39F3H` |

El bundle ID de iOS es distinto porque `com.casmar.app` ya estaba ocupado en Apple.
Los datos de submit (`appleId`, `ascAppId`, `appleTeamId`) están en `eas.json` → `submit.production.ios`.
