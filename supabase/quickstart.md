# Supabase Quickstart para PagaYa

## 1. Crear el proyecto

1. Entra en https://supabase.com/dashboard/new
2. Crea una organización si aún no tienes una.
3. Pulsa New project.
4. Usa un nombre claro, por ejemplo: PagaYa.
5. Elige una región cercana, por ejemplo Europa Oeste si vas a usarlo desde España.
6. Pon una contraseña fuerte para la base de datos y guárdala.
7. Espera a que el proyecto termine de provisionarse.

## 2. Activar autenticación por email

1. Ve a Authentication.
2. Abre Sign In / Providers.
3. Activa Email.
4. Decide si quieres Confirm email activado o desactivado:
   Si lo desactivas, el login funciona justo después del registro.
   Si lo activas, el usuario deberá confirmar su correo antes de entrar.

## 3. Crear tablas y politicas

1. Ve a SQL Editor.
2. Crea una nueva query.
3. Copia el contenido de [supabase/schema.sql](supabase/schema.sql).
4. Ejecútalo completo.

Este script tambien crea el bucket publico avatars y sus politicas RLS para que cada usuario pueda subir solo sus propias imagenes de perfil.

## 4. Sacar las claves que necesita la app

1. Ve a Project Settings.
2. Abre API.
3. Copia estos valores:
   NEXT_PUBLIC_SUPABASE_URL: Project URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY: anon public key

## 5. Conectar el proyecto local

1. Crea un archivo .env en la raíz del proyecto.
2. Usa como base [PagaYa/.env.example](PagaYa/.env.example).
3. Rellena al menos:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

4. Reinicia el servidor de desarrollo si estaba abierto.

## 6. Comprobar que funciona

1. Ejecuta npm run dev.
2. Entra en /auth.
3. Registra una cuenta nueva.
4. Inicia sesión.
5. Crea un amigo.
6. Crea una deuda.
7. Refresca la página y comprueba que los datos siguen ahí.

## 7. Conectar Vercel gratis

1. Importa el repo en Vercel.
2. En Settings > Environment Variables añade:
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
3. Despliega.

## 8. Verificación rápida en Supabase

Puedes comprobar que hay datos entrando en:

1. Table Editor > friends
2. Table Editor > debts
3. Authentication > Users

## Notas

- No uses la service_role key en el frontend.
- La anon key es la correcta para Next.js cliente.
- Las políticas RLS del esquema ya limitan cada fila a su propio usuario.