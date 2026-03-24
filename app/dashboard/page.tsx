"use client"

import { useState } from 'react';
import { usePagaYa } from '@/hooks/use-pagaya';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { DebtCard } from '@/components/debts/DebtCard';
import { NewDebtDialog } from '@/components/debts/NewDebtSheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
    try {
      await refreshData();
    } catch (error) {
      toast({
        title: 'No se pudo recargar la actividad',
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  if (!isReady) {
    return <AppLoadingScreen title="Cargando panel" subtitle="Estamos preparando tus deudas y movimientos..." />;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-24 md:pb-20 md:pt-20">
        <Navbar />
        
        <main className="container mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-8 flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">¡Hola, @{firstName}!</h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">Esto es lo que debes y lo que te deben. Págalo cuanto antes, que si no tu amigo se enfadará.</p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button onClick={() => setIsNewDebtOpen(true)} className="h-11 w-full rounded-full shadow-lg sm:w-auto">
              <Plus className="w-5 h-5 mr-2" />
              Nueva deuda
            </Button>
          </div>
        </header>

        {isLoadingData && <InlineLoadingNotice message="Sincronizando tus datos con Supabase..." />}

        <section className="mb-8 grid gap-4 md:grid-cols-2">
          <Card className="bg-primary text-white overflow-hidden relative">
            <div className="absolute right-[-10%] top-[-10%] opacity-10">
              <ArrowDownLeft className="h-24 w-24 sm:h-32 sm:w-32" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-primary-foreground/80 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4" />
                Me deben
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="break-words text-3xl font-bold sm:text-4xl">{formatCurrency(totalOwedToMe)}</div>
              <p className="text-primary-foreground/70 text-sm mt-1">{owedToMe.length} deuda(s) pendiente(s)</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border overflow-hidden relative">
             <div className="absolute right-[-10%] top-[-10%] opacity-5">
              <ArrowUpRight className="h-24 w-24 text-orange-600 sm:h-32 sm:w-32" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-orange-600" />
                Debo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="break-words text-3xl font-bold text-foreground sm:text-4xl">{formatCurrency(totalOwedByMe)}</div>
              <p className="text-muted-foreground text-sm mt-1">{owedByMe.length} deuda(s) pendiente(s)</p>
            </CardContent>
          </Card>
        </section>

        <section>
          <Tabs defaultValue="all" className="w-full">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-xl font-bold">Actividad</h2>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoadingData} className="w-full sm:w-auto">
                  <RefreshCw className={isLoadingData ? 'animate-spin' : ''} />
                  Recargar
                </Button>
                <div className="overflow-x-auto pb-1">
                  <TabsList className="inline-flex h-auto min-w-full justify-start gap-1 border bg-background/50 p-1 sm:min-w-0">
                    <TabsTrigger value="all" className="shrink-0">Todas</TabsTrigger>
                    <TabsTrigger value="to-me" className="shrink-0">Me deben</TabsTrigger>
                    <TabsTrigger value="by-me" className="shrink-0">Debo</TabsTrigger>
                  </TabsList>
                </div>
              </div>
            </div>

            <TabsContent value="all" className="grid gap-4">
              {pendingDebts.length > 0 ? (
                pendingDebts.map(debt => (
                  <DebtCard 
                    key={debt.id} 
                    debt={debt} 
                    friend={friends.find(f => f.id === debt.friendId)} 
                    onUpdate={updateDebt}
                    onPaid={markAsPaid}
                    onRejectPaymentRequest={rejectDebtPaymentRequest}
                    onDelete={removeDebt}
                  />
                ))
              ) : (
                <EmptyState onOpenDebt={() => setIsNewDebtOpen(true)} />
              )}
            </TabsContent>

            <TabsContent value="to-me" className="grid gap-4">
               {owedToMe.length > 0 ? (
                owedToMe.map(debt => (
                  <DebtCard 
                    key={debt.id} 
                    debt={debt} 
                    friend={friends.find(f => f.id === debt.friendId)} 
                    onUpdate={updateDebt}
                    onPaid={markAsPaid}
                    onRejectPaymentRequest={rejectDebtPaymentRequest}
                    onDelete={removeDebt}
                  />
                ))
              ) : (
                <EmptyState onOpenDebt={() => setIsNewDebtOpen(true)} />
              )}
            </TabsContent>

            <TabsContent value="by-me" className="grid gap-4">
               {owedByMe.length > 0 ? (
                owedByMe.map(debt => (
                  <DebtCard 
                    key={debt.id} 
                    debt={debt} 
                    friend={friends.find(f => f.id === debt.friendId)} 
                    onUpdate={updateDebt}
                    onPaid={markAsPaid}
                    onRejectPaymentRequest={rejectDebtPaymentRequest}
                    onDelete={removeDebt}
                  />
                ))
              ) : (
                <EmptyState onOpenDebt={() => setIsNewDebtOpen(true)} />
              )}
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
    <>
      <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card/50 px-4 py-16 text-center sm:py-20">
        <Wallet className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">No hay deudas pendientes</h3>
        <p className="text-sm text-muted-foreground/70">Todo está al día. Relájate y disfuta.</p>
        <Button variant="link" onClick={onOpenDebt} className="mt-2">
          Crear una nueva
        </Button>
      </div>
    </>
  );
}
