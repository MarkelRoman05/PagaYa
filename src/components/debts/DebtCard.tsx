"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Debt, Friend } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Trash2,
  Clock,
  User,
  XCircle,
  PenLine,
  LoaderCircle,
  Eye,
  PencilLine,
  ChevronsUpDown,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { usePagaYa } from "@/hooks/use-pagaya";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DebtCardProps {
  debt: Debt;
  friend?: Friend;
  allowEdit?: boolean;
  onUpdate: (
    id: string,
    updates: Partial<
      Pick<Debt, "description" | "amount" | "type" | "friendId">
    >,
  ) => Promise<Debt | void> | void;
  onPaid: (id: string) => Promise<void> | void;
  onRejectPaymentRequest?: (id: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

export function DebtCard({
  debt,
  friend,
  allowEdit = true,
  onUpdate,
  onPaid,
  onRejectPaymentRequest,
  onDelete,
}: DebtCardProps) {
  const { user, friends } = usePagaYa();
  const [mounted, setMounted] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isRejectingPaymentRequest, setIsRejectingPaymentRequest] =
    useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const [isFriendSelectOpen, setIsFriendSelectOpen] = useState(false);
  const friendPickerRef = useRef<HTMLDivElement>(null);
  const [editForm, setEditForm] = useState({
    description: debt.description,
    amount: debt.amount.toFixed(2).replace(".", ","),
    type: debt.type,
    friendId: debt.friendId,
  });
  const selectedEditFriend = friends.find(
    (item) => item.id === editForm.friendId,
  );
  const filteredEditFriends = useMemo(() => {
    const normalizedQuery = friendSearch.trim().toLowerCase();

    if (!normalizedQuery) {
      return friends;
    }

    return friends.filter((item) =>
      item.name.toLowerCase().includes(normalizedQuery),
    );
  }, [friendSearch, friends]);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isOwedToMe = debt.type === "owed_to_me";
  const isPaid = debt.status === "paid";
  const isPaymentRequested = debt.status === "payment_requested";
  const rejectionCount = debt.paymentRequestRejectionCount ?? 0;
  const canEditDebt = Boolean(user?.id && debt.userId === user.id && allowEdit);
  const canDeleteDebt = Boolean(user?.id && debt.userId === user.id);
  const deleteDialogTitle = canDeleteDebt
    ? "¿Eliminar esta deuda?"
    : "No puedes eliminar esta deuda";
  const deleteDialogDescription = canDeleteDebt
    ? "Esta acción no se puede deshacer. Se borrará el registro de esta deuda de forma permanente."
    : "Solo la persona que creó la deuda puede eliminarla.";

  const canRequestConfirmation = !isOwedToMe && debt.status === "pending";
  const canConfirmPaymentDirectly = isOwedToMe && debt.status === "pending";
  const canReviewPaymentRequest = isOwedToMe && isPaymentRequested;
  const requesterName = friend?.name || "tu amigo";
  const hasRejectedPaymentRequest =
    !isOwedToMe && debt.status === "pending" && rejectionCount > 0;
  const rejectionBadgeLabel =
    rejectionCount === 1
      ? "Rechazado 1 vez"
      : `Rechazado ${rejectionCount} veces`;
  const rejectionMessage =
    rejectionCount === 1
      ? `${requesterName} ha rechazado tu solicitud de marcarla como pagada.`
      : `${requesterName} ha rechazado tu solicitud de marcarla como pagada ${rejectionCount} veces.`;
  const statusLabel =
    debt.status === "paid"
      ? "Pagada"
      : debt.status === "payment_requested"
        ? "Pago solicitado"
        : "Pendiente";
  const typeLabel = debt.type === "owed_to_me" ? "Me deben" : "Debo";

  const actionLabel = isUpdatingStatus
    ? "Guardando..."
    : canRequestConfirmation
      ? "Solicitar marcar como pagado"
      : canConfirmPaymentDirectly
        ? "Marcar como pagado"
        : "Esperando confirmación de la otra persona";

  const handleMarkAsPaid = async () => {
    setIsUpdatingStatus(true);

    try {
      await onPaid(debt.id);
      toast({
        title: canRequestConfirmation ? "Solicitud enviada" : "Pago confirmado",
        description: canRequestConfirmation
          ? "La otra persona debe confirmar que el pago se ha recibido."
          : "Has saldado esta deuda. ¡Bien hecho!",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "No se pudo actualizar",
        description:
          error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
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
        title: "Solicitud rechazada",
        description: "La deuda ha vuelto a quedar pendiente.",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "No se pudo rechazar",
        description:
          error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsRejectingPaymentRequest(false);
    }
  };

  const handleDelete = async () => {
    if (!canDeleteDebt) {
      toast({
        title: "No puedes eliminar esta deuda",
        description: "Solo la persona que creó la deuda puede eliminarla.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);

    try {
      await onDelete(debt.id);
      toast({
        title: "Deuda eliminada",
        description: "El registro se ha borrado correctamente.",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "No se pudo eliminar",
        description:
          error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formattedDateTime = mounted
    ? new Date(debt.createdAt).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const formattedPaidDateTime =
    mounted && debt.paidAt
      ? new Date(debt.paidAt).toLocaleString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  const handleEditDialogOpenChange = (open: boolean) => {
    setIsEditOpen(open);

    if (!open) {
      setFriendSearch("");
      setIsFriendSelectOpen(false);
      return;
    }

    setEditForm({
      description: debt.description,
      amount: debt.amount.toFixed(2).replace(".", ","),
      type: debt.type,
      friendId: debt.friendId,
    });
    setFriendSearch("");
    setIsFriendSelectOpen(false);
  };

  useEffect(() => {
    if (!isFriendSelectOpen) {
      return;
    }

    const handlePointerDownOutside = (event: MouseEvent) => {
      if (!friendPickerRef.current) {
        return;
      }

      if (!friendPickerRef.current.contains(event.target as Node)) {
        setIsFriendSelectOpen(false);
        setFriendSearch("");
      }
    };

    document.addEventListener("mousedown", handlePointerDownOutside);

    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
    };
  }, [isFriendSelectOpen]);

  const handleSaveEdit = async () => {
    if (!canEditDebt) {
      toast({
        title: "No puedes editar esta deuda",
        description: "Solo la persona que creó la deuda puede modificarla.",
        variant: "destructive",
      });
      return;
    }

    const normalizedAmount = editForm.amount
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^0-9.-]/g, "");
    const parsedAmount = Number.parseFloat(normalizedAmount);
    const description = editForm.description.trim();

    if (!description) {
      toast({
        title: "Falta la descripción",
        description: "Escribe un nombre o motivo para la deuda.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: "Cantidad no válida",
        description: "La cantidad debe ser mayor que cero.",
        variant: "destructive",
      });
      return;
    }

    if (!editForm.friendId) {
      toast({
        title: "Selecciona un amigo",
        description: "Debes asignar esta deuda a un amigo.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingEdit(true);

    try {
      await onUpdate(debt.id, {
        description,
        amount: parsedAmount,
        type: editForm.type,
        friendId: editForm.friendId,
      });

      toast({
        title: "Deuda actualizada",
        description: "Los cambios se han guardado correctamente.",
      });

      setIsEditOpen(false);
    } catch (error) {
      toast({
        title: "No se pudo actualizar",
        description:
          error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <>
      <Card
        className={cn(
          "overflow-hidden transition-all hover:shadow-md",
          isPaid && "opacity-70 grayscale",
        )}
      >
        <CardContent className="p-4">
          <div className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge
                  variant={isOwedToMe ? "default" : "secondary"}
                  className="text-[10px] uppercase font-bold tracking-wider"
                >
                  {isOwedToMe ? "Me deben" : "Debo"}
                </Badge>
                {isPaymentRequested && (
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 border-amber-600/50 bg-amber-500/10"
                  >
                    Por confirmar
                  </Badge>
                )}
                {hasRejectedPaymentRequest && (
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 border-rose-600/50 bg-rose-500/10"
                  >
                    {rejectionBadgeLabel}
                  </Badge>
                )}
                {isPaid && (
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-400 border-teal-600/50 bg-teal-500/10"
                  >
                    Pagado
                  </Badge>
                )}
              </div>
              <h3 className="break-words font-semibold text-base sm:text-lg">
                {debt.description}
              </h3>
              <div className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                <User className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="break-words">
                  Deuda con {friend?.name || "Amigo desconocido"}
                </span>
              </div>
              <div className="mt-0.5 flex items-start gap-1.5 text-xs text-muted-foreground/70">
                <PenLine className="w-3 h-3 mt-0.5 shrink-0" />
                <span>
                  Creada por{" "}
                  {debt.userId === user?.id ? "ti" : friend?.name || "tu amigo"}
                </span>
              </div>
            </div>
            <div className="w-full text-left sm:w-auto sm:max-w-[220px] sm:text-right">
              <span
                className={cn(
                  "block break-words text-2xl font-bold sm:text-3xl",
                  isOwedToMe ? "text-primary" : "text-orange-600",
                )}
              >
                {formatCurrency(debt.amount)}
              </span>
              <div className="mt-1 flex items-start gap-1 text-[12px] font-medium uppercase text-muted-foreground sm:justify-end">
                <Clock className="w-3 h-3 shrink-0" />
                <span className="break-words leading-tight text-left sm:text-right">
                  Creado el {formattedDateTime}
                </span>
              </div>
              {isPaid && formattedPaidDateTime && (
                <div className="mt-1 flex items-start gap-1 text-[12px] font-medium text-teal-600 dark:text-teal-400 sm:justify-end">
                  <CheckCircle2
                    className="w-3.5 h-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="break-words leading-tight text-left sm:text-right">
                    Confirmado el pago el {formattedPaidDateTime}
                  </span>
                </div>
              )}
            </div>
          </div>

          {!isPaid && (
            <div
              className={cn(
                "mt-4 grid gap-2 border-t border-muted pt-4",
                canDeleteDebt
                  ? "grid-cols-1 items-start sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  : "grid-cols-1",
              )}
            >
              {canReviewPaymentRequest ? (
                <div className="min-w-0 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Solicitado por {requesterName}
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-teal-600 dark:text-teal-400 border-teal-500/30 hover:bg-teal-500/10 hover:text-teal-700 dark:hover:text-teal-300"
                      onClick={handleMarkAsPaid}
                      disabled={
                        isUpdatingStatus ||
                        isRejectingPaymentRequest ||
                        isDeleting
                      }
                    >
                      {isUpdatingStatus ? (
                        <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      {isUpdatingStatus ? "Confirmando..." : "Confirmar pago"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300"
                      onClick={handleRejectPaymentRequest}
                      disabled={
                        isUpdatingStatus ||
                        isRejectingPaymentRequest ||
                        isDeleting ||
                        !onRejectPaymentRequest
                      }
                    >
                      {isRejectingPaymentRequest ? (
                        <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      {isRejectingPaymentRequest ? "Rechazando..." : "Rechazar"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="min-w-0 space-y-2">
                  {hasRejectedPaymentRequest && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                      <p className="text-sm font-medium text-rose-700 dark:text-rose-400">
                        {rejectionMessage}
                      </p>
                      <p className="text-xs text-rose-600/80 dark:text-rose-400/70 mt-1">
                        Puedes volver a solicitar el pago cuando quieras.
                      </p>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto min-h-9 w-full whitespace-normal break-words py-2 text-left leading-tight text-teal-600 dark:text-teal-400 border-teal-500/30 hover:bg-teal-500/10 hover:text-teal-700 dark:hover:text-teal-300 sm:h-9 sm:whitespace-nowrap sm:py-0 sm:text-center"
                    onClick={handleMarkAsPaid}
                    disabled={
                      isUpdatingStatus ||
                      isRejectingPaymentRequest ||
                      isDeleting ||
                      (!canRequestConfirmation && !canConfirmPaymentDirectly)
                    }
                  >
                    {isUpdatingStatus ? (
                      <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    {actionLabel}
                  </Button>
                </div>
              )}

            </div>
          )}

          {!isPaid && !canDeleteDebt && (
            <p className="mt-2 text-xs text-muted-foreground">
              Solo puede borrar esta deuda la persona que la creó.
            </p>
          )}

          <div className="mt-3 grid grid-cols-1 gap-2 border-t border-muted pt-3 sm:flex sm:flex-wrap">
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-full justify-center text-sm sm:h-8 sm:w-auto sm:text-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver info
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100%-1.5rem)] max-w-lg p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle>Información de la deuda</DialogTitle>
                  <DialogDescription>
                    Revisa todos los detalles registrados para esta deuda.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 text-sm">
                  <div>
                    <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">
                      Descripción
                    </p>
                    <p className="mt-1 break-words font-medium">
                      {debt.description}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">
                        Estado
                      </p>
                      <p className="mt-1">{statusLabel}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">
                        Tipo
                      </p>
                      <p className="mt-1">{typeLabel}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">
                        Importe
                      </p>
                      <p className="mt-1 font-semibold">
                        {formatCurrency(debt.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">
                        Asignada a
                      </p>
                      <p className="mt-1 break-words">
                        {friend?.name || "Amigo desconocido"}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">
                        Creada
                      </p>
                      <p className="mt-1">{formattedDateTime || "Sin fecha"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">
                        Pagada
                      </p>
                      <p className="mt-1">
                        {formattedPaidDateTime || "Aún no pagada"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">
                      Propietario
                    </p>
                    <p className="mt-1">
                      {debt.userId === user?.id ? "Tú" : "Otra persona"}
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {canEditDebt && (
              <Dialog
                open={isEditOpen}
                onOpenChange={handleEditDialogOpenChange}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-full justify-center text-sm sm:h-8 sm:w-auto sm:text-xs"
                  >
                    <PencilLine className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                </DialogTrigger>
                <DialogContent
                  className="w-[calc(100%-1.5rem)] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6"
                  onOpenAutoFocus={(event) => {
                    event.preventDefault();
                  }}
                >
                  <DialogHeader>
                    <DialogTitle>Editar deuda</DialogTitle>
                    <DialogDescription>
                      Modifica la información y guarda los cambios.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor={`debt-description-${debt.id}`}>
                        Nombre o descripción
                      </Label>
                      <Input
                        id={`debt-description-${debt.id}`}
                        value={editForm.description}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        placeholder="Cena, transporte, entradas..."
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor={`debt-amount-${debt.id}`}>
                        Cantidad (€)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                          €
                        </span>
                        <Input
                          id={`debt-amount-${debt.id}`}
                          type="text"
                          inputMode="decimal"
                          pattern="[0-9]*[.,]?[0-9]*"
                          placeholder="0,00"
                          className="pl-8 h-10 rounded-lg text-base font-bold border-muted focus-visible:border-primary focus-visible:ring-primary/60 focus-visible:ring-inset focus-visible:ring-offset-0"
                          value={editForm.amount}
                          onChange={(event) => {
                            const rawValue = event.target.value
                              .replace(/\s/g, "")
                              .replace(/\./g, "")
                              .replace(/[^\d,]/g, "");

                            const hasComma = rawValue.includes(",");
                            const [integerRaw = "", ...decimalParts] =
                              rawValue.split(",");
                            const decimalPart = decimalParts.join("");

                            let integerPart = integerRaw.replace(
                              /^0+(?=\d)/,
                              "",
                            );

                            if (!integerPart && hasComma) {
                              integerPart = "0";
                            }

                            const formattedInteger = integerPart
                              ? integerPart.replace(
                                  /\B(?=(\d{3})+(?!\d))/g,
                                  ".",
                                )
                              : "";

                            const formattedValue = hasComma
                              ? `${formattedInteger},${decimalPart}`
                              : formattedInteger;

                            setEditForm((current) => ({
                              ...current,
                              amount: formattedValue,
                            }));
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Tipo</Label>
                      <RadioGroup
                        value={editForm.type}
                        onValueChange={(value) =>
                          setEditForm((current) => ({
                            ...current,
                            type: value as Debt["type"],
                          }))
                        }
                        className="grid gap-3 sm:grid-cols-2"
                      >
                        <Label
                          htmlFor={`debt-type-me-${debt.id}`}
                          className={cn(
                            "flex cursor-pointer items-center justify-between rounded-lg border-2 p-3 text-sm transition-all focus-within:ring-2 focus-within:ring-primary/50 focus-within:ring-inset focus-within:ring-offset-0",
                            editForm.type === "owed_to_me"
                              ? "border-primary bg-primary/10 text-foreground shadow-sm"
                              : "border-muted hover:border-muted-foreground/30",
                          )}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-bold">Me deben</span>
                            <span className="text-[9px] text-muted-foreground uppercase font-medium">
                              Préstamo
                            </span>
                          </div>
                          <RadioGroupItem
                            value="owed_to_me"
                            id={`debt-type-me-${debt.id}`}
                            className="sr-only"
                          />
                        </Label>
                        <Label
                          htmlFor={`debt-type-them-${debt.id}`}
                          className={cn(
                            "flex cursor-pointer items-center justify-between rounded-lg border-2 p-3 text-sm transition-all focus-within:ring-2 focus-within:ring-orange-300 focus-within:ring-inset focus-within:ring-offset-0",
                            editForm.type === "owed_by_me"
                              ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-foreground shadow-sm"
                              : "border-muted hover:border-muted-foreground/30",
                          )}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-bold">Debo</span>
                            <span className="text-[9px] text-muted-foreground uppercase font-medium">
                              Deuda
                            </span>
                          </div>
                          <RadioGroupItem
                            value="owed_by_me"
                            id={`debt-type-them-${debt.id}`}
                            className="sr-only"
                          />
                        </Label>
                      </RadioGroup>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor={`debt-friend-${debt.id}`}>
                        Asignada a
                      </Label>
                      <div ref={friendPickerRef} className="relative">
                        <Button
                          id={`debt-friend-${debt.id}`}
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={isFriendSelectOpen}
                          onClick={() => {
                            setIsFriendSelectOpen((current) => {
                              if (current) {
                                setFriendSearch("");
                              }
                              return !current;
                            });
                          }}
                          className="h-10 w-full justify-between rounded-lg border-muted px-3 font-normal transition-colors focus:ring-primary/60 focus:ring-inset focus:ring-offset-0 data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/60 data-[state=open]:ring-inset data-[state=open]:ring-offset-0"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            {selectedEditFriend ? (
                              <>
                                <Avatar className="h-6 w-6">
                                  {selectedEditFriend.avatar ? (
                                    <AvatarImage
                                      src={selectedEditFriend.avatar}
                                      alt={selectedEditFriend.name}
                                    />
                                  ) : null}
                                  <AvatarFallback className="text-xs font-semibold uppercase">
                                    {selectedEditFriend.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate">
                                  {selectedEditFriend.name}
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">
                                Selecciona un amigo
                              </span>
                            )}
                          </div>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>

                        {isFriendSelectOpen && (
                          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
                            <div className="border-b border-border bg-popover px-2 py-2">
                              <Input
                                value={friendSearch}
                                onChange={(event) =>
                                  setFriendSearch(event.target.value)
                                }
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                  }
                                  if (event.key === "Escape") {
                                    setIsFriendSelectOpen(false);
                                    setFriendSearch("");
                                  }
                                }}
                                placeholder="Buscar amigo..."
                                className="h-9"
                              />
                            </div>

                            {filteredEditFriends.length === 0 ? (
                              <p className="px-2 py-3 text-sm text-muted-foreground">
                                No se encontraron amigos.
                              </p>
                            ) : (
                              <div className="max-h-56 overflow-y-auto p-1">
                                {filteredEditFriends.map((friendOption) => {
                                  const isSelected =
                                    editForm.friendId === friendOption.id;

                                  return (
                                    <button
                                      key={friendOption.id}
                                      type="button"
                                      onClick={() => {
                                        setEditForm((current) => ({
                                          ...current,
                                          friendId: friendOption.id,
                                        }));
                                        setIsFriendSelectOpen(false);
                                        setFriendSearch("");
                                      }}
                                      className={cn(
                                        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-primary/10 hover:text-foreground",
                                        isSelected &&
                                          "bg-primary/15 font-semibold",
                                      )}
                                    >
                                      <Avatar className="h-6 w-6">
                                        {friendOption.avatar ? (
                                          <AvatarImage
                                            src={friendOption.avatar}
                                            alt={friendOption.name}
                                          />
                                        ) : null}
                                        <AvatarFallback className="text-xs font-semibold uppercase">
                                          {friendOption.name.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="truncate">
                                        {friendOption.name}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="mt-2 grid grid-cols-1 gap-2 border-t border-border/60 pt-3 sm:flex sm:justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditOpen(false)}
                      disabled={isSavingEdit}
                      className="h-11 w-full sm:w-auto"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveEdit}
                      disabled={isSavingEdit}
                      className="h-11 w-full sm:w-auto"
                    >
                      {isSavingEdit ? (
                        <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      {isSavingEdit ? "Guardando..." : "Guardar cambios"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {canDeleteDebt && !isPaid && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-full justify-center text-sm text-rose-500 hover:text-rose-600 sm:h-8 sm:w-auto sm:text-xs"
                    disabled={
                      isUpdatingStatus ||
                      isRejectingPaymentRequest ||
                      isDeleting
                    }
                    title="Eliminar deuda"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {isDeleting ? "Eliminando..." : "Eliminar"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{deleteDialogTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {deleteDialogDescription}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? (
                        <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      {isDeleting ? "Eliminando..." : "Eliminar"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
