# Configuración de tiendas (Google Play / App Store)

Este documento reúne las respuestas y textos usados al configurar la ficha de la app en Google Play Console, para reutilizarlos al configurar App Store Connect (iOS).

## Datos generales de la app

- **Nombre:** Casmar
- **Package / Bundle ID:** `com.casmar.app`
- **Scheme (deep link):** `casmar://`
- **Dominio asociado:** `casmar.com` (Android App Links / iOS Universal Links sobre `/equipment`)
- **Versión actual:** 1.0.2 (versionCode 23 / buildNumber 24)
- **Roles de usuario:** Operador y Supervisor (drawers distintos, ver `App.js`)
- **Permisos de dispositivo usados:** únicamente notificaciones push (`POST_NOTIFICATIONS` en Android). Verificado en `app.json`: no hay permisos de cámara, almacenamiento ni ubicación, y no hay `expo-image-picker`/`expo-camera`/`expo-location` en el código. (Corrección: en pasos anteriores se asumió erróneamente que había cámara/almacenamiento para fotos; no es así.)
- **Sin anuncios:** la app no integra ningún SDK publicitario.

## 1. Detalles de acceso (App access)

**Selección:** Sí, la app está restringida (requiere login).

**Motivo:** todo el contenido (reportar fallas, ver equipos, perfil) vive detrás de un login con email + contraseña (`src/screens/LoginScreen.js`). No hay uso libre sin cuenta.

**Texto para "Cualquier otra información necesaria para acceder" (máx. 500 caracteres):**

> El acceso solo requiere correo electrónico y contraseña; no se usa verificación en 2 pasos, código QR, biometría ni acceso por ubicación. Se necesita conexión a internet para iniciar sesión (la app funciona sin conexión solo después de haberse autenticado). La cuenta de prueba tiene rol de Operador y permite ver el flujo completo: reportar una falla, ver equipos y consultar el perfil.

**Credenciales de prueba:** completar con un usuario real del backend de producción (`https://tryironflow.com/api/v1`), no de un entorno local/dev.

**Advertencia importante:** `src/services/versionCheck.js` puede mostrar una pantalla de actualización forzosa (`ForceUpdateScreen`) si el `min_version` que devuelve el backend (`/app/version`) es mayor que la versión del build enviado a revisión. Verificar esto antes de enviar a revisión en cualquier tienda, para no bloquear al revisor.

## 2. Anuncios (Ads)

**Selección:** No, mi app no contiene anuncios.

**Motivo:** no hay ningún SDK de publicidad (AdMob u otros) en `package.json` ni en el código.

## 3. Política de privacidad

Texto adaptado desde `https://servicioscasmar.com/privacidad`, ajustado a lo que la app realmente recopila (fallas, equipos, roles, sincronización offline, notificaciones push). Correo de contacto: `carneiroluis2@gmail.com`.

Contenido completo publicado (para pegar/enlazar donde la tienda lo requiera):

```markdown
# Política de Privacidad — Casmar (App de Reporte de Fallas)

**Última actualización:** 22/08/2026

## 1. Información general

La presente Política de Privacidad describe cómo la aplicación **Casmar** recopila, utiliza y protege la información de sus usuarios. Es una aplicación móvil interna destinada exclusivamente al personal autorizado (operadores y supervisores) para el reporte, seguimiento y cierre de fallas de equipos.

## 2. Datos recopilados

La aplicación obtiene las siguientes categorías de información:

- **Identificación:** nombre, correo electrónico corporativo, ID de empleado y rol asignado (operador o supervisor).
- **Datos operativos:** reportes de fallas, estados de equipos, historial de cierres y actualizaciones de fallas.
- **Uso y diagnóstico:** registros de acceso y datos de sincronización (incluida la cola de operaciones pendientes cuando no hay conexión a internet).
- **Notificaciones push:** un token de dispositivo (Expo/FCM) utilizado para enviar avisos sobre nuevas fallas o actualizaciones relevantes.
- **Permisos del dispositivo:** ninguno más allá de las notificaciones push; la app no usa cámara, almacenamiento ni ubicación GPS.

## 3. Finalidad del tratamiento

Los datos se utilizan para:

- Autenticar usuarios y gestionar sus roles y permisos dentro de la app.
- Registrar, sincronizar y dar seguimiento a los reportes de fallas de equipos, incluso cuando fueron creados sin conexión a internet.
- Enviar notificaciones push relevantes sobre el estado de las fallas o equipos.
- Garantizar la seguridad de los sistemas de la Empresa y prevenir accesos no autorizados.
- Mejorar el rendimiento técnico y corregir errores de la aplicación.

## 4. Almacenamiento y seguridad

La información se resguarda en servidores seguros de la Empresa y/o de nuestro proveedor de servicios en la nube, con medidas de seguridad técnicas y organizativas adecuadas. Los datos generados sin conexión se almacenan temporalmente en el dispositivo del usuario hasta que se sincronizan con el servidor. No se comercializa ni se comparte información personal con terceros ajenos a la operación de la Empresa.

## 5. Derechos y acceso

El acceso a los datos está limitado a usuarios habilitados por TI o Recursos Humanos, según su rol dentro de la aplicación. Cualquier consulta sobre el tratamiento de datos personales, solicitud de acceso, corrección o eliminación puede dirigirse a:

**Correo de contacto:** carneiroluis2@gmail.com

## 6. Cambios en esta política

La Empresa se reserva el derecho de actualizar esta Política de Privacidad conforme evolucionen las funcionalidades de la aplicación o los requisitos legales aplicables. Se notificará a los usuarios sobre cambios significativos.
```

