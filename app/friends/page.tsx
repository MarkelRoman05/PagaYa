"use client"

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { usePagaYa } from '@/hooks/use-pagaya';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UserPlus, Search, Mail, User } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

export default function FriendsPage() {
  const { friends, addFriend, isReady, isLoadingData } = usePagaYa();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newFriend, setNewFriend] = useState({ name: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredFriends = friends.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = newFriend.name.trim();
    const email = newFriend.email.trim().toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!name || !email) {
      toast({
        title: 'Completa los campos',
        description: 'Añade un nombre y un correo válido para guardar el contacto.',
        variant: 'destructive',
      });
      return;
    }

    if (!isValidEmail) {
      toast({
        title: 'Correo no válido',
        description: 'Introduce un email con un formato correcto.',
        variant: 'destructive',
      });
      return;
    }

    if (friends.some((friend) => friend.email.toLowerCase() === email)) {
      toast({
        title: 'Contacto duplicado',
        description: 'Ya existe un amigo registrado con ese email.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await addFriend({
        name,
        email,
        avatar: `https://picsum.photos/seed/${encodeURIComponent(name)}/150/150`
      });

      setNewFriend({ name: '', email: '' });
      setIsAdding(false);

      toast({
        title: 'Amigo añadido',
        description: `${name} ya está disponible para nuevas deudas.`,
      });
    } catch (error) {
      toast({
        title: 'No se pudo guardar',
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isReady) return null;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-20 md:pt-20">
        <Navbar />
        
        <main className="container mx-auto px-4 py-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Mis Amigos</h1>
            <p className="text-muted-foreground">Gestiona las personas con las que compartes gastos.</p>
          </div>
          <Button onClick={() => setIsAdding(!isAdding)} className="rounded-full">
            <UserPlus className="w-5 h-5 mr-2" />
            Añadir Amigo
          </Button>
        </header>

        {isLoadingData && (
          <div className="mb-6 rounded-xl border bg-white px-4 py-3 text-sm text-muted-foreground">
            Actualizando tu agenda de amigos...
          </div>
        )}

        {isAdding && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <form onSubmit={handleAddFriend} className="grid md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input 
                    id="name" 
                    placeholder="Ej: Juan Pérez" 
                    value={newFriend.name}
                    onChange={(e) => setNewFriend({ ...newFriend, name: e.target.value })}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="juan@ejemplo.com" 
                    value={newFriend.email}
                    onChange={(e) => setNewFriend({ ...newFriend, email: e.target.value })}
                    className="bg-white"
                  />
                </div>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Amigo'}</Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input 
            placeholder="Buscar por nombre o email..." 
            className="pl-10 h-12 rounded-xl bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFriends.length > 0 ? (
            filteredFriends.map(friend => (
              <Card key={friend.id} className="hover:shadow-md transition-all group overflow-hidden">
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="w-14 h-14 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                    <AvatarImage src={friend.avatar} alt={friend.name} />
                    <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{friend.name}</h3>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{friend.email}</span>
                    </div>
                  </div>
                  <Button asChild variant="ghost" size="icon" className="rounded-full">
                    <a href={`mailto:${friend.email}`} aria-label={`Enviar correo a ${friend.name}`}>
                      <Mail className="w-4 h-4 text-muted-foreground" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <User className="w-12 h-12 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-muted-foreground">No se encontraron amigos.</p>
            </div>
          )}
        </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}