# PagaYa

PagaYa es una app para gestionar pagos entre amigos: quién debe a quién, cuánto queda pendiente y qué pagos ya están liquidados. Ahora ya está preparada para funcionar con usuarios reales, autenticación por email y persistencia en la nube usando Supabase.

## Qué hace ahora

- Registro y login por email y contraseña.
- Persistencia real de amigos y deudas por usuario en Supabase.
- Permite registrar deudas, marcarlas como pagadas y consultar el historial.

## Stack

- Next.js 15
- React 19
- Tailwind CSS
- Supabase Auth + Postgres

## Configuración local

1. Crea un proyecto gratuito en Supabase.
2. En el editor SQL de Supabase ejecuta el contenido de [supabase/schema.sql](supabase/schema.sql).
3. Copia [PagaYa/.env.example](PagaYa/.env.example) a un archivo .env y rellena:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

4. En Supabase Auth, habilita Email/Password en Authentication > Providers.
5. Si quieres acceso directo tras registrarte, desactiva la confirmación obligatoria por email. Si la dejas activa, el usuario tendrá que verificar su correo antes de entrar.

## Desarrollo local

```bash
npm ci
npm run dev
```

La aplicación arranca en el puerto 9002.

## Comandos útiles

```bash
npm run build
npm run typecheck
```

## App móvil con Capacitor (sin reescribir frontend)

Este proyecto ya está preparado para ejecutarse como app móvil en Android/iOS usando Capacitor y reutilizando la UI responsive de Next.js.

Modo APK autonomo (sin localhost ni npm run dev):

```bash
npm run mobile:apk:debug
```

Esto genera y empaqueta la web estática en `out/`, sincroniza Capacitor usando `CAP_WEB_DIR=out` y compila el APK debug.

APK resultante:

- `android/app/build/outputs/apk/debug/app-debug.apk`

Cómo funciona en este repo:

- Capacitor crea una app nativa contenedora (carpetas android/ e ios/).
- En desarrollo, la app carga tu servidor Next local (live reload) usando la variable CAP_SERVER_URL.
- No necesitas export estático para este flujo.

Flujo de desarrollo:

1. Arranca Next.js:

```bash
npm run dev
```

2. En otra terminal, ejecuta Android (emulador):

```bash
npm run mobile:dev:android
```

Android físico por USB (recomendado en este entorno):

1. Activa opciones de desarrollador y depuración USB en el móvil.
2. Conecta por USB y acepta el prompt de confianza.
3. Verifica el dispositivo:

```bash
source ~/.bashrc
adb devices
```

4. Lanza la app:

```bash
npm run mobile:dev:android:usb
```

Este script crea un túnel `adb reverse` para que el móvil use `http://localhost:9002` hacia tu servidor Next local.

3. Para iOS (solo en macOS con Xcode):

```bash
npm run mobile:dev:ios
```

Comandos de mantenimiento:

```bash
npm run cap:sync
npm run cap:android
npm run cap:ios
```

Notas importantes:

- En emulador Android, 10.0.2.2 apunta al localhost de tu máquina.
- En Android físico por USB puedes evitar IP LAN con `adb reverse`; por WiFi sí necesitarás IP LAN en CAP_SERVER_URL.
- iOS requiere macOS + Xcode para compilar y ejecutar la app nativa.
- Si aparece ERR_SDK_NOT_FOUND en Android, instala Android Studio y configura ANDROID_HOME/ANDROID_SDK_ROOT.

## Despliegue gratuito recomendado

La combinación más razonable para coste cero es:

- Vercel gratis para el frontend Next.js.
- Supabase gratis para autenticación y base de datos.

Pasos:

1. Sube el repositorio a GitHub.
2. Crea el proyecto de Supabase y ejecuta [supabase/schema.sql](supabase/schema.sql).
3. Importa el proyecto en Vercel.
4. Añade en Vercel las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.
5. Despliega.

## Qué falta para una versión comercial

- Invitaciones y recordatorios por canales reales como email o WhatsApp.
- Sincronización multiusuario sobre una misma deuda compartida entre dos cuentas reales.
- Recuperación de contraseña, perfiles y onboarding.
- Reglas de privacidad, analítica y logs.
- Tests end-to-end y monitorización.

## Siguiente evolución recomendada

Si quieres convertir esta base en producto serio, la siguiente iteración lógica es:

1. Añadir recuperación de contraseña y edición de perfil.
2. Diseñar deudas compartidas entre usuarios invitados y no sólo contactos manuales.
3. Añadir notificaciones reales por email o WhatsApp.
