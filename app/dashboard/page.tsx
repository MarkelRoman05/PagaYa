"use client"

import { usePagaYa } from '@/hooks/use-pagaya';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { DebtCard } from '@/components/debts/DebtCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownLeft, Plus, Wallet } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

export default function Dashboard() {
  const { friends, debts, markAsPaid, removeDebt, isReady, isLoadingData, user } = usePagaYa();

  const userMetadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = typeof userMetadata.full_name === 'string' ? userMetadata.full_name.trim() : '';
  const firstName = fullName || user?.email?.split('@')[0] || 'Usuario';

  const pendingDebts = debts.filter(d => d.status === 'pending');
  const owedToMe = pendingDebts.filter(d => d.type === 'owed_to_me');
  const owedByMe = pendingDebts.filter(d => d.type === 'owed_by_me');

  const totalOwedToMe = owedToMe.reduce((acc, d) => acc + d.amount, 0);
  const totalOwedByMe = owedByMe.reduce((acc, d) => acc + d.amount, 0);

  if (!isReady) return null;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-20 md:pt-20">
        <Navbar />
        
        <main className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Hola, {firstName}</h1>
            <p className="text-muted-foreground">Esto es lo que debes y lo que te deben.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild className="rounded-full shadow-lg">
              <Link href="/debts/new">
                <Plus className="w-5 h-5 mr-2" />
                Nueva deuda
              </Link>
            </Button>
          </div>
        </header>

        {isLoadingData && (
          <div className="mb-6 rounded-xl border bg-white px-4 py-3 text-sm text-muted-foreground">
            Sincronizando tus datos con Supabase...
          </div>
        )}

        <section className="grid md:grid-cols-2 gap-4 mb-8">
          <Card className="bg-primary text-white overflow-hidden relative">
            <div className="absolute right-[-10%] top-[-10%] opacity-10">
              <ArrowDownLeft className="w-32 h-32" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-primary-foreground/80 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4" />
                Me deben
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{formatCurrency(totalOwedToMe)}</div>
              <p className="text-primary-foreground/70 text-sm mt-1">{owedToMe.length} deudas pendientes</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-border overflow-hidden relative">
             <div className="absolute right-[-10%] top-[-10%] opacity-5">
              <ArrowUpRight className="w-32 h-32 text-orange-600" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-orange-600" />
                Debo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">{formatCurrency(totalOwedByMe)}</div>
              <p className="text-muted-foreground text-sm mt-1">{owedByMe.length} deudas pendientes</p>
            </CardContent>
          </Card>
        </section>

        <section>
          <Tabs defaultValue="all" className="w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Actividad</h2>
              <TabsList className="bg-white/50 border">
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="to-me">Me deben</TabsTrigger>
                <TabsTrigger value="by-me">Debo</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="grid gap-4">
              {pendingDebts.length > 0 ? (
                pendingDebts.map(debt => (
                  <DebtCard 
                    key={debt.id} 
                    debt={debt} 
                    friend={friends.find(f => f.id === debt.friendId)} 
                    onPaid={markAsPaid}
                    onDelete={removeDebt}
                  />
                ))
              ) : (
                <EmptyState />
              )}
            </TabsContent>

            <TabsContent value="to-me" className="grid gap-4">
               {owedToMe.length > 0 ? (
                owedToMe.map(debt => (
                  <DebtCard 
                    key={debt.id} 
                    debt={debt} 
                    friend={friends.find(f => f.id === debt.friendId)} 
                    onPaid={markAsPaid}
                    onDelete={removeDebt}
                  />
                ))
              ) : (
                <EmptyState />
              )}
            </TabsContent>

            <TabsContent value="by-me" className="grid gap-4">
               {owedByMe.length > 0 ? (
                owedByMe.map(debt => (
                  <DebtCard 
                    key={debt.id} 
                    debt={debt} 
                    friend={friends.find(f => f.id === debt.friendId)} 
                    onPaid={markAsPaid}
                    onDelete={removeDebt}
                  />
                ))
              ) : (
                <EmptyState />
              )}
            </TabsContent>
          </Tabs>
        </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 bg-white/50 rounded-2xl border border-dashed flex flex-col items-center">
      <Wallet className="w-12 h-12 text-muted-foreground/30 mb-4" />
      <h3 className="text-lg font-medium text-muted-foreground">No hay deudas pendientes</h3>
      <p className="text-sm text-muted-foreground/70">Todo está al día. Relájate y disfuta.</p>
      <Button asChild variant="link" className="mt-2">
        <Link href="/debts/new">Crear una nueva</Link>
      </Button>
    </div>
  );
}
