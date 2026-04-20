"use client"

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck, Zap, Users2, LogOut, Moon, Sun, ChevronDown, LoaderCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLoadingScreen } from '@/components/ui/app-loading-screen';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePagaYa } from '@/hooks/use-pagaya';
import type { Theme } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user, signOut, theme, setTheme } = usePagaYa();
  const androidApkUrl = 'https://github.com/MarkelRoman05/PagaYa/releases/download/android-latest/PagaYa-latest-release.apk';
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isChangingTheme, setIsChangingTheme] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState<boolean | null>(null);
  const [isRedirectingToRecovery, setIsRedirectingToRecovery] = useState(false);
  const userMetadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const username = typeof userMetadata.username === 'string' ? userMetadata.username.trim() : '';
  const avatarUrl = typeof userMetadata.avatar_url === 'string' ? userMetadata.avatar_url.trim() : '';
  const sessionName = username || user?.email?.split('@')[0] || 'usuario';
  const avatarLetter = sessionName.charAt(0).toUpperCase();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const queryParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const hasOAuthPayload = Boolean(queryParams.get('code')) || Boolean(hashParams.get('access_token'));

    if (hasOAuthPayload && window.location.protocol !== 'capacitor:' && window.location.protocol !== 'ionic:') {
      const deepLinkTarget = `com.markel.pagaya://auth/callback${window.location.search}${window.location.hash}`;
      window.location.replace(deepLinkTarget);
      return;
    }

    const queryType = queryParams.get('type');
    const hashType = hashParams.get('type');

    if (queryType !== 'recovery' && hashType !== 'recovery') {
      return;
    }

    setIsRedirectingToRecovery(true);

    const hash = window.location.hash || '';
    router.replace(`/auth?mode=reset${hash}`);
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const capacitor = (
      window as Window & {
        Capacitor?: {
          isNativePlatform?: () => boolean;
          getPlatform?: () => string;
        };
      }
    ).Capacitor;

    const isNativeByProtocol = window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:';
    const isNativeByApi =
      typeof capacitor?.isNativePlatform === 'function'
        ? capacitor.isNativePlatform()
        : typeof capacitor?.getPlatform === 'function'
          ? capacitor.getPlatform() !== 'web'
          : false;

    setIsNativeApp(isNativeByProtocol || isNativeByApi);
  }, []);

  useEffect(() => {
    if (!isNativeApp) {
      return;
    }

    if (!isAuthenticated) {
      router.replace('/auth');
      return;
    }

    router.replace('/debts');
  }, [isAuthenticated, isNativeApp, router]);

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleThemeChange = async (nextTheme: string) => {
    if (nextTheme !== 'light' && nextTheme !== 'dark') {
      return;
    }

    if (nextTheme === theme) {
      return;
    }

    setIsChangingTheme(true);

    try {
      await setTheme(nextTheme as Theme);
    } finally {
      setIsChangingTheme(false);
    }
  };

  if (isNativeApp === null) {
    return <AppLoadingScreen title="Iniciando PagaYa" subtitle="Preparando la experiencia móvil..." />;
  }

  if (isRedirectingToRecovery) {
    return <AppLoadingScreen title="Recuperando cuenta" subtitle="Redirigiendo al formulario de nueva contraseña..." />;
  }

  if (isNativeApp) {
    return <AppLoadingScreen title="Redirigiendo" subtitle="Comprobando tu sesión..." />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="container mx-auto flex h-auto max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:h-16 sm:gap-3 sm:px-6 sm:py-0">
          <Link href="/" className="inline-flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Image
              src="/images/PagaYa_logo.svg"
              alt="Logo de PagaYa"
              width={34}
              height={34}
              className="h-9 w-9 sm:h-12 sm:w-12"
              priority
            />
            <span className="hidden text-[1.4rem] font-bold tracking-tight text-foreground sm:inline">
              Paga<span className="text-primary">Ya</span>
            </span>
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background px-2 py-1 pr-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    aria-label="Abrir menú de perfil"
                  >
                    <Avatar className="h-8 w-8 border border-border/80">
                      <AvatarImage src={avatarUrl} alt={sessionName} />
                      <AvatarFallback>{avatarLetter}</AvatarFallback>
                    </Avatar>
                    <div className="hidden min-w-0 sm:block">
                      <p className="max-w-[170px] truncate text-sm font-semibold leading-tight">@{sessionName}</p>
                      <p className="max-w-[170px] truncate text-xs leading-tight text-muted-foreground">{user?.email}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-72 rounded-xl border-border/70 bg-background/95 p-2 backdrop-blur-sm">
                  <DropdownMenuLabel className="space-y-1 px-2 py-2">
                    <p className="truncate text-sm font-semibold leading-tight">@{sessionName}</p>
                    <p className="truncate text-xs font-normal leading-tight text-muted-foreground">{user?.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer rounded-md px-2.5 py-2 font-medium data-[highlighted]:bg-primary/15 data-[highlighted]:text-foreground">
                    <Link href="/debts">Ir a mi panel</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="px-2.5 pb-1 pt-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">Preferencia de tema</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={theme} onValueChange={handleThemeChange}>
                    <DropdownMenuRadioItem value="dark" disabled={isChangingTheme} className="cursor-pointer rounded-md py-2 data-[highlighted]:bg-primary/10 data-[highlighted]:text-foreground">
                      <Moon className="h-4 w-4" />
                      <span className="ml-1">Oscuro</span>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="light" disabled={isChangingTheme} className="cursor-pointer rounded-md py-2 data-[highlighted]:bg-primary/10 data-[highlighted]:text-foreground">
                      <Sun className="h-4 w-4" />
                      <span className="ml-1">Claro</span>
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={isSigningOut}
                    onSelect={(event) => {
                      event.preventDefault();
                      void handleSignOut();
                    }}
                    className="cursor-pointer rounded-md py-2 font-medium text-rose-700 dark:text-rose-400 data-[highlighted]:bg-rose-500/15 data-[highlighted]:text-rose-700 dark:data-[highlighted]:text-rose-300"
                  >
                    {isSigningOut ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" /> : <LogOut className="h-4 w-4 shrink-0" />}
                    <span className="ml-1">{isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 rounded-full border-primary/40 bg-background px-3 text-xs text-primary whitespace-nowrap hover:bg-primary/10 hover:text-primary sm:px-4 sm:text-sm"
              >
                <Link href="/auth">Iniciar sesión</Link>
              </Button>
              <Button asChild size="sm" className="h-9 rounded-full px-3 text-xs whitespace-nowrap sm:px-4 sm:text-sm">
                <Link href="/auth?tab=register">Crear cuenta</Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="relative flex flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,hsl(var(--primary)/0.16),transparent_35%),radial-gradient(circle_at_90%_15%,hsl(var(--primary)/0.08),transparent_40%),radial-gradient(circle_at_50%_100%,hsl(var(--primary)/0.1),transparent_45%)]" />

        <section className="relative container mx-auto grid max-w-6xl gap-10 px-4 pb-14 pt-12 sm:px-6 md:pb-20 md:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-7 text-left animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Gestiona deudas sin drama
            </div>

            <div className="space-y-4">
              <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight text-foreground font-headline sm:text-5xl md:text-6xl">
                Paga con amigos,
                <span className="text-primary"> sin discusiones.</span>
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                PagaYa te ayuda a registrar quién pagó, cuánto debe cada persona y qué falta por saldar, con una experiencia clara y profesional desde móvil o web.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="h-12 rounded-full px-6 text-base">
                <Link href={isAuthenticated ? '/debts' : '/auth'} className="flex items-center gap-2">
                  {isAuthenticated ? 'Ir a mi panel' : 'Empezar gratis'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              {isAuthenticated ? (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-full border-primary/40 bg-background/90 px-6 text-base text-primary hover:bg-primary/10 hover:text-primary"
                >
                  <Link href="/groups">Ver grupos</Link>
                </Button>
              ) : null}
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 rounded-full border-primary/40 bg-background/90 px-6 text-base text-primary hover:bg-primary/10 hover:text-primary"
              >
                <a href={androidApkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  Descargar APK Android
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="grid max-w-xl grid-cols-3 gap-3 pt-2">
              <div className="rounded-2xl border border-border/70 bg-card/80 px-3 py-4 backdrop-blur">
                <p className="text-2xl font-bold leading-none">100%</p>
                <p className="mt-1 text-xs text-muted-foreground">Control de gastos</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card/80 px-3 py-4 backdrop-blur">
                <p className="text-2xl font-bold leading-none">24/7</p>
                <p className="mt-1 text-xs text-muted-foreground">Acceso a tus cuentas</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card/80 px-3 py-4 backdrop-blur">
                <p className="text-2xl font-bold leading-none">1 clic</p>
                <p className="mt-1 text-xs text-muted-foreground">Para ver saldos</p>
              </div>
            </div>
          </div>

          <div className="relative animate-in fade-in zoom-in-95 duration-700 lg:justify-self-end">
            <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
            <div className="absolute -bottom-6 -right-8 h-28 w-28 rounded-full bg-primary/20 blur-2xl" />
            <div className="relative rounded-3xl border border-primary/20 bg-card/95 p-5 shadow-2xl shadow-primary/10 backdrop-blur">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image
                    src="/images/PagaYa_logo.svg"
                    alt="Logo de PagaYa"
                    width={34}
                    height={34}
                    className="h-9 w-9"
                  />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Resumen mensual</p>
                    <p className="text-base font-semibold">Grupo Escapada</p>
                  </div>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Al día</span>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total pendiente</span>
                    <span className="font-semibold">146,50 EUR</span>
                  </div>
                  <div className="h-2 rounded-full bg-primary/10">
                    <div className="h-full w-2/3 rounded-full bg-primary" />
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/75 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Cena viernes</span>
                    <span className="font-medium">+42,00 EUR</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/75 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Gasolina</span>
                    <span className="font-medium">+28,50 EUR</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/75 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Apartamento</span>
                    <span className="font-medium">+76,00 EUR</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative border-y border-border/70 bg-card/70 py-16 sm:py-20">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold tracking-tight font-headline sm:text-4xl">Todo lo que necesitas para cuentas compartidas</h2>
              <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                Menos mensajes, menos confusiones y más tiempo para disfrutar con tu gente.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <article className="rounded-3xl border border-border/70 bg-background/85 p-6 text-left shadow-sm transition-transform duration-300 hover:-translate-y-1">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">Seguridad por defecto</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Tus datos y movimientos quedan protegidos para que solo tu grupo vea lo que importa.
                </p>
              </article>

              <article className="rounded-3xl border border-border/70 bg-background/85 p-6 text-left shadow-sm transition-transform duration-300 hover:-translate-y-1">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">Actualización instantánea</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Registra pagos y deudas en segundos para que el saldo de cada persona siempre esté al día.
                </p>
              </article>

              <article className="rounded-3xl border border-border/70 bg-background/85 p-6 text-left shadow-sm transition-transform duration-300 hover:-translate-y-1">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Users2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">Pensado para grupos</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Ideal para viajes, pisos compartidos o cenas: cada gasto queda claro y repartido.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="relative container mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight font-headline sm:text-4xl">Cómo funciona</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Un flujo simple para que cada plan tenga cuentas claras desde el minuto uno.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-card/80 p-5">
              <p className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">1</p>
              <h3 className="text-lg font-semibold">Crea tu grupo</h3>
              <p className="mt-2 text-sm text-muted-foreground">Añade amigos y define vuestro espacio para registrar gastos compartidos.</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card/80 p-5">
              <p className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">2</p>
              <h3 className="text-lg font-semibold">Apunta cada gasto</h3>
              <p className="mt-2 text-sm text-muted-foreground">Indica quién pagó y cuánto; PagaYa ordena automáticamente los saldos.</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card/80 p-5">
              <p className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">3</p>
              <h3 className="text-lg font-semibold">Liquida sin fricción</h3>
              <p className="mt-2 text-sm text-muted-foreground">Consulta quién debe a quién y cierra cuentas rápido, sin discusiones.</p>
            </div>
          </div>
        </section>

        <section className="relative pb-16 sm:pb-20">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <div className="rounded-3xl border border-primary/20 bg-primary/10 px-6 py-10 text-center shadow-xl shadow-primary/10 sm:px-10">
              <h2 className="text-2xl font-bold tracking-tight font-headline sm:text-3xl">Empieza hoy con PagaYa</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Centraliza deudas, simplifica pagos y disfruta de tus planes sin preocuparte por las cuentas pendientes.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 rounded-full px-7">
                  <Link href={isAuthenticated ? '/debts' : '/auth?tab=register'}>
                    {isAuthenticated ? 'Abrir mi panel' : 'Crear cuenta gratis'}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 rounded-full border-primary/40 bg-background/95 px-7 text-primary hover:bg-primary/10 hover:text-primary">
                  <a href={androidApkUrl} target="_blank" rel="noopener noreferrer">Probar en Android</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} PagaYa. Cuentas claras, amistades largas.</p>
      </footer>
    </div>
  );
}