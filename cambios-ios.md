2. Cuentas y credenciales (fuera del código)
Apple Developer Program ($99/año) — indispensable.
App ID + provisioning — EAS lo gestiona solo con eas build -p ios (te pedirá login de Apple la primera vez).
APNs Auth Key para push — eas credentials la genera y sube a tu cuenta de Expo. El backend ya usa Expo Push API (expo_token en login), así que funcionará igual que en Android una vez configurada. Sin esto, las notificaciones push no llegarán en iOS.
Build: eas build -p ios --profile production (ya tienes EXPO_TOKEN en .env para CI/Docker).
Submit: eas submit -p ios sube el build a App Store Connect → luego va a TestFlight para pruebas internas.
3. Pruebas en iOS — ojo con esto
Estás en Linux: no hay Xcode ni simulador iOS. Opciones reales:

TestFlight (recomendado): build de producción → submit → testers internos (hasta 100, sin revisión de Apple para internal testers... en realidad el primer build sí pasa una Beta App Review ligera).
Internal distribution (ad hoc): eas build -p ios --profile preview con distribution: "internal" — requiere registrar el UDID de cada iPhone en el provisioning profile.
Agregar "ios": { "simulator": true } al perfil preview genera un .app para simulador, pero solo sirve en una Mac.
4. Checklist de App Store Connect
Casi todo ya lo tienes redactado en store-listing.md (se reutiliza):

Crear la app: nombre "Casmar", bundle id (el que decidas en el punto c), SKU.
App Review Information: cuenta demo obligatoria — la app es 100% tras login, sin credenciales Apple rechaza de inmediato.
App Privacy (nutrition labels): equivalente al Data Safety ya documentado (nombre, email, user ID, push token, contenido generado por usuario).
Age rating: el doc dice 18+ por ser herramienta corporativa.
URL de política de privacidad pública (servicioscasmar.com/privacidad — verificar que cargue).
Screenshots: iPhone 6.9"/6.7" obligatorias; si dejas supportsTablet: true, también de iPad 13". Si no quieres soportar iPad, pon supportsTablet: false y no te pedirán capturas de iPad.
Categoría, descripción, keywords, ícono de tienda (el cuadrado sin alpha).
Revisar min_version del backend antes de enviar a revisión (para que el revisor no vea la pantalla de force update).
5. Riesgo a considerar
Apple a veces rechaza apps corporativas internas sugiriendo distribución vía Apple Business Manager / Custom App Distribution o unlisted distribution (la app existe en el App Store pero no es buscable, se accede por link directo). Para una app interna de empleados, unlisted distribution suele ser la mejor opción y evita el debate sobre si la app "es para el público general". Requiere solicitar acceso a Apple, pero es un proceso simple.

Resumen de prioridades: (1) decidir dominio real de deep links y publicar el AASA file, (2) decidir bundle ID definitivo, (3) ícono cuadrado sin alpha, (4) corregir prefixes/constantes stale de ironflow, (5) APNs key en EAS, (6) usesNonExemptEncryption, (7) cuenta demo + app privacy en App Store Connect.


Pendiente fuera del código
APNs key: eas credentials → iOS → Push Notifications (sin esto no llegan push en iPhone).
Backend: soportar platform/X-Platform en /app/version (opcional pero recomendado).
App Store Connect: cuenta demo para el revisor, App Privacy labels, screenshots iPhone 6.9" (y iPad 13" — dejaste supportsTablet: true; si no quieres soportar iPad, ponlo en false y no pedirán esas capturas).
Build: eas build -p ios --profile production → eas submit -p ios.