## 4. Clasificación del contenido (Content rating / IARC)

**Correo de contacto para IARC:** `carneiroluis2@gmail.com`

**Categoría seleccionada:** "El resto de los tipos de app" — Casmar no es un juego ni una app social/de comunicación; es una herramienta interna de utilidad/productividad (reporte de fallas de equipos).

**Respuestas del cuestionario:**

| Pregunta | Respuesta | Motivo |
|---|---|---|
| ¿La app contiene contenido relevante para la calificación (sexo, violencia, lenguaje) que se descarga como parte del paquete (código, elementos)? | No | No incluye ningún asset ni código con ese tipo de contenido, solo datos operativos de fallas/equipos. |
| Uso compartido del contenido del usuario: ¿la app permite que los usuarios interactúen o intercambien contenido (mensajes de voz/texto, imágenes, audio) de forma nativa? | No | No existe chat, mensajería ni intercambio de imágenes/audio entre usuarios; la app no usa cámara ni adjunta archivos multimedia. |
| Contenido en línea: ¿la app presenta o promociona contenido que no viene en la descarga inicial (streaming, noticias, contenido de IA, catálogos, etc.)? | No | Solo consume datos operativos internos del propio backend (equipos, fallas), no contenido editorial/de entretenimiento de terceros. |
| ¿La app se centra en la promoción o venta de elementos/actividades con restricción de edad (cigarrillos, alcohol, armas de fuego, apuestas)? | No | Es una app corporativa de reporte de fallas de equipos, sin ningún vínculo con esos productos o actividades. |
| ¿Comparte la ubicación física precisa y actual con otros usuarios? | No | El ícono de ubicación en las pantallas de fallas corresponde al campo "área de servicio" (texto descriptivo del equipo), no a GPS ni ubicación en tiempo real compartida entre usuarios. |
| ¿Permite que los usuarios compren productos digitales? | No | No hay ningún SDK de compras/facturación integrado. |
| ¿Incluye recompensas monetarias, tarjetas de regalo, "jugar para ganar", criptomonedas o NFTs? | No | No aplica a una app de gestión interna de fallas. |
| ¿Es un navegador web o motor de búsquedas? | No | Es una app de reporte y seguimiento de fallas de equipos. |
| ¿Es principalmente un producto de noticias o educativo? | No | Tampoco aplica. |

**Criterio general para el resto de preguntas de violencia, contenido sexual, lenguaje ofensivo, sustancias controladas, juego con apuestas, etc.:** responder "No" en todas — la app no tiene ninguno de esos contenidos, es una herramienta corporativa de reporte de fallas.

**Resultado esperado:** clasificación más baja / apta para todo público en todas las regiones.

## 5. Público objetivo y contenido (Target audience)

**Grupo etario seleccionado:** solo "Mayores de 18 años".

**Motivo:** Casmar es una app corporativa de uso exclusivo para empleados (operadores/supervisores) autenticados con credenciales laborales; no está dirigida a menores. Marcar rangos de menor edad activaría políticas adicionales de Google (diseño apto para niños, restricciones de anuncios/analítica, revisión de contenido) que no aplican a una herramienta interna de trabajo.

## 6. Seguridad de los datos (Data Safety) — Tipos de datos

**Corrección importante:** se verificó `app.json` a fondo — el único permiso Android declarado es `POST_NOTIFICATIONS`. No hay `expo-image-picker`, `expo-camera` ni `expo-location` en el código. La app **no usa cámara, almacenamiento de archivos ni ubicación GPS**.

| Categoría | ¿Recopila? | Detalle |
|---|---|---|
| Ubicación (aproximada / precisa) | No | Sin permiso de ubicación; el "ícono de ubicación" en pantallas de fallas es solo el campo de texto "área de servicio". |
| Información personal | Sí | Nombre, correo electrónico y ID de usuario/empleado (login y perfil). Uso: funcionalidad de la app / gestión de cuenta. No se comparte con terceros. |
| Información financiera | No | No aplica. |
| Salud y fitness | No | No aplica. |
| Mensajes | No | No hay chat, SMS ni email dentro de la app. |
| Fotos y videos | No | No hay cámara ni selector de imágenes en el código. |
| Archivos de audio | No | No aplica. |
| Archivos y documentos | No | No aplica. |
| Calendario | No | No aplica. |
| Contactos | No | No aplica. |
| Actividad en la app | Sí (opcional) | El contenido de los reportes de falla (descripciones, datos del equipo) puede declararse como "Otro contenido generado por el usuario". Uso: funcionalidad de la app. No se comparte con terceros. |
| Navegación web | No | No aplica. |
| Información de la app y rendimiento | No | No hay SDK de crash reporting/analítica (Sentry, Crashlytics, Firebase Analytics, etc.) integrado; `google-services.json` solo se usa para notificaciones push (FCM). |
| Dispositivo u otros IDs | Sí | Token de notificaciones push (Expo/FCM). Uso: funcionalidad de la app (enviar avisos). No se comparte con terceros. |

