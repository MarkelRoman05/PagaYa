"use client"

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { usePagaYa } from '@/hooks/use-pagaya';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UserPlus, Search, Mail, RefreshCw, User, Trash2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function FriendsPage() {
  const { friends, invitations, sendInvitation, acceptInvitation, rejectInvitation, removeFriend, isReady, isLoadingData, refreshData, user } = usePagaYa();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newInvitation, setNewInvitation] = useState({ name: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingFriendId, setDeletingFriendId] = useState<string | null>(null);
  const [acceptingInvitationId, setAcceptingInvitationId] = useState<string | null>(null);
  const [rejectingInvitationId, setRejectingInvitationId] = useState<string | null>(null);
  const [cancelingInvitationId, setCancelingInvitationId] = useState<string | null>(null);

  const filteredFriends = friends.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get pending invitations received by current user (not sent by them)
  const receivedInvitations = invitations.filter(inv => 
    inv.status === 'pending' && 
    inv.fromUserId !== user?.id && 
    (inv.toUserId === user?.id || inv.toEmail === user?.email)
  );

  // Get pending invitations sent by current user
  const sentInvitations = invitations.filter(inv => 
    inv.status === 'pending' && 
    inv.fromUserId === user?.id
  );

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = newInvitation.name.trim();
    const email = newInvitation.email.trim().toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!name || !email) {
      toast({
        title: 'Completa los campos',
        description: 'Añade un nombre y un correo válido para enviar la invitación.',
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
        title: 'Ya es amigo',
        description: 'Ya existe una amistad con este email.',
        variant: 'destructive',
      });
      return;
    }

    if (invitations.some((inv) => inv.toEmail.toLowerCase() === email && inv.status === 'pending')) {
      toast({
        title: 'Invitación pendiente',
        description: 'Ya has enviado una invitación a este email.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await sendInvitation({
        name,
        email,
      });

      setNewInvitation({ name: '', email: '' });
      setIsAdding(false);

      toast({
        title: 'Invitación enviada',
        description: `Se ha enviado una invitación a ${email}.`,
      });
    } catch (error) {
      toast({
        title: 'No se pudo enviar',
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string, inviterName: string) => {
    setAcceptingInvitationId(invitationId);

    try {
      await acceptInvitation(invitationId);

      toast({
        title: 'Invitación aceptada',
        description: `Ahora ${inviterName} es tu amigo.`,
      });
    } catch (error) {
      toast({
        title: 'No se pudo aceptar',
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setAcceptingInvitationId(null);
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    setRejectingInvitationId(invitationId);

    try {
      await rejectInvitation(invitationId);

      toast({
        title: 'Invitación rechazada',
        description: 'La invitación ha sido rechazada.',
      });
    } catch (error) {
      toast({
        title: 'No se pudo rechazar',
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setRejectingInvitationId(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    setCancelingInvitationId(invitationId);

    try {
      await rejectInvitation(invitationId);

      toast({
        title: 'Invitación cancelada',
        description: 'Has cancelado la invitación.',
      });
    } catch (error) {
      toast({
        title: 'No se pudo cancelar',
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setCancelingInvitationId(null);
    }
  };

  const handleDeleteFriend = async (friendId: string, friendName: string) => {
    setDeletingFriendId(friendId);

    try {
      await removeFriend(friendId);

      toast({
        title: 'Amigo eliminado',
        description: `${friendName} y sus deudas asociadas se han borrado.`,
      });
    } catch (error) {
      toast({
        title: 'No se pudo eliminar',
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setDeletingFriendId(null);
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshData();
    } catch (error) {
      toast({
        title: 'No se pudo recargar la agenda',
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
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Mis amigos</h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">Gestiona las personas con las que compartes gastos.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button variant="outline" onClick={handleRefresh} disabled={isLoadingData} className="w-full sm:w-auto">
              <RefreshCw className={isLoadingData ? 'animate-spin' : ''} />
              Recargar
            </Button>
            <Button onClick={() => setIsAdding(!isAdding)} className="w-full rounded-full sm:w-auto">
              <UserPlus className="w-5 h-5 mr-2" />
              Añadir amigo
            </Button>
          </div>
        </header>

        {isLoadingData && (
          <div className="mb-6 rounded-xl border bg-white px-4 py-3 text-sm text-muted-foreground">
            Actualizando tu agenda de amigos...
          </div>
        )}

        {isAdding && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <form onSubmit={handleSendInvitation} className="grid gap-4 md:grid-cols-3 md:items-end">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del amigo</Label>
                  <Input 
                    id="name" 
                    placeholder="Ej: Juan Pérez" 
                    value={newInvitation.name}
                    onChange={(e) => setNewInvitation({ ...newInvitation, name: e.target.value })}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email del amigo</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="juan@ejemplo.com" 
                    value={newInvitation.email}
                    onChange={(e) => setNewInvitation({ ...newInvitation, email: e.target.value })}
                    className="bg-white"
                  />
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">{isSubmitting ? 'Enviando...' : 'Enviar invitación'}</Button>
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
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <Avatar className="w-14 h-14 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                    <AvatarImage src={friend.avatar} alt={friend.name} />
                    <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-bold text-lg">{friend.name}</h3>
                    <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="break-all">{friend.email}</span>
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-full text-destructive sm:w-10"
                        disabled={deletingFriendId === friend.id}
                        aria-label={`Eliminar a ${friend.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro que deseas eliminar a {friend.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. También se eliminarán sus deudas asociadas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteFriend(friend.id, friend.name)}
                          disabled={deletingFriendId === friend.id}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deletingFriendId === friend.id ? 'Eliminando...' : 'Eliminar'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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

        {receivedInvitations.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-4">Invitaciones Pendientes</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {receivedInvitations.map((invitation) => (
                <Card key={invitation.id} className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="mb-4">
                      <h3 className="font-bold text-lg">{invitation.inviterName}</h3>
                      <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="break-all">{invitation.inviterEmail}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Te ha enviado una invitación de amistad</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        onClick={() => handleAcceptInvitation(invitation.id, invitation.inviterName)}
                        disabled={acceptingInvitationId === invitation.id}
                        className="flex-1"
                      >
                        {acceptingInvitationId === invitation.id ? 'Aceptando...' : 'Aceptar'}
                      </Button>
                      <Button
                        onClick={() => handleRejectInvitation(invitation.id)}
                        disabled={rejectingInvitationId === invitation.id}
                        variant="outline"
                        className="flex-1"
                      >
                        {rejectingInvitationId === invitation.id ? 'Rechazando...' : 'Rechazar'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {sentInvitations.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-4">Invitaciones Enviadas</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sentInvitations.map((invitation) => (
                <Card key={invitation.id} className="border-amber-200 bg-amber-50">
                  <CardContent className="p-4">
                    <div className="mb-4">
                      <h3 className="font-bold text-lg">Esperando respuesta</h3>
                      <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="break-all">{invitation.toEmail}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Enviaste una invitación a este correo el {invitation.createdAt ? new Date(invitation.createdAt).toLocaleDateString('es-ES') : 'hace poco'}</p>
                    <Button
                      onClick={() => handleCancelInvitation(invitation.id)}
                      disabled={cancelingInvitationId === invitation.id}
                      variant="outline"
                      className="w-full text-amber-700 border-amber-300 hover:bg-amber-100"
                    >
                      {cancelingInvitationId === invitation.id ? 'Cancelando...' : 'Cancelar'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
        </main>
      </div>
    </ProtectedRoute>
  );
}