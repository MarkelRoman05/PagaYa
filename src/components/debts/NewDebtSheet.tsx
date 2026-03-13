"use client";

import { useState } from "react";
import { usePagaYa } from "@/hooks/use-pagaya";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface NewDebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewDebtDialog({ open, onOpenChange }: NewDebtDialogProps) {
  const { friends, addDebt, isLoadingData } = usePagaYa();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    friendId: "",
    type: "owed_to_me" as "owed_to_me" | "owed_by_me",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedAmount = formData.amount
      .replace(",", ".")
      .replace(/[^0-9.-]/g, "");
    const parsedAmount = Number.parseFloat(normalizedAmount);
    const description = formData.description.trim();

    if (!formData.friendId) {
      toast({
        title: "Selecciona un amigo",
        description: "Debes elegir quién participa en esta deuda.",
        variant: "destructive",
      });
      return;
    }

    if (!description) {
      toast({
        title: "Falta la descripción",
        description: "Añade un motivo corto para identificar la deuda después.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: "Cantidad no válida",
        description: "Introduce un importe mayor que cero.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await addDebt({
        amount: parsedAmount,
        description,
        friendId: formData.friendId,
        type: formData.type,
      });

      toast({
        title: "Deuda registrada",
        description: "La deuda ya aparece en tu panel principal.",
      });

      setFormData({
        amount: "",
        description: "",
        friendId: "",
        type: "owed_to_me",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "No se pudo registrar",
        description:
          error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-1.5rem)] max-w-md flex-col overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Nueva deuda</DialogTitle>
          <DialogDescription>
            Registra un nuevo pago entre tú y tus amigos.
          </DialogDescription>
        </DialogHeader>

        {isLoadingData && (
          <div className="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
            Cargando tus contactos disponibles...
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 space-y-6 overflow-y-auto pr-1 sm:pr-2">
          <div className="space-y-3">
            <Label>¿Quién debe el dinero?</Label>
            <RadioGroup
              value={formData.type}
              onValueChange={(val) =>
                setFormData({ ...formData, type: val as any })
              }
              className="grid gap-3 sm:grid-cols-2"
            >
              <Label
                htmlFor="type-me"
                className={cn(
                  "flex items-center justify-between rounded-lg border-2 p-3 cursor-pointer transition-all text-sm focus-within:ring-2 focus-within:ring-primary/50 focus-within:ring-inset focus-within:ring-offset-0",
                  formData.type === "owed_to_me"
                    ? "border-primary bg-primary/10 text-foreground shadow-sm"
                    : "border-muted hover:border-muted-foreground/30"
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
                  id="type-me"
                  className="sr-only"
                />
              </Label>
              <Label
                htmlFor="type-them"
                className={cn(
                  "flex items-center justify-between rounded-lg border-2 p-3 cursor-pointer transition-all text-sm focus-within:ring-2 focus-within:ring-orange-300 focus-within:ring-inset focus-within:ring-offset-0",
                  formData.type === "owed_by_me"
                    ? "border-orange-500 bg-orange-50 text-foreground shadow-sm"
                    : "border-muted hover:border-muted-foreground/30"
                )}
              >
                <div className="flex flex-col gap-1">
                  <span className="font-bold">Yo debo</span>
                  <span className="text-[9px] text-muted-foreground uppercase font-medium">
                    Deuda
                  </span>
                </div>
                <RadioGroupItem
                  value="owed_by_me"
                  id="type-them"
                  className="sr-only"
                />
              </Label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="friend" className="text-sm">
              Amigo
            </Label>
            <Select
              value={formData.friendId}
              onValueChange={(val) =>
                setFormData({ ...formData, friendId: val })
              }
            >
              <SelectTrigger
                id="friend"
                className="h-10 rounded-lg border-muted transition-colors focus:ring-primary/60 focus:ring-inset focus:ring-offset-0 data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/60 data-[state=open]:ring-inset data-[state=open]:ring-offset-0"
              >
                <SelectValue placeholder="Selecciona un amigo" />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-border shadow-xl">
                {friends.map((friend) => (
                  <SelectItem
                    key={friend.id}
                    value={friend.id}
                    className="rounded-md data-[highlighted]:bg-primary/10 data-[highlighted]:text-foreground data-[state=checked]:bg-primary/15 data-[state=checked]:font-semibold"
                  >
                    {friend.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {friends.length === 0 && (
              <p className="text-xs text-orange-600 mt-1">
                Primero añade amigos en la sección de amigos.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm">
              Cantidad (€)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                €
              </span>
              <Input
                id="amount"
                type="text"
                placeholder="0,00"
                className="pl-8 h-10 rounded-lg text-base font-bold border-muted focus-visible:border-primary focus-visible:ring-primary/60 focus-visible:ring-inset focus-visible:ring-offset-0"
                value={formData.amount}
                onChange={(e) => {
                  let value = e.target.value;
                  value = value.replace(/\./g, ",");
                  value = value.replace(/[^\d,]/g, "");
                  const parts = value.split(",");
                  if (parts.length > 2) {
                    value = `${parts[0]},${parts.slice(1).join("")}`;
                  }
                  if (value.startsWith(",")) {
                    value = `0${value}`;
                  }
                  value = value.replace(/^0+(?=\d)/, "");
                  setFormData({ ...formData, amount: value });
                }}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm">
              ¿Por qué?
            </Label>
            <Input
              id="description"
              placeholder="Ej: Cena, Cine, Gasolina..."
              className="h-10 rounded-lg border-muted focus-visible:border-primary focus-visible:ring-primary/60 focus-visible:ring-inset focus-visible:ring-offset-0"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
            />
          </div>
        </form>

        <Button
          onClick={handleSubmit}
          disabled={friends.length === 0 || isSubmitting}
          className="w-full h-11 rounded-lg text-base font-semibold shadow-lg shadow-primary/20 disabled:shadow-none mt-4"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSubmitting ? "Guardando..." : "Registrar deuda"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
