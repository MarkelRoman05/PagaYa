"use client"

import { usePagaYa } from '@/hooks/use-pagaya';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { DebtCard } from '@/components/debts/DebtCard';
import { History, RefreshCw, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function HistoryPage() {
  const { friends, debts, refreshData, removeDebt, isReady, isLoadingData } = usePagaYa();
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const paidDebts = debts.filter(d => d.status === 'paid');
  const filteredDebts = paidDebts.filter(d => 
    d.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friends.find(f => f.id === d.friendId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = async () => {
    try {
      await refreshData();
    } catch (error) {
      toast({
        title: 'No se pudo recargar el historial',
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  if (!isReady) return null;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-24 md:pb-20 md:pt-20">
        <Navbar />
        
        <main className="container mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Historial de pagos</h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">Consulta todos tus pagos liquidados anteriormente.</p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isLoadingData} className="w-full md:w-auto">
            <RefreshCw className={isLoadingData ? 'animate-spin' : ''} />
            Recargar
          </Button>
        </header>

        {isLoadingData && (
          <div className="mb-6 rounded-xl border bg-white px-4 py-3 text-sm text-muted-foreground">
            Sincronizando tu historial...
          </div>
        )}

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input 
            placeholder="Buscar por descripción o amigo..." 
            className="pl-10 h-12 rounded-xl bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid gap-4">
          {filteredDebts.length > 0 ? (
            filteredDebts.map(debt => (
              <DebtCard 
                key={debt.id} 
                debt={debt} 
                friend={friends.find(f => f.id === debt.friendId)} 
                onPaid={() => {}} // Already paid
                onDelete={removeDebt}
              />
            ))
          ) : (
            <div className="flex flex-col items-center rounded-2xl border border-dashed bg-white/50 px-4 py-16 text-center sm:py-20">
              <History className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No hay historial</h3>
              <p className="text-sm text-muted-foreground/70">Tus pagos completados aparecerán aquí.</p>
            </div>
          )}
        </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}