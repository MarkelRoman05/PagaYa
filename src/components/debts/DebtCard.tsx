"use client"

import { useState, useEffect } from 'react';
import { Debt, Friend } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Trash2, Clock, User } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
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
} from "@/components/ui/alert-dialog";

interface DebtCardProps {
  debt: Debt;
  friend?: Friend;
  onPaid: (id: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

export function DebtCard({ debt, friend, onPaid, onDelete }: DebtCardProps) {
  const [mounted, setMounted] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

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
    </>
  );
}
