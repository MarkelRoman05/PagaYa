"use client"

import { usePagaYa } from '@/hooks/use-pagaya';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { DebtCard } from '@/components/debts/DebtCard';
import { History, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function HistoryPage() {
  const { friends, debts, removeDebt, isReady, isLoadingData } = usePagaYa();
  const [searchTerm, setSearchTerm] = useState('');

  const paidDebts = debts.filter(d => d.status === 'paid');
  const filteredDebts = paidDebts.filter(d => 
    d.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friends.find(f => f.id === d.friendId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isReady) return null;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-20 md:pt-20">
        <Navbar />
        
        <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Historial de Pagos</h1>
          <p className="text-muted-foreground">Consulta todos tus pagos liquidados anteriormente.</p>
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
            <div className="text-center py-20 bg-white/50 rounded-2xl border border-dashed flex flex-col items-center">
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