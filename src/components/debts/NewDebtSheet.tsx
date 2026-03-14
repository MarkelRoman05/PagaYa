"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChevronsUpDown, Save, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { InlineLoadingNotice } from '@/components/ui/app-loading-screen';

interface NewDebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewDebtDialog({ open, onOpenChange }: NewDebtDialogProps) {
  const { friends, addDebt, isLoadingData } = usePagaYa();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const [isFriendSelectOpen, setIsFriendSelectOpen] = useState(false);
  const friendSearchInputRef = useRef<HTMLInputElement>(null);
  const friendPickerRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    friendId: "",
    type: "owed_to_me" as "owed_to_me" | "owed_by_me",
  });
  const selectedFriend = friends.find(
    (friend) => friend.id === formData.friendId,
  );
  const filteredFriends = useMemo(() => {
    const normalizedQuery = friendSearch.trim().toLowerCase();

    if (!normalizedQuery) {
      return friends;
    }

    return friends.filter((friend) =>
      friend.name.toLowerCase().includes(normalizedQuery),
    );
  }, [friendSearch, friends]);

  useEffect(() => {
    if (!isFriendSelectOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      friendSearchInputRef.current?.focus();
    }, 0);
    const retryTimeoutId = window.setTimeout(() => {
      friendSearchInputRef.current?.focus();
    }, 50);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearTimeout(retryTimeoutId);
    };
  }, [isFriendSelectOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedAmount = formData.amount
      .replace(/\./g, "")
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
          <InlineLoadingNotice
            message="Cargando tus contactos disponibles..."
            className="mb-0 rounded-lg px-3 py-2 text-xs"
          />
        )}

        <form
          onSubmit={handleSubmit}
          className="flex-1 space-y-6 overflow-y-auto pr-1 sm:pr-2"
        >
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
                  id="type-me"
                  className="sr-only"
                />
              </Label>
              <Label
                htmlFor="type-them"
                className={cn(
                  "flex items-center justify-between rounded-lg border-2 p-3 cursor-pointer transition-all text-sm focus-within:ring-2 focus-within:ring-orange-300 focus-within:ring-inset focus-within:ring-offset-0",
                  formData.type === "owed_by_me"
                    ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-foreground shadow-sm"
                    : "border-muted hover:border-muted-foreground/30",
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
            <div ref={friendPickerRef} className="relative">
              <Button
                id="friend"
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={isFriendSelectOpen}
                onClick={() => {
                  setIsFriendSelectOpen((prev) => {
                    if (prev) {
                      setFriendSearch("");
                    }
                    return !prev;
                  });
                }}
                className="h-10 w-full justify-between rounded-lg border-muted px-3 font-normal transition-colors focus:ring-primary/60 focus:ring-inset focus:ring-offset-0 data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/60 data-[state=open]:ring-inset data-[state=open]:ring-offset-0"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {selectedFriend ? (
                    <>
                      <Avatar className="h-6 w-6">
                        {selectedFriend.avatar ? (
                          <AvatarImage
                            src={selectedFriend.avatar}
                            alt={selectedFriend.name}
                          />
                        ) : null}
                        <AvatarFallback className="text-xs font-semibold uppercase">
                          {selectedFriend.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{selectedFriend.name}</span>
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
                <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 rounded-lg border border-border bg-popover shadow-xl">
                  <div className="sticky top-0 z-10 border-b border-border bg-popover p-2">
                    <Input
                      ref={friendSearchInputRef}
                      autoFocus
                      value={friendSearch}
                      onChange={(event) => setFriendSearch(event.target.value)}
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
                  {filteredFriends.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-muted-foreground">
                      No se encontraron amigos.
                    </p>
                  ) : (
                    <div className="max-h-56 overflow-y-auto p-1">
                      {filteredFriends.map((friend) => {
                        const isSelected = formData.friendId === friend.id;

                        return (
                          <button
                            key={friend.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, friendId: friend.id });
                              setIsFriendSelectOpen(false);
                              setFriendSearch("");
                            }}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-primary/10 hover:text-foreground",
                              isSelected && "bg-primary/15 font-semibold",
                            )}
                          >
                            <Avatar className="h-6 w-6">
                              {friend.avatar ? (
                                <AvatarImage
                                  src={friend.avatar}
                                  alt={friend.name}
                                />
                              ) : null}
                              <AvatarFallback className="text-xs font-semibold uppercase">
                                {friend.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{friend.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
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
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                enterKeyHint="done"
                placeholder="0,00"
                className="pl-8 h-10 rounded-lg text-base font-bold border-muted focus-visible:border-primary focus-visible:ring-primary/60 focus-visible:ring-inset focus-visible:ring-offset-0"
                value={formData.amount}
                onChange={(e) => {
                  const rawValue = e.target.value
                    .replace(/\s/g, "")
                    .replace(/\./g, "")
                    .replace(/[^\d,]/g, "");

                  const hasComma = rawValue.includes(",");
                  const [integerRaw = "", ...decimalParts] = rawValue.split(",");
                  const decimalPart = decimalParts.join("");

                  let integerPart = integerRaw.replace(/^0+(?=\d)/, "");

                  if (!integerPart && hasComma) {
                    integerPart = "0";
                  }

                  const formattedInteger = integerPart
                    ? integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                    : "";

                  const formattedValue = hasComma
                    ? `${formattedInteger},${decimalPart}`
                    : formattedInteger;

                  setFormData({ ...formData, amount: formattedValue });
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
              placeholder="Cena, Cine, Gasolina..."
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
          {isSubmitting ? <LoaderCircle className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {isSubmitting ? "Guardando..." : "Registrar deuda"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
