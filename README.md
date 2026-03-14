# PagaYa

<p align="center">
	Plataforma para gestionar deudas entre amigos, con autenticacion real, persistencia en la nube y experiencia web + movil.
</p>

<p align="center">
	<a href="https://github.com/MarkelRoman05/PagaYa/stargazers"><img src="https://img.shields.io/github/stars/MarkelRoman05/PagaYa?style=for-the-badge" alt="Stars"></a>
	<a href="https://github.com/MarkelRoman05/PagaYa/network/members"><img src="https://img.shields.io/github/forks/MarkelRoman05/PagaYa?style=for-the-badge" alt="Forks"></a>
	<a href="https://github.com/MarkelRoman05/PagaYa/issues"><img src="https://img.shields.io/github/issues/MarkelRoman05/PagaYa?style=for-the-badge" alt="Issues"></a>
	<a href="https://github.com/MarkelRoman05/PagaYa/blob/main/README.md"><img src="https://img.shields.io/badge/status-production--ready-00A86B?style=for-the-badge" alt="Status"></a>
	<a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js"></a>
	<a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase"></a>
</p>

## Tabla de contenidos

- [Vision del producto](#vision-del-producto)
- [Funcionalidades principales](#funcionalidades-principales)
- [Stack tecnologico](#stack-tecnologico)
- [Arquitectura](#arquitectura)
- [Demo y despliegue](#demo-y-despliegue)
- [Empezar en local](#empezar-en-local)
- [Variables de entorno](#variables-de-entorno)
- [Scripts disponibles](#scripts-disponibles)
- [Build movil con Capacitor](#build-movil-con-capacitor)
- [Modelo de datos](#modelo-de-datos)
- [Roadmap](#roadmap)
- [Contribuir](#contribuir)

## Vision del producto

PagaYa resuelve un problema cotidiano: organizar pagos entre amigos sin friccion, sin discusiones y sin perder trazabilidad.

La app esta pensada para un uso real en produccion:

- Autenticacion por email con Supabase.
- Persistencia cloud con politicas RLS.
- Flujo de invitaciones entre usuarios reales.
- Confirmacion de pagos entre las dos partes.
- Historial de actividad y gestion de sesiones por dispositivo.
- Experiencia responsive web y empaquetado movil nativo (Android/iOS) con Capacitor.

## Funcionalidades principales

- Registro e inicio de sesion por email.
- Perfil de usuario con username y avatar.
- Invitaciones de amistad por username.
- Aceptacion/rechazo de invitaciones entrantes.
- Alta de deudas con descripcion, importe y tipo.
- Estados de deuda: pendiente, pago solicitado, pagada.
- Confirmacion de pago por la otra parte para evitar cierres unilaterales.
- Eliminacion de amistades y limpieza de deudas relacionadas.
- Dashboard con resumen de lo que te deben y lo que debes.
- Historial para seguimiento de movimientos.
- Gestion de sesiones activas por dispositivo.
- Cambio de tema visual (claro/oscuro).

## Stack tecnologico

### Frontend

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS + Radix UI
- Lucide Icons

### Backend y datos

- Supabase Auth
- Supabase Postgres
- Supabase Storage (bucket de avatares)
- RLS (Row Level Security)

### Movil

- Capacitor 8
- Android Studio / Xcode para builds nativos

## Arquitectura

```text
UI (Next.js + React)
	 |
	 |-- Hooks de dominio (use-pagaya)
	 |-- Cliente Supabase (auth + db + storage)
	 |
Supabase
	 |-- Authentication
	 |-- Postgres (friends, debts, invitations, user_device_sessions)
	 |-- Storage (avatars)
```

## Demo y despliegue

- Web (Vercel): recomendado para entorno productivo.
- Movil (Capacitor): export estatico + sync a plataformas nativas.

Si vas a publicar la demo, añade aqui tus enlaces:

- URL web: https://pagaya.vercel.app/
- Android: https://github.com/MarkelRoman05/PagaYa/releases/tag/android-latest

## Empezar en local

### 1) Clonar e instalar

```bash
git clone https://github.com/MarkelRoman05/PagaYa.git
cd PagaYa
npm install
```

### 2) Configurar entorno

```bash
cp .env.example .env
```

Rellena las variables de Supabase y arranca el proyecto:

```bash
npm run dev
```

La app web se sirve en:

```text
http://localhost:9002
```

## Variables de entorno

Usa como base el archivo `.env.example`.

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-publica-anon
```

## Scripts disponibles

### Desarrollo y calidad

- `npm run dev`: servidor local en puerto 9002 con Turbopack.
- `npm run build`: build de produccion.
- `npm run start`: arranque de build en produccion.
- `npm run lint`: analisis de lint.
- `npm run typecheck`: chequeo de tipos con TypeScript.

### Capacitor y movil

- `npm run cap:sync`: sincroniza assets web con plataformas nativas.
- `npm run cap:android`: abre proyecto Android en Android Studio.
- `npm run cap:ios`: abre proyecto iOS en Xcode.
- `npm run mobile:build:web`: build estatico para contenedor movil.
- `npm run mobile:sync:android`: sincroniza build estatico en Android.
- `npm run mobile:apk:debug`: genera APK debug en Android.
- `npm run mobile:dev:android`: ejecuta Android contra servidor local (emulador).
- `npm run mobile:dev:android:usb`: ejecuta Android por USB con `adb reverse`.
- `npm run mobile:dev:ios`: ejecuta iOS contra servidor local.

### Versionado

- `npm run release:patch`
- `npm run release:minor`
- `npm run release:major`

## Build movil con Capacitor

Flujo rapido para Android (debug):

```bash
npm run mobile:apk:debug
```

Este comando:

1. Genera build web estatico.
2. Sincroniza con Android.
3. Ejecuta Gradle para construir la APK debug.

## Modelo de datos

Entidades principales en Supabase:

- `friends`: relaciones de amistad entre usuarios.
- `friend_invitations`: invitaciones pendientes/aceptadas/rechazadas.
- `debts`: deudas con estado y trazabilidad de pago.
- `user_device_sessions`: sesiones activas por dispositivo.

El esquema SQL de referencia esta en `supabase/schema.sql`.

## Roadmap

- Notificaciones push para solicitudes y confirmaciones.
- Division automatica de gastos en grupos.
- Exportacion de historico (CSV/PDF).
- Multi-moneda y conversion automatica.
- Analitica de gastos por categorias.

## Contribuir

1. Haz fork del repositorio.
2. Crea una rama de feature: `git checkout -b feature/nueva-funcionalidad`.
3. Realiza tus cambios y commits descriptivos.
4. Sube tu rama: `git push origin feature/nueva-funcionalidad`.
5. Abre un Pull Request.

## Autor

- Markel Román

---

Si este proyecto te resulta util, una estrella ayuda mucho al crecimiento del repositorio.