**Criterio general para "Uso y manejo de datos" (paso siguiente del formulario):** para cada tipo marcado como recopilado, seleccionar propósito **"Funcionalidad de la app"** (y "Gestión de la cuenta" para info personal), marcar que **no se comparte con terceros**, y que el usuario **no puede solicitar que se borren los datos** solo si no existe esa función (revisar si el backend tiene borrado de cuenta; si no, marcarlo como corresponda).

**Checkboxes exactos marcados en el formulario "Tipos de datos":**

- **Ubicación:** ninguna casilla marcada (ni aproximada ni precisa).
- **Información personal** (3 de 9): Nombre, Dirección de correo electrónico, Identificadores de usuario.
- **Dispositivo u otros IDs** (1 de 1): ID del dispositivo u otros identificadores (token push Expo/FCM).
- **Actividad en apps** (1 de 5): Otro contenido generado por el usuario (texto/descripción de los reportes de falla).
- **Todas las demás categorías** (Información financiera, Salud y fitness, Mensajes, Fotos y videos, Archivos de audio, Archivos y documentos, Calendario, Contactos, Navegación web, Información de la app y rendimiento): sin marcar, 0 tipos seleccionados.

Para los 3 tipos marcados, en el paso "Uso y manejo de datos": propósito **"Funcionalidad de la app"**, **no se comparte con terceros**, **datos necesarios** (no opcionales, ya que requieren login).

**Detalle del cuestionario "Uso y manejo de datos" (paso 4) por cada tipo:**

| Tipo de dato | ¿Recopilado/compartido? | ¿Efímero? | ¿Obligatorio u opcional? | Finalidad |
|---|---|---|---|---|
| Nombre | Solo recopilado | No | Obligatorio | Funcionalidad de la app + Administración de la cuenta |
| Dirección de correo electrónico | Solo recopilado | No | Obligatorio | Funcionalidad de la app + Administración de la cuenta |
| ID de usuario | Solo recopilado | No | Obligatorio | Funcionalidad de la app + Administración de la cuenta |
| Actividad en apps (otro contenido generado por el usuario) | Solo recopilado | No | Obligatorio | Funcionalidad de la app |
| Dispositivo u otros IDs (token push) | Solo recopilado | No | Opcional (depende del permiso de notificaciones) | Funcionalidad de la app |

## 7. Publicación a producción

**Estado al momento de documentar:** build 23 (1.0.2) disponible en el track "Prueba interna", sin revisar aún, 0% en producción.

**Pasos para promover a producción:**

1. Revisar **"Descripción general de la publicación"** en Play Console — debe estar todo en verde: Detalles de acceso, Anuncios, Clasificación del contenido, Público objetivo, Seguridad de los datos, Ficha de la tienda (ícono, gráfico de funciones, capturas, descripciones corta/completa, categoría), Política de privacidad, Datos de contacto.
2. Promover el build: opción rápida = botón **"Promover actualización"** junto a la versión en "Prueba interna" → elegir **"Producción"**. Opción manual = menú "Producción" → "Crear una versión nueva" → seleccionar el AAB.
3. Completar notas de la versión (release notes) en es/en/pt.
4. Revisar el resumen y guardar → "Revisar versión".
5. Elegir porcentaje de implementación (rollout). Para esta app (uso interno, pocos usuarios controlados) se puede ir directo al 100%, sin necesidad de rollout escalonado.
6. Clic en "Iniciar el lanzamiento a producción" y esperar revisión de Google (horas a pocos días).

**Nota sobre visibilidad:** el track "Producción" hace que la app sea pública y descargable por cualquier persona en el Play Store (aunque requiera login para usarla). Si se prefiere que no sea públicamente buscable, la alternativa es "Prueba cerrada" con lista de correos autorizados, o producción con listado no público. Decisión pendiente de confirmar con el equipo si es intencional que sea pública.

## Pendiente / próximos pasos

- [ ] Completar credenciales de prueba reales en Google Play Console.
- [ ] Confirmar `min_version` del backend antes de enviar a revisión.
- [x] Categoría de clasificación del contenido seleccionada.
- [ ] Terminar de responder el resto del cuestionario de clasificación de contenido y confirmar el resumen (paso 3).
- [ ] Cuestionario de seguridad de datos / Data Safety (aún no completado).
- [ ] Réplica de esta configuración en App Store Connect (iOS) cuando se solicite.
