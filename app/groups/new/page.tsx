"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import { usePagaYa } from "@/hooks/use-pagaya";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, LoaderCircle, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NewGroupPage() {
  const router = useRouter();
  const { createGroup, isReady } = usePagaYa();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const group = await createGroup({
        name: formData.name,
        description: formData.description,
      });

      toast({
        title: "Grupo creado",
        description: `Ya puedes añadir gastos en ${group.name}.`,
      });

      router.push(`/groups/${group.id}`);
    } catch (error) {
      toast({
        title: "No se pudo crear el grupo",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isReady) {
    return <AppLoadingScreen title="Preparando nuevo grupo" subtitle="Cargando los recursos necesarios..." />;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-24 md:pb-20 md:pt-20">
        <Navbar />

        <main className="container mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="mb-6">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link href="/groups" className="flex items-center gap-1">
                <ChevronLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Nuevo grupo</h1>
          </div>

          <form onSubmit={handleSubmit}>
            <Card className="shadow-lg border-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Información básica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    placeholder="Ej: Viaje a Lisboa"
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                    placeholder="Ej: Hotel, comida y excursiones"
                    className="h-12 rounded-xl"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSubmitting} className="h-14 w-full rounded-xl text-lg font-bold shadow-lg shadow-primary/20">
                  {isSubmitting ? <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                  {isSubmitting ? "Creando..." : "Crear grupo"}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </main>
      </div>
    </ProtectedRoute>
  );
}
