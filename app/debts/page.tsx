"use client"

import { useState } from 'react';
import { usePagaYa } from '@/hooks/use-pagaya';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { DebtCard } from '@/components/debts/DebtCard';
import { NewDebtDialog } from '@/components/debts/NewDebtSheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowUpRight, ArrowDownLeft, Plus, RefreshCw, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AppLoadingScreen, InlineLoadingNotice } from '@/components/ui/app-loading-screen';

export default function Dashboard() {
  const [isNewDebtOpen, setIsNewDebtOpen] = useState(false);
  const { friends, debts, updateDebt, markAsPaid, rejectDebtPaymentRequest, removeDebt, isReady, isLoadingData, refreshData, user } = usePagaYa();
  const { toast } = useToast();

  const userMetadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const username = typeof userMetadata.username === 'string' ? userMetadata.username.trim() : '';
  const firstName = username || user?.email?.split('@')[0] || 'usuario';

  const pendingDebts = debts.filter(d => d.status !== 'paid');
  const owedToMe = pendingDebts.filter(d => d.type === 'owed_to_me');
  const owedByMe = pendingDebts.filter(d => d.type === 'owed_by_me');

  const totalOwedToMe = owedToMe.reduce((acc, d) => acc + d.amount, 0);
  const totalOwedByMe = owedByMe.reduce((acc, d) => acc + d.amount, 0);

  const handleRefresh = async () => {
    try { await refreshData(); }
    catch (error) { toast({ title: 'No se pudo recargar la actividad', description: error instanceof Error ? error.message : 'Inténtalo de nuevo.', variant: 'destructive' }); }
  };

  if (!isReady) return <AppLoadingScreen title="Cargando panel" subtitle="Estamos preparando tus deudas y movimientos..." />;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-24 md:pb-20 md:pt-20">
        <Navbar />

        <main className="container mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">¡Hola, @{firstName}!</h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">Esto es lo que debes y lo que te deben.</p>
            </div>
            <Button onClick={() => setIsNewDebtOpen(true)} className="h-11 w-full rounded-xl font-semibold shadow-md shadow-primary/20 sm:w-auto">
              <Plus className="mr-2 h-5 w-5" />
              Nueva deuda
            </Button>
          </header>

          {isLoadingData && <InlineLoadingNotice message="Cargando tus deudas..." />}

          {/* Summary cards */}
          <section className="mb-8 grid gap-4 sm:grid-cols-2">
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a1628] via-[#0f1d32] to-[#0a1628] p-6 text-white shadow-xl transition-all hover:shadow-2xl">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(77,201,246,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(77,201,246,0.04)_1px,transparent_1px)] bg-[size:24px_24px] opacity-50" />
              <div className="absolute -right-4 -top-4 opacity-[0.07] transition-transform duration-500 group-hover:scale-110">
                <ArrowDownLeft className="h-32 w-32" />
              </div>
              <div className="relative z-10">
                <p className="mb-1 flex items-center gap-2 text-sm font-medium text-white/50">
                  <ArrowDownLeft className="h-4 w-4" />
                  Me deben
                </p>
                <p className="text-3xl font-extrabold tracking-tight sm:text-4xl">{formatCurrency(totalOwedToMe)}</p>
                <p className="mt-2 text-sm text-white/40">{owedToMe.length} deuda(s) pendiente(s)</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition-all hover:shadow-md">
              <div className="absolute -right-4 -top-4 opacity-[0.03] transition-transform duration-500 group-hover:scale-110">
                <ArrowUpRight className="h-32 w-32 text-foreground" />
              </div>
              <div className="relative z-10">
                <p className="mb-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <ArrowUpRight className="h-4 w-4" />
                  Debo
                </p>
                <p className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{formatCurrency(totalOwedByMe)}</p>
                <p className="mt-2 text-sm text-muted-foreground">{owedByMe.length} deuda(s) pendiente(s)</p>
              </div>
            </div>
          </section>

          {/* Activity */}
          <section>
            <Tabs defaultValue="all" className="w-full">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-extrabold">Actividad</h2>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoadingData} className="w-full rounded-xl sm:w-auto">
                    <RefreshCw className={isLoadingData ? 'animate-spin' : ''} />
                    Recargar
                  </Button>
                  <div className="overflow-x-auto pb-1">
                    <TabsList className="inline-flex h-9 min-w-full justify-start gap-1 rounded-lg border bg-muted/40 p-1 sm:min-w-0">
                      <TabsTrigger value="all" className="shrink-0 rounded-md px-3 text-xs font-medium">Todas</TabsTrigger>
                      <TabsTrigger value="to-me" className="shrink-0 rounded-md px-3 text-xs font-medium">Me deben</TabsTrigger>
                      <TabsTrigger value="by-me" className="shrink-0 rounded-md px-3 text-xs font-medium">Debo</TabsTrigger>
                    </TabsList>
                  </div>
                </div>
              </div>

              <TabsContent value="all" className="grid gap-3">
                {pendingDebts.length > 0 ? pendingDebts.map(debt => (
                  <DebtCard key={debt.id} debt={debt} friend={friends.find(f => f.id === debt.friendId)} onUpdate={updateDebt} onPaid={markAsPaid} onRejectPaymentRequest={rejectDebtPaymentRequest} onDelete={removeDebt} />
                )) : <EmptyState onOpenDebt={() => setIsNewDebtOpen(true)} />}
              </TabsContent>

              <TabsContent value="to-me" className="grid gap-3">
                {owedToMe.length > 0 ? owedToMe.map(debt => (
                  <DebtCard key={debt.id} debt={debt} friend={friends.find(f => f.id === debt.friendId)} onUpdate={updateDebt} onPaid={markAsPaid} onRejectPaymentRequest={rejectDebtPaymentRequest} onDelete={removeDebt} />
                )) : <EmptyState onOpenDebt={() => setIsNewDebtOpen(true)} />}
              </TabsContent>

              <TabsContent value="by-me" className="grid gap-3">
                {owedByMe.length > 0 ? owedByMe.map(debt => (
                  <DebtCard key={debt.id} debt={debt} friend={friends.find(f => f.id === debt.friendId)} onUpdate={updateDebt} onPaid={markAsPaid} onRejectPaymentRequest={rejectDebtPaymentRequest} onDelete={removeDebt} />
                )) : <EmptyState onOpenDebt={() => setIsNewDebtOpen(true)} />}
              </TabsContent>
            </Tabs>
          </section>

          <NewDebtDialog open={isNewDebtOpen} onOpenChange={setIsNewDebtOpen} />
        </main>
      </div>
    </ProtectedRoute>
  );
}

function EmptyState({ onOpenDebt }: { onOpenDebt: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-16 text-center sm:py-20">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Wallet className="h-8 w-8 text-primary/40" />
      </div>
      <h3 className="text-lg font-bold text-foreground">No hay deudas pendientes</h3>
      <p className="mt-1 text-sm text-muted-foreground">Todo está al día. Relájate y disfruta.</p>
      <Button variant="ghost" onClick={onOpenDebt} className="mt-4 rounded-xl font-semibold text-primary hover:bg-primary/10 hover:text-primary">
        Crear una nueva
      </Button>
    </div>
  );
}
