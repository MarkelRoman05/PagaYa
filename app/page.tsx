"use client"

import Link from 'next/link';
import { Wallet, ArrowRight, ShieldCheck, Zap, Users2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePagaYa } from '@/hooks/use-pagaya';

export default function Home() {
  const { isAuthenticated } = usePagaYa();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 flex flex-col">
        <section className="container mx-auto px-6 py-12 md:py-24 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-8 animate-in fade-in zoom-in duration-700">
            <Wallet className="w-12 h-12" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 font-headline tracking-tight">
            Paga<span className="text-primary">Ya</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mb-10">
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
                <Link href="/auth">Crear cuenta</Link>
              </Button>
            )}
          </div>
        </section>

        <section className="bg-white py-20 border-y border-border">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-4">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">Seguro y Fiable</h3>
                <p className="text-muted-foreground">Tus cuentas siempre claras y guardadas para que nadie se olvide de nada.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-secondary/10 rounded-full flex items-center justify-center text-secondary mb-4">
                  <Zap className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">Recordatorios IA</h3>
                <p className="text-muted-foreground">Deja que nuestra IA redacte mensajes amigables para recordar los pagos.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-4">
                  <Users2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">Entre Amigos</h3>
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