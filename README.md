# PagaYa

PagaYa es una app para gestionar pagos entre amigos: quién debe a quién, cuánto queda pendiente y qué pagos ya están liquidados. Ahora ya está preparada para funcionar con usuarios reales, autenticación por email y persistencia en la nube usando Supabase.

## Qué hace ahora

- Registro y login por email y contraseña.
- Persistencia real de amigos y deudas por usuario en Supabase.
- Permite registrar deudas, marcarlas como pagadas y consultar el historial.
- Incluye recordatorios generados con IA cuando está configurada.
- Si la IA no está disponible, genera un mensaje local de respaldo para no romper la experiencia.

## Stack

- Next.js 15
- React 19
- Tailwind CSS
- Supabase Auth + Postgres
- Genkit para recordatorios opcionales con IA

## Configuración local

1. Crea un proyecto gratuito en Supabase.
2. En el editor SQL de Supabase ejecuta el contenido de [supabase/schema.sql](supabase/schema.sql).
3. Copia [PagaYa/.env.example](PagaYa/.env.example) a un archivo .env y rellena:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GOOGLE_API_KEY=
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

## Despliegue gratuito recomendado

La combinación más razonable para coste cero es:

- Vercel gratis para el frontend Next.js.
- Supabase gratis para autenticación y base de datos.

Pasos:

1. Sube el repositorio a GitHub.
2. Crea el proyecto de Supabase y ejecuta [supabase/schema.sql](supabase/schema.sql).
3. Importa el proyecto en Vercel.
4. Añade en Vercel las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.
5. Añade GOOGLE_API_KEY solo si quieres activar recordatorios con IA.
6. Despliega.

Sin configurar IA, la app seguirá funcionando gracias al recordatorio local de respaldo.

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
