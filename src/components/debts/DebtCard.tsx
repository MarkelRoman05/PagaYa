"use client"

import { useState, useEffect } from 'react';
import { Debt, Friend } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, MessageSquareText, Trash2, Clock, User } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { aiPoweredReminderMessageAssistant } from '@/ai/flows/ai-powered-reminder-message-assistant-flow';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";

interface DebtCardProps {
  debt: Debt;
  friend?: Friend;
  onPaid: (id: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

export function DebtCard({ debt, friend, onPaid, onDelete }: DebtCardProps) {
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const fallbackReminderMessage = friend
    ? `Hola ${friend.name}, te escribo por la deuda de ${formatCurrency(debt.amount)} por "${debt.description}". Cuando puedas, ¿me confirmas si puedes dejarla pagada esta semana? Gracias.`
    : `Hola, te escribo por la deuda pendiente de ${formatCurrency(debt.amount)} por "${debt.description}". Cuando puedas, ¿me confirmas si puedes dejarla pagada esta semana? Gracias.`;

  const handleGenerateReminder = async () => {
    if (!friend) return;

    setIsLoadingAi(true);

    try {
      const response = await aiPoweredReminderMessageAssistant({
        friendName: friend.name,
        debtAmount: formatCurrency(debt.amount),
        debtDescription: debt.description,
      });

      setReminderMessage(response.suggestedMessage);
    } catch (error) {
      console.error("Error generating reminder:", error);

      setReminderMessage(fallbackReminderMessage);
      toast({
        title: 'IA no disponible',
        description: 'Se ha generado un recordatorio local para que puedas seguir usando la app.',
      });
    } finally {
      setIsReminderOpen(true);
      setIsLoadingAi(false);
    }
  };

  const handleCopyReminder = async () => {
    try {
      await navigator.clipboard.writeText(reminderMessage);
      toast({
        title: 'Mensaje copiado',
        description: 'Ya puedes pegarlo en WhatsApp, Telegram o email.',
      });
    } catch {
      toast({
        title: 'No se pudo copiar',
        description: 'Copia el texto manualmente desde el cuadro de diálogo.',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAsPaid = async () => {
    setIsUpdatingStatus(true);

    try {
      await onPaid(debt.id);
      toast({
        title: 'Pago registrado',
        description: 'La deuda ya aparece como pagada.',
      });
    } catch (error) {
      toast({
        title: 'No se pudo actualizar',
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await onDelete(debt.id);
      toast({
        title: 'Deuda eliminada',
        description: 'El registro se ha borrado correctamente.',
      });
    } catch (error) {
      toast({
        title: 'No se pudo eliminar',
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isOwedToMe = debt.type === 'owed_to_me';
  const isPaid = debt.status === 'paid';

  const formattedDate = mounted 
    ? new Date(debt.createdAt).toLocaleDateString() 
    : "";

  return (
    <>
      <Card className={cn(
        "overflow-hidden transition-all hover:shadow-md border-l-4",
        isOwedToMe ? "border-l-primary" : "border-l-orange-400",
        isPaid && "opacity-60 grayscale"
      )}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={isOwedToMe ? "default" : "secondary"} className="text-[10px] uppercase font-bold tracking-wider">
                  {isOwedToMe ? "Me deben" : "Debo"}
                </Badge>
                {isPaid && <Badge variant="outline" className="text-[10px] uppercase font-bold text-teal-600 border-teal-600 bg-teal-50">Pagado</Badge>}
              </div>
              <h3 className="font-semibold text-lg">{debt.description}</h3>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <User className="w-3.5 h-3.5" />
                <span>{friend?.name || 'Amigo desconocido'}</span>
              </div>
            </div>
            <div className="text-right">
              <span className={cn(
                "text-2xl font-bold block",
                isOwedToMe ? "text-primary" : "text-orange-600"
              )}>
                {formatCurrency(debt.amount)}
              </span>
              <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground mt-1 uppercase font-medium">
                <Clock className="w-3 h-3" />
                {formattedDate}
              </div>
            </div>
          </div>

          {!isPaid && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-muted">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-teal-600 border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                onClick={handleMarkAsPaid}
                disabled={isUpdatingStatus || isDeleting}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {isUpdatingStatus ? 'Guardando...' : 'Pagado'}
              </Button>
              
              {isOwedToMe && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 text-primary border-primary/20 hover:bg-primary/5"
                  onClick={handleGenerateReminder}
                  disabled={isLoadingAi || isUpdatingStatus || isDeleting}
                >
                  <MessageSquareText className="w-4 h-4 mr-2" />
                  {isLoadingAi ? "Cargando..." : "Recordar"}
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:bg-destructive/10"
                    disabled={isUpdatingStatus || isDeleting}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar esta deuda?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Se borrará el registro de esta deuda de forma permanente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? 'Eliminando...' : 'Eliminar'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isReminderOpen} onOpenChange={setIsReminderOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareText className="text-primary" />
              Sugerencia de la IA
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted p-4 rounded-lg text-sm italic leading-relaxed">
              "{reminderMessage}"
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 text-center">
              Puedes copiar este mensaje y enviarlo por WhatsApp o SMS a {friend?.name}.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCopyReminder} className="w-full sm:w-auto">
              Copiar
            </Button>
            <Button type="button" onClick={() => setIsReminderOpen(false)} className="w-full sm:w-auto">
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
