"use client"

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck, Zap, Users2, LogOut, Moon, Sun, ChevronDown, LoaderCircle, Download, ArrowDownLeft, ArrowUpRight, Receipt, HandCoins, Sparkles, Globe, Smartphone } from 'lucide-react';
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
    if (typeof window === 'undefined') return;
    const queryParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const hasOAuthPayload = Boolean(queryParams.get('code')) || Boolean(hashParams.get('access_token'));
    if (hasOAuthPayload && window.location.protocol !== 'capacitor:' && window.location.protocol !== 'ionic:') {
      window.location.replace(`com.markel.pagaya://auth/callback${window.location.search}${window.location.hash}`);
      return;
    }
    const queryType = queryParams.get('type');
    const hashType = hashParams.get('type');
    if (queryType !== 'recovery' && hashType !== 'recovery') return;
    setIsRedirectingToRecovery(true);
    const hash = window.location.hash || '';
    router.replace(`/auth?mode=reset${hash}`);
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const capacitor = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor;
    const isNativeByProtocol = window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:';
    const isNativeByApi = typeof capacitor?.isNativePlatform === 'function'
      ? capacitor.isNativePlatform()
      : typeof capacitor?.getPlatform === 'function' ? capacitor.getPlatform() !== 'web' : false;
    setIsNativeApp(isNativeByProtocol || isNativeByApi);
  }, []);

  useEffect(() => {
    if (!isNativeApp) return;
    if (!isAuthenticated) { router.replace('/auth'); return; }
    router.replace('/debts');
  }, [isAuthenticated, isNativeApp, router]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try { await signOut(); } finally { setIsSigningOut(false); }
  };

  const handleThemeChange = async (nextTheme: string) => {
    if (nextTheme !== 'light' && nextTheme !== 'dark') return;
    if (nextTheme === theme) return;
    setIsChangingTheme(true);
    try { await setTheme(nextTheme as Theme); } finally { setIsChangingTheme(false); }
  };

  if (isNativeApp === null) return <AppLoadingScreen title="Iniciando PagaYa" subtitle="Preparando la experiencia móvil..." />;
  if (isRedirectingToRecovery) return <AppLoadingScreen title="Recuperando cuenta" subtitle="Redirigiendo al formulario de nueva contraseña..." />;
  if (isNativeApp) return <AppLoadingScreen title="Redirigiendo" subtitle="Comprobando tu sesión..." />;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a1628]/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/images/PagaYa_logo.svg" alt="PagaYa" width={32} height={32} className="h-8 w-8" priority />
            <span className="text-xl font-bold text-white">Paga<span className="text-[#4dc9f6]">Ya</span></span>
          </Link>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2 py-1 pr-3 text-left transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4dc9f6]/60" aria-label="Menú de perfil">
                  <Avatar className="h-8 w-8 border border-white/20">
                    <AvatarImage src={avatarUrl} alt={sessionName} />
                    <AvatarFallback className="bg-[#4dc9f6]/20 text-[#4dc9f6] text-xs font-semibold">{avatarLetter}</AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block">
                    <p className="max-w-[150px] truncate text-sm font-medium text-white">@{sessionName}</p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-xl border-white/10 bg-[#0f1d32] p-1.5 text-white">
                <DropdownMenuLabel className="px-2.5 py-2">
                  <p className="font-semibold">@{sessionName}</p>
                  <p className="text-xs font-normal text-white/50">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-2.5 py-2 font-medium data-[highlighted]:bg-white/10">
                  <Link href="/debts">Ir a mi panel</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuLabel className="px-2.5 pb-1 pt-0 text-xs font-medium uppercase tracking-wider text-white/40">Tema</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={theme} onValueChange={handleThemeChange}>
                  <DropdownMenuRadioItem value="dark" disabled={isChangingTheme} className="cursor-pointer rounded-lg py-2 data-[highlighted]:bg-white/10">
                    <Moon className="h-4 w-4" /><span className="ml-1">Oscuro</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="light" disabled={isChangingTheme} className="cursor-pointer rounded-lg py-2 data-[highlighted]:bg-white/10">
                    <Sun className="h-4 w-4" /><span className="ml-1">Claro</span>
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem disabled={isSigningOut} onSelect={(e) => { e.preventDefault(); void handleSignOut(); }} className="cursor-pointer rounded-lg py-2 font-medium text-red-400 data-[highlighted]:bg-red-500/10">
                  {isSigningOut ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  <span className="ml-1">{isSigningOut ? 'Cerrando...' : 'Cerrar sesión'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="h-9 rounded-full px-4 text-sm text-white/70 hover:text-white hover:bg-white/10">
                <Link href="/auth">Iniciar sesión</Link>
              </Button>
              <Button asChild size="sm" className="h-9 rounded-full bg-[#4dc9f6] px-5 text-sm font-semibold text-[#0a1628] hover:bg-[#4dc9f6]/90 shadow-lg shadow-[#4dc9f6]/25">
                <Link href="/auth?tab=register">Crear cuenta</Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">
        {/* ─── Hero ─── */}
        <section className="relative overflow-hidden bg-[#0a1628]">
          {/* Background grid + glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(77,201,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(77,201,246,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
            <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[#4dc9f6]/8 blur-[120px]" />
            <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-[#4dc9f6]/5 blur-[100px]" />
          </div>

          <div className="relative container mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-6 md:pb-28 md:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
            {/* Left: copy */}
            <div className="space-y-8 text-left animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#4dc9f6]/20 bg-[#4dc9f6]/10 px-4 py-1.5 text-xs font-medium tracking-wide text-[#4dc9f6]">
                <Sparkles className="h-3.5 w-3.5" />
                Gestión de deudas para amigos y familia
              </div>

              <div className="space-y-5">
                <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl text-balance">
                  Cuentas claras,
                  <br />
                  <span className="bg-gradient-to-r from-[#4dc9f6] via-[#6dd5fa] to-[#4dc9f6] bg-clip-text text-transparent">amistades intactas.</span>
                </h1>
                <p className="max-w-lg text-base leading-relaxed text-white/50 sm:text-lg">
                  Registra quién pagó, cuánto debe cada persona y qué falta por saldar. Sin mensajes perdidos, sin malentendidos.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-13 rounded-full bg-[#4dc9f6] px-8 text-base font-bold text-[#0a1628] shadow-xl shadow-[#4dc9f6]/30 transition-all hover:shadow-2xl hover:shadow-[#4dc9f6]/40 hover:-translate-y-0.5">
                  <Link href={isAuthenticated ? '/debts' : '/auth'} className="flex items-center gap-2">
                    {isAuthenticated ? 'Ir a mi panel' : 'Empezar gratis'}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-13 rounded-full border-white/20 bg-white/5 px-8 text-base text-white backdrop-blur-sm hover:bg-white/10 hover:text-white">
                  <a href={androidApkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Descargar APK
                  </a>
                </Button>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 pt-2 text-sm text-white/40">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4dc9f6]/15">
                    <ArrowDownLeft className="h-3.5 w-3.5 text-[#4dc9f6]" />
                  </div>
                  <span>Te deben <strong className="text-white">146,50 €</strong></span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
                    <ArrowUpRight className="h-3.5 w-3.5 text-white/60" />
                  </div>
                  <span>Debes <strong className="text-white">42,00 €</strong></span>
                </div>
              </div>
            </div>

            {/* Right: mockup card */}
            <div className="relative animate-in fade-in zoom-in-95 duration-700 delay-150 lg:justify-self-end">
              <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-[#4dc9f6]/15 via-transparent to-[#4dc9f6]/5 blur-2xl" />
              <div className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4dc9f6]/15">
                      <Image src="/images/PagaYa_logo.svg" alt="PagaYa" width={22} height={22} className="h-[22px] w-[22px]" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">Resumen mensual</p>
                      <p className="text-sm font-semibold text-white">Grupo Escapada</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">Al día</span>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 flex items-center justify-between text-sm">
                      <span className="text-white/50">Total pendiente</span>
                      <span className="text-xl font-bold text-white">146,50 €</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div className="h-full w-[65%] rounded-full bg-gradient-to-r from-[#4dc9f6] to-[#6dd5fa]" />
                    </div>
                  </div>

                  <div className="grid gap-2.5">
                    {[
                      { label: 'Cena viernes', amount: '+42,00 €', icon: Receipt },
                      { label: 'Gasolina', amount: '+28,50 €', icon: HandCoins },
                      { label: 'Apartamento', amount: '+76,00 €', icon: Receipt },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.06]">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4dc9f6]/15">
                            <item.icon className="h-4 w-4 text-[#4dc9f6]" />
                          </div>
                          <span className="text-sm font-medium text-white/80">{item.label}</span>
                        </div>
                        <span className="text-sm font-semibold text-[#4dc9f6]">{item.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom wave */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#4dc9f6]/20 to-transparent" />
        </section>

        {/* ─── Features ─── */}
        <section className="relative bg-background py-20 sm:py-24">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-14 text-center">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#4dc9f6]">Funcionalidades</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Todo lo que necesitas para cuentas compartidas</h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">Menos mensajes, menos confusiones y más tiempo para disfrutar con tu gente.</p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {[
                { icon: ShieldCheck, title: 'Seguridad por defecto', desc: 'Tus datos y movimientos quedan protegidos para que solo tu grupo vea lo que importa.', gradient: 'from-[#4dc9f6]/10 to-[#4dc9f6]/5' },
                { icon: Zap, title: 'Actualización instantánea', desc: 'Registra pagos y deudas en segundos para que el saldo de cada persona siempre esté al día.', gradient: 'from-amber-500/10 to-amber-500/5' },
                { icon: Users2, title: 'Pensado para grupos', desc: 'Ideal para viajes, pisos compartidos o cenas: cada gasto queda claro y repartido.', gradient: 'from-[#4dc9f6]/10 to-[#4dc9f6]/5' },
              ].map((f) => (
                <article key={f.title} className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-7 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/[0.06] hover:border-primary/20">
                  <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                  <div className="relative">
                    <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                      <f.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{f.title}</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How it works ─── */}
        <section className="relative border-y border-border/60 bg-muted/30 py-20 sm:py-24">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-14 text-center">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#4dc9f6]">Cómo funciona</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Tres pasos, sin complicaciones</h2>
            </div>

            <div className="relative grid gap-8 md:grid-cols-3">
              {/* Connecting line */}
              <div className="pointer-events-none absolute left-[20%] right-[20%] top-7 hidden h-px md:block">
                <div className="h-full bg-gradient-to-r from-transparent via-border to-transparent" />
                <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/30" />
              </div>

              {[
                { step: '1', title: 'Crea tu grupo', desc: 'Añade amigos o familiares y define vuestro espacio para registrar gastos compartidos.' },
                { step: '2', title: 'Apunta cada gasto', desc: 'Indica quién pagó y cuánto; PagaYa ordena automáticamente los saldos.' },
                { step: '3', title: 'Liquida sin fricción', desc: 'Consulta quién debe a quién y cierra cuentas rápido, sin discusiones.' },
              ].map((item) => (
                <div key={item.step} className="relative flex flex-col items-center text-center">
                  <div className="relative z-10 mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary font-bold text-primary-foreground shadow-lg shadow-primary/25 text-lg">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Platforms ─── */}
        <section className="relative bg-background py-20 sm:py-24">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="flex flex-col justify-center space-y-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4dc9f6]">Disponible en todas partes</p>
                <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Web y móvil, siempre sincronizado</h2>
                <p className="max-w-md text-muted-foreground">Usa PagaYa desde el navegador o descarga la app de Android. Tus datos siempre están sincronizados en la nube.</p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-2.5 text-sm font-medium text-foreground">
                    <Globe className="h-4 w-4 text-primary" />
                    App web
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-2.5 text-sm font-medium text-foreground">
                    <Smartphone className="h-4 w-4 text-primary" />
                    Android (APK)
                  </div>
                </div>
              </div>
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/10 to-transparent blur-3xl" />
                <div className="relative flex items-center gap-6 rounded-3xl border border-border/50 bg-card p-8 shadow-xl">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                    <Image src="/images/PagaYa_logo.svg" alt="PagaYa" width={40} height={40} className="h-10 w-10" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-foreground">Paga<span className="text-primary">Ya</span></p>
                    <p className="text-sm text-muted-foreground">Cuentas claras, amistades largas.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="relative pb-20 sm:pb-24">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1628] via-[#0f1d32] to-[#0a1628] px-8 py-16 text-center shadow-2xl sm:px-16">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(77,201,246,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(77,201,246,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
                <div className="absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-[#4dc9f6]/10 blur-[100px]" />
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Empieza hoy con PagaYa</h2>
                <p className="mx-auto mt-4 max-w-xl text-sm text-white/50 sm:text-base">
                  Centraliza deudas, simplifica pagos y disfruta de tus planes sin preocuparte por las cuentas pendientes.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button asChild size="lg" className="h-13 rounded-full bg-[#4dc9f6] px-8 text-base font-bold text-[#0a1628] shadow-xl shadow-[#4dc9f6]/30 hover:bg-[#4dc9f6]/90">
                    <Link href={isAuthenticated ? '/debts' : '/auth?tab=register'}>
                      {isAuthenticated ? 'Abrir mi panel' : 'Crear cuenta gratis'}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-13 rounded-full border-white/20 bg-white/5 px-8 text-base text-white backdrop-blur-sm hover:bg-white/10 hover:text-white">
                    <a href={androidApkUrl} target="_blank" rel="noopener noreferrer">Probar en Android</a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} PagaYa. Cuentas claras, amistades largas.</p>
      </footer>
    </div>
  );
}
