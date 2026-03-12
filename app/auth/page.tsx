"use client"

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, LoaderCircle, LogIn, Mail, ShieldCheck, UserPlus, Wallet } from 'lucide-react';
import { usePagaYa } from '@/hooks/use-pagaya';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

function AuthPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
        <p>Preparando acceso...</p>
      </div>
    </div>
  );
}
export default function AuthPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <AuthPageContent />
    </Suspense>
  );
}
function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { isReady, isConfigured, isAuthenticated, isLoadingAuth, signIn, signUp, session } = usePagaYa();
  const [loginValues, setLoginValues] = useState({ email: '', password: '' });
  const [registerValues, setRegisterValues] = useState({ email: '', password: '', confirmPassword: '' });
  const [isSubmitting, setIsSubmitting] = useState<'login' | 'register' | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const nextPath = searchParams.get('next') || '/dashboard';

  useEffect(() => {
    if (!isReady || isLoadingAuth) {
      return;
    }

    if (isAuthenticated) {
      router.replace(nextPath);
    }
  }, [isAuthenticated, isLoadingAuth, isReady, nextPath, router]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!loginValues.email.trim() || !loginValues.password) {
      toast({
        title: 'Faltan credenciales',
        description: 'Introduce tu email y contraseña.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting('login');

    try {
      await signIn({ email: loginValues.email.trim().toLowerCase(), password: loginValues.password });
      router.replace(nextPath);
    } catch (error) {
      toast({
        title: 'No se pudo iniciar sesión',
        description: error instanceof Error ? error.message : 'Revisa tus credenciales.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const email = registerValues.email.trim().toLowerCase();

    if (!email || !registerValues.password || !registerValues.confirmPassword) {
      toast({
        title: 'Completa el formulario',
        description: 'Necesitamos email y contraseña para crear tu cuenta.',
        variant: 'destructive',
      });
      return;
    }

    if (registerValues.password.length < 6) {
      toast({
        title: 'Contraseña demasiado corta',
        description: 'Usa al menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    if (registerValues.password !== registerValues.confirmPassword) {
      toast({
        title: 'Las contraseñas no coinciden',
        description: 'Repite la misma contraseña en ambos campos.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting('register');
    setSuccessMessage('');

    try {
      await signUp({ email, password: registerValues.password });
      setRegisterValues({ email, password: '', confirmPassword: '' });

      if (!session) {
        setSuccessMessage('Cuenta creada. Revisa tu correo para confirmar el acceso si tienes verificación por email activada en Supabase.');
      } else {
        router.replace(nextPath);
      }
    } catch (error) {
      toast({
        title: 'No se pudo crear la cuenta',
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(null);
    }
  };

  if (!isReady || isLoadingAuth) {
    return <AuthPageFallback />;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto min-h-screen px-6 py-12 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
        <section className="space-y-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-primary/10 text-primary items-center justify-center">
            <Wallet className="w-9 h-9" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight font-headline">
              Paga<span className="text-primary">Ya</span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Accede a tu espacio personal y guarda de forma persistente amigos, deudas e historial desde cualquier dispositivo.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  Cuenta segura
                </CardTitle>
                <CardDescription>Email y contraseña con sesión persistente.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="w-5 h-5 text-primary" />
                  Datos en la nube
                </CardTitle>
                <CardDescription>Tus amigos y deudas quedan guardados.</CardDescription>
              </CardHeader>
            </Card>
          </div>

          <p className="text-sm text-muted-foreground">
            ¿Prefieres volver a la portada? <Link href="/" className="text-primary underline underline-offset-4">Ir al inicio</Link>
          </p>
        </section>

        <section>
          <Card className="shadow-xl border-primary/10">
            <CardHeader>
              <CardTitle>Acceso a tu cuenta</CardTitle>
              <CardDescription>
                Usa una cuenta propia para que cada usuario tenga sus amigos y deudas aislados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isConfigured && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Falta configurar Supabase</AlertTitle>
                  <AlertDescription>
                    Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno y ejecuta el esquema SQL incluido en el proyecto.
                  </AlertDescription>
                </Alert>
              )}

              {successMessage && (
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertTitle>Registro completado</AlertTitle>
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}

              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Registro</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        value={loginValues.email}
                        onChange={(event) => setLoginValues((current) => ({ ...current, email: event.target.value }))}
                        placeholder="tu@email.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Contraseña</Label>
                      <Input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        value={loginValues.password}
                        onChange={(event) => setLoginValues((current) => ({ ...current, password: event.target.value }))}
                        placeholder="••••••••"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={!isConfigured || isSubmitting === 'login'}>
                      {isSubmitting === 'login' ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                      Entrar
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="space-y-4">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        autoComplete="email"
                        value={registerValues.email}
                        onChange={(event) => setRegisterValues((current) => ({ ...current, email: event.target.value }))}
                        placeholder="tu@email.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Contraseña</Label>
                      <Input
                        id="register-password"
                        type="password"
                        autoComplete="new-password"
                        value={registerValues.password}
                        onChange={(event) => setRegisterValues((current) => ({ ...current, password: event.target.value }))}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-confirm">Repetir contraseña</Label>
                      <Input
                        id="register-confirm"
                        type="password"
                        autoComplete="new-password"
                        value={registerValues.confirmPassword}
                        onChange={(event) => setRegisterValues((current) => ({ ...current, confirmPassword: event.target.value }))}
                        placeholder="Repite tu contraseña"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={!isConfigured || isSubmitting === 'register'}>
                      {isSubmitting === 'register' ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      Crear cuenta
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}