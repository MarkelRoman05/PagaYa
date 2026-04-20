"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import { usePagaYa } from "@/hooks/use-pagaya";
import { AppLoadingScreen, InlineLoadingNotice } from "@/components/ui/app-loading-screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { LoaderCircle, Plus, RefreshCw, Check, X, Users } from "lucide-react";

function isGroupImageIcon(value?: string) {
  if (!value) {
    return false;
  }

  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image/");
}

export default function GroupsPage() {
  const {
    user,
    groups,
    groupMembers,
    groupExpenses,
    groupInvitations,
    isReady,
    isLoadingData,
    refreshData,
    acceptGroupInvitation,
    rejectGroupInvitation,
  } = usePagaYa();
  const { toast } = useToast();
  const [activeInvitationId, setActiveInvitationId] = useState<string | null>(null);

  const groupMemberCount = useMemo(() => {
    return new Map(groups.map((group) => [group.id, groupMembers.filter((member) => member.groupId === group.id).length]));
  }, [groupMembers, groups]);

  const groupTotalAmount = useMemo(() => {
    return new Map(
      groups.map((group) => {
        const total = groupExpenses
          .filter((expense) => expense.groupId === group.id)
          .reduce((sum, expense) => sum + expense.amount, 0);

        return [group.id, total];
      }),
    );
  }, [groupExpenses, groups]);

  const pendingInvitations = groupInvitations.filter(
    (invitation) =>
      invitation.status === "pending" &&
      (invitation.toUserId === user?.id || invitation.toEmail === user?.email),
  );

  const handleAcceptInvitation = async (invitationId: string) => {
    setActiveInvitationId(invitationId);

    try {
      await acceptGroupInvitation(invitationId);
      toast({
        title: "Invitación aceptada",
        description: "Te has unido al grupo correctamente.",
      });
    } catch (error) {
      toast({
        title: "No se pudo aceptar",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setActiveInvitationId(null);
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    setActiveInvitationId(invitationId);

    try {
      await rejectGroupInvitation(invitationId);
      toast({
        title: "Invitación rechazada",
        description: "La invitación se ha descartado.",
      });
    } catch (error) {
      toast({
        title: "No se pudo rechazar",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setActiveInvitationId(null);
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshData();
    } catch (error) {
      toast({
        title: "No se pudo recargar",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  if (!isReady) {
    return <AppLoadingScreen title="Cargando grupos" subtitle="Preparando grupos, miembros e invitaciones..." />;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-24 md:pb-20 md:pt-20">
        <Navbar />

        <main className="container mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">Grupos</h1>
              <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                Organiza gastos compartidos, invitados y roles de pago en un solo sitio.
              </p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button variant="outline" onClick={handleRefresh} disabled={isLoadingData} className="flex-1 sm:flex-none">
                <RefreshCw className={isLoadingData ? "animate-spin" : ""} />
                Recargar
              </Button>
              <Button asChild className="flex-1 rounded-full sm:flex-none">
                <Link href="/groups/new">
                  <Plus className="h-5 w-5" />
                  Nuevo grupo
                </Link>
              </Button>
            </div>
          </header>

          {isLoadingData ? <InlineLoadingNotice message="Sincronizando grupos y miembros..." /> : null}

          {pendingInvitations.length > 0 ? (
            <section className="mb-10">
              <h2 className="mb-4 text-xl font-bold">Invitaciones pendientes</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {pendingInvitations.map((invitation) => (
                  <Card key={invitation.id} className="border-primary/20 bg-primary/5">
                    <CardContent className="space-y-4 p-4">
                      <div>
                        <p className="text-lg font-bold">{invitation.invitedName}</p>
                        <p className="text-sm text-muted-foreground">Te ha invitado {invitation.inviterName}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleAcceptInvitation(invitation.id)}
                          disabled={activeInvitationId === invitation.id}
                          className="flex-1"
                        >
                          {activeInvitationId === invitation.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          Aceptar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleRejectInvitation(invitation.id)}
                          disabled={activeInvitationId === invitation.id}
                          className="flex-1"
                        >
                          <X className="h-4 w-4" />
                          Rechazar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-xl font-bold">Tus grupos</h2>
              <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/12 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm shadow-primary/15">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-primary" />
                {groups.length} grupo(s)
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {groups.length > 0 ? (
                groups.map((group) => (
                  <Link key={group.id} href={`/groups/${group.id}`} className="group">
                    <Card className="relative h-full overflow-hidden border-border/70 bg-gradient-to-br from-card to-card/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-lg hover:shadow-primary/10">
                      <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                      <CardContent className="relative space-y-4 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/30 bg-background/85 shadow-sm shadow-primary/10">
                              {isGroupImageIcon(group.icon) ? (
                                <img src={group.icon} alt={`Icono de ${group.name}`} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-3xl leading-none">{group.icon || "👥"}</span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate text-lg font-bold leading-tight transition-colors group-hover:text-primary">{group.name}</h3>
                              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{group.description || "Grupo sin descripción"}</p>
                            </div>
                          </div>
                          <div className="rounded-full border border-primary/30 bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">
                            {formatCurrency(groupTotalAmount.get(group.id) ?? 0)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/45 px-3 py-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4 text-primary" />
                          <span>{groupMemberCount.get(group.id) ?? 0} miembros</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="col-span-full rounded-2xl border border-dashed bg-card/50 px-4 py-16 text-center">
                  <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
                  <h3 className="text-lg font-medium text-muted-foreground">No tienes grupos todavía</h3>
                  <p className="mt-1 text-sm text-muted-foreground/70">Crea uno para empezar a repartir gastos.</p>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}
