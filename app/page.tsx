"use client"

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Wallet, ArrowRight, ShieldCheck, Zap, Users2, LogOut, Moon, Sun, ChevronDown, LoaderCircle } from 'lucide-react';
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
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isChangingTheme, setIsChangingTheme] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState<boolean | null>(null);
  const userMetadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const username = typeof userMetadata.username === 'string' ? userMetadata.username.trim() : '';
  const avatarUrl = typeof userMetadata.avatar_url === 'string' ? userMetadata.avatar_url.trim() : '';
  const sessionName = username || user?.email?.split('@')[0] || 'usuario';
  const avatarLetter = sessionName.charAt(0).toUpperCase();

  useEffect(() => {
    const hasCapacitor = typeof window !== 'undefined' && 'Capacitor' in window;
    setIsNativeApp(hasCapacitor);
  }, []);

  useEffect(() => {
    if (!isNativeApp) {
      return;
    }

    if (!isAuthenticated) {
      router.replace('/auth');
      return;
    }

    router.replace('/dashboard');
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
    return <AppLoadingScreen title="Iniciando PagaYa" subtitle="Preparando la experiencia movil..." />;
  }

  if (isNativeApp) {
    return <AppLoadingScreen title="Redirigiendo" subtitle="Comprobando tu sesion..." />;
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
                    <Link href="/dashboard">Ir a mi panel</Link>
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

      <main className="flex-1 flex flex-col">
        <section className="container mx-auto flex max-w-6xl flex-col items-center px-4 py-12 text-center sm:px-6 md:py-24">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-8 animate-in fade-in zoom-in duration-700">
            <Wallet className="w-12 h-12" />
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground font-headline sm:text-5xl md:text-6xl">
            Paga<span className="text-primary">Ya</span>
          </h1>
          <p className="mb-10 max-w-2xl text-base text-muted-foreground sm:text-xl">
            La forma más sencilla y elegante de gestionar deudas con tus amigos. Olvida los líos de dinero y disfruta de tus planes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg" className="rounded-full px-8 h-14 text-lg">
              <Link href={isAuthenticated ? '/dashboard' : '/auth'} className="flex items-center gap-2">
                {isAuthenticated ? 'Ir a mi panel' : 'Empezar ahora'} <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            {!isAuthenticated && (
              <Button asChild variant="outline" size="lg" className="rounded-full px-8 h-14 text-lg">
                <Link href="/auth?tab=register">Crear cuenta</Link>
              </Button>
            )}
          </div>
        </section>

        <section className="border-y border-border bg-card py-16 sm:py-20">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-4">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">Seguro y fiable</h3>
                <p className="text-muted-foreground">Tus cuentas siempre claras y guardadas para que nadie se olvide de nada.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-4">
                  <Zap className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">Rápido y sencillo</h3>
                <p className="text-muted-foreground">Añade deudas, amigos y gestiona todo en segundos con una interfaz intuitiva.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-4">
                  <Users2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">Entre amigos</h3>
                <p className="text-muted-foreground">Añade a tus amigos y gestiona deudas conjuntas en segundos.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-muted-foreground text-sm border-t border-border">
        <p>© {new Date().getFullYear()} PagaYa. Cuentas claras, amistades largas.</p>
      </footer>
    </div>
  );
}