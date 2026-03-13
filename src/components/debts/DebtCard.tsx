"use client"

import { useState, useEffect } from 'react';
import { Debt, Friend } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Trash2, Clock, User, Euro, XCircle, PenLine } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { usePagaYa } from '@/hooks/use-pagaya';
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
  onRejectPaymentRequest?: (id: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

export function DebtCard({ debt, friend, onPaid, onRejectPaymentRequest, onDelete }: DebtCardProps) {
  const { user } = usePagaYa();
  const [mounted, setMounted] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isRejectingPaymentRequest, setIsRejectingPaymentRequest] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isOwedToMe = debt.type === 'owed_to_me';
  const isPaid = debt.status === 'paid';
  const isPaymentRequested = debt.status === 'payment_requested';
  const rejectionCount = debt.paymentRequestRejectionCount ?? 0;
  const canDeleteDebt = Boolean(user?.id && debt.userId === user.id);
  const deleteDialogTitle = canDeleteDebt
    ? '¿Eliminar esta deuda?'
    : 'No puedes eliminar esta deuda';
  const deleteDialogDescription = canDeleteDebt
    ? 'Esta acción no se puede deshacer. Se borrará el registro de esta deuda de forma permanente.'
    : 'Solo la persona que creó la deuda puede eliminarla.';

  const canRequestConfirmation = !isOwedToMe && debt.status === 'pending';
  const canConfirmPaymentDirectly = isOwedToMe && debt.status === 'pending';
  const canReviewPaymentRequest = isOwedToMe && isPaymentRequested;
  const requesterName = friend?.name || 'tu amigo';
  const hasRejectedPaymentRequest = !isOwedToMe && debt.status === 'pending' && rejectionCount > 0;
  const rejectionBadgeLabel = rejectionCount === 1 ? 'Rechazado 1 vez' : `Rechazado ${rejectionCount} veces`;
  const rejectionMessage = rejectionCount === 1
    ? `${requesterName} ha rechazado tu solicitud de marcarla como pagada.`
    : `${requesterName} ha rechazado tu solicitud de marcarla como pagada ${rejectionCount} veces.`;

  const actionLabel = isUpdatingStatus
    ? 'Guardando...'
    : canRequestConfirmation
      ? 'Solicitar marcar como pagado'
      : canConfirmPaymentDirectly
        ? 'Marcar como pagado'
        : 'Esperando confirmación de tu amigo';

  const handleMarkAsPaid = async () => {
    setIsUpdatingStatus(true);

    try {
      await onPaid(debt.id);
      toast({
        title: canRequestConfirmation ? 'Solicitud enviada' : 'Pago confirmado',
        description: canRequestConfirmation
          ? 'La otra persona debe confirmar que el pago se ha recibido.'
          : 'Has saldado esta deuda. ¡Bien hecho!',
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

  const handleRejectPaymentRequest = async () => {
    if (!onRejectPaymentRequest) {
      return;
    }

    setIsRejectingPaymentRequest(true);

    try {
      await onRejectPaymentRequest(debt.id);
      toast({
        title: 'Solicitud rechazada',
        description: 'La deuda ha vuelto a quedar pendiente.',
      });
    } catch (error) {
      toast({
        title: 'No se pudo rechazar',
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsRejectingPaymentRequest(false);
    }
  };

  const handleDelete = async () => {
    if (!canDeleteDebt) {
      toast({
        title: 'No puedes eliminar esta deuda',
        description: 'Solo la persona que creó la deuda puede eliminarla.',
        variant: 'destructive',
      });
      return;
    }

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

  const formattedDateTime = mounted
    ? new Date(debt.createdAt).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const formattedPaidDateTime = mounted && debt.paidAt
    ? new Date(debt.paidAt).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <>
      <Card className={cn(
        "overflow-hidden transition-all hover:shadow-md border-l-4",
        isOwedToMe ? "border-l-primary" : "border-l-orange-400",
        isPaid && "opacity-60 grayscale"
      )}>
        <CardContent className="p-4">
          <div className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge variant={isOwedToMe ? "default" : "secondary"} className="text-[10px] uppercase font-bold tracking-wider">
                  {isOwedToMe ? "Me deben" : "Debo"}
                </Badge>
                {isPaymentRequested && (
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 border-amber-600/50 bg-amber-500/10">
                    Por confirmar
                  </Badge>
                )}
                {hasRejectedPaymentRequest && (
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 border-rose-600/50 bg-rose-500/10">
                    {rejectionBadgeLabel}
                  </Badge>
                )}
                {isPaid && <Badge variant="outline" className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-400 border-teal-600/50 bg-teal-500/10">Pagado</Badge>}
              </div>
              <h3 className="break-words font-semibold text-base sm:text-lg">{debt.description}</h3>
              <div className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                <User className="w-3.5 h-3.5" />
                <span className="break-words">Deuda con {friend?.name || 'Amigo desconocido'}</span>
              </div>
              <div className="mt-0.5 flex items-start gap-1.5 text-xs text-muted-foreground/70">
                <PenLine className="w-3 h-3 mt-0.5 shrink-0" />
                <span>Creada por {debt.userId === user?.id ? 'ti' : (friend?.name || 'tu amigo')}</span>
              </div>
            </div>
            <div className="w-full text-left sm:w-auto sm:max-w-[220px] sm:text-right">
              <span className={cn(
                "block break-words text-2xl font-bold sm:text-3xl",
                isOwedToMe ? "text-primary" : "text-orange-600"
              )}>
                {formatCurrency(debt.amount)}
              </span>
              <div className="mt-1 flex items-center gap-1 text-[12px] font-medium uppercase text-muted-foreground sm:justify-end">
                <Clock className="w-3 h-3" />
                <span>Creado el</span>
                <span className="break-words">{formattedDateTime}</span>
              </div>
              {isPaid && formattedPaidDateTime && (
                <div className="mt-1 flex items-center gap-1 text-[12px] font-medium text-teal-600 dark:text-teal-400 sm:justify-end">
                  <Euro className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="break-words">CONFIRMADO EL PAGO EL {formattedPaidDateTime}</span>
                </div>
              )}
            </div>
          </div>

          {!isPaid && (
            <div className="mt-4 flex flex-col gap-2 border-t border-muted pt-4 sm:flex-row">
              {canReviewPaymentRequest ? (
                <div className="flex-1 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Solicitado por {requesterName}</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-teal-600 dark:text-teal-400 border-teal-500/30 hover:bg-teal-500/10 hover:text-teal-700 dark:hover:text-teal-300"
                      onClick={handleMarkAsPaid}
                      disabled={isUpdatingStatus || isRejectingPaymentRequest || isDeleting}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {isUpdatingStatus ? 'Confirmando...' : 'Confirmar pago'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300"
                      onClick={handleRejectPaymentRequest}
                      disabled={isUpdatingStatus || isRejectingPaymentRequest || isDeleting || !onRejectPaymentRequest}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {isRejectingPaymentRequest ? 'Rechazando...' : 'Rechazar'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 space-y-2">
                  {hasRejectedPaymentRequest && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                      <p className="text-sm font-medium text-rose-700 dark:text-rose-400">{rejectionMessage}</p>
                      <p className="text-xs text-rose-600/80 dark:text-rose-400/70 mt-1">Puedes volver a solicitar el pago cuando quieras.</p>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-teal-600 dark:text-teal-400 border-teal-500/30 hover:bg-teal-500/10 hover:text-teal-700 dark:hover:text-teal-300"
                    onClick={handleMarkAsPaid}
                    disabled={isUpdatingStatus || isRejectingPaymentRequest || isDeleting || (!canRequestConfirmation && !canConfirmPaymentDirectly)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {actionLabel}
                  </Button>
                </div>
              )}

              {canDeleteDebt && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-full shrink-0 text-destructive hover:bg-destructive/10 sm:w-10"
                      disabled={isUpdatingStatus || isRejectingPaymentRequest || isDeleting}
                      title="Eliminar deuda"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{deleteDialogTitle}</AlertDialogTitle>
                      <AlertDialogDescription>{deleteDialogDescription}</AlertDialogDescription>
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
              )}
            </div>
          )}

          {!isPaid && !canDeleteDebt && (
            <p className="mt-2 text-xs text-muted-foreground">
              Solo puede borrar esta deuda la persona que la creó.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
