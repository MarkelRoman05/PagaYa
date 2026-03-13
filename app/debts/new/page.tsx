"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import { usePagaYa } from "@/hooks/use-pagaya";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
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
import { ChevronLeft, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function NewDebt() {
  const router = useRouter();
  const { friends, addDebt, isReady, isLoadingData } = usePagaYa();
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

      router.push("/dashboard");
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

  if (!isReady) return null;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-24 md:pb-20 md:pt-20">
        <Navbar />

        <main className="container mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="mb-6">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link href="/dashboard" className="flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" />
                Volver
              </Link>
            </Button>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Nueva deuda</h1>
          </div>

          {isLoadingData && (
            <div className="mb-6 rounded-xl border bg-white px-4 py-3 text-sm text-muted-foreground">
              Cargando tus contactos disponibles...
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Card className="shadow-lg border-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Detalles del pago</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>¿Quién debe el dinero?</Label>
                  <RadioGroup
                    value={formData.type}
                    onValueChange={(val) =>
                      setFormData({ ...formData, type: val as any })
                    }
                    className="grid gap-4 sm:grid-cols-2"
                  >
                    <Label
                      htmlFor="type-me"
                      className={cn(
                        "flex items-center justify-between rounded-xl border-2 p-4 cursor-pointer transition-all",
                        formData.type === "owed_to_me"
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-muted-foreground/30",
                      )}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-bold">Me deben</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">
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
                        "flex items-center justify-between rounded-xl border-2 p-4 cursor-pointer transition-all",
                        formData.type === "owed_by_me"
                          ? "border-orange-500 bg-orange-50"
                          : "border-muted hover:border-muted-foreground/30",
                      )}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-bold">Yo debo</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">
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
                  <Label htmlFor="friend">Amigo</Label>
                  <Select
                    value={formData.friendId}
                    onValueChange={(val) =>
                      setFormData({ ...formData, friendId: val })
                    }
                  >
                    <SelectTrigger id="friend" className="h-12 rounded-xl">
                      <SelectValue placeholder="Selecciona un amigo" />
                    </SelectTrigger>
                    <SelectContent>
                      {friends.map((friend) => (
                        <SelectItem key={friend.id} value={friend.id}>
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
                  <Label htmlFor="amount">Cantidad (€)</Label>
                  <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    €
                  </span>
                  <Input
                    id="amount"
                    type="text"
                    placeholder="0,00"
                    className="pl-8 h-12 rounded-xl text-lg font-bold"
                    value={formData.amount}
                    onChange={(e) => {
                    let value = e.target.value;

                    // Convierte puntos en comas
                    value = value.replace(/\./g, ",");

                    // Solo permite números y comas
                    value = value.replace(/[^\d,]/g, "");

                    // Deja una sola coma
                    const parts = value.split(",");
                    if (parts.length > 2) {
                      value = `${parts[0]},${parts.slice(1).join("")}`;
                    }

                    // Evita que empiece por coma
                    if (value.startsWith(",")) {
                      value = `0${value}`;
                    }

                    // Elimina ceros a la izquierda salvo en decimales tipo 0,5
                    value = value.replace(/^0+(?=\d)/, "");

                    setFormData({ ...formData, amount: value });
                    }}
                    required
                  />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">¿Por qué?</Label>
                  <Input
                    id="description"
                    placeholder="Ej: Cena, Cine, Gasolina..."
                    className="h-12 rounded-xl"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button
                  type="submit"
                  disabled={friends.length === 0 || isSubmitting}
                  className="w-full h-14 rounded-xl text-lg font-bold shadow-lg shadow-primary/20 disabled:shadow-none"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {isSubmitting ? "Guardando..." : "Registrar deuda"}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </main>
      </div>
    </ProtectedRoute>
  );
}
