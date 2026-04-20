"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { usePagaYa } from "@/hooks/use-pagaya";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { GroupInvitation } from "@/lib/types";
import { CheckCircle2, Copy, LockKeyhole, Sparkles, Users } from "lucide-react";

type PublicGroupInvitation = GroupInvitation & {
  groupName: string;
};

export default function GroupInvitePage() {
  const params = useParams();
  const router = useRouter();
  const invitationId = params.invitationId as string;
  const { acceptGroupInvitation, signOut, user, isAuthenticated, groupMembers } = usePagaYa();
  const [isReady, setIsReady] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [invitation, setInvitation] = useState<PublicGroupInvitation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInviteUrl(window.location.href);
  }, []);

  useEffect(() => {
    const loadInvitation = async () => {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        setError("No se pudo conectar con el backend.");
        setIsReady(true);
        return;
      }

      const { data, error: rpcError } = await supabase.rpc("get_group_invitation_public", {
        invitation_id: invitationId,
      });

      if (rpcError) {
        setError(rpcError.message);
        setIsReady(true);
        return;
      }

      const row = Array.isArray(data) ? data[0] : null;

      if (!row) {
        setError("La invitación no existe o ya no está disponible.");
        setIsReady(true);
        return;
      }

      setInvitation({
        id: row.id,
        groupId: row.group_id,
        fromUserId: row.from_user_id,
        deliveryChannel: row.delivery_channel,
        deliveryTarget: row.delivery_target,
        toUserId: row.to_user_id,
        toUserName: row.to_username,
        toEmail: row.to_email ?? "",
        invitedName: row.invited_name ?? "",
        inviterName: row.inviter_name ?? "Invitación",
        inviterUserName: row.inviter_username,
        inviterEmail: row.inviter_email ?? "",
        status: row.status,
        createdAt: row.created_at,
        groupName: row.group_name,
      });
      setIsReady(true);
    };

    void loadInvitation();
  }, [invitationId]);

  const invitationLinkLabel = useMemo(() => {
    if (!inviteUrl) {
      return "Enlace de invitación";
    }

    return inviteUrl;
  }, [inviteUrl]);

  const signedInAccountLabel = useMemo(() => {
    if (!isAuthenticated || !user) {
      return null;
    }

    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const displayName = typeof metadata.full_name === "string" && metadata.full_name.trim() ? metadata.full_name.trim() : null;
    const username = typeof metadata.username === "string" && metadata.username.trim() ? `@${metadata.username.trim()}` : null;

    return displayName ?? username ?? user.email ?? "tu cuenta";
  }, [isAuthenticated, user]);

  const currentGroupMembership = useMemo(() => {
    if (!isAuthenticated || !user || !invitation) {
      return null;
    }

    return groupMembers.find((member) => member.groupId === invitation.groupId && member.userId === user.id) ?? null;
  }, [groupMembers, invitation, isAuthenticated, user]);

  const isAlreadyInGroup = Boolean(currentGroupMembership);

  const handleCopyInviteLink = async () => {
    if (!inviteUrl) {
      return;
    }

    await navigator.clipboard.writeText(inviteUrl);
  };

  const handleSwitchAccount = async () => {
    await signOut();
    router.replace(`/auth?next=/groups/invite/${invitationId}`);
  };

  const handleAccept = async () => {
    setIsAccepting(true);

    try {
      await acceptGroupInvitation(invitationId);
      router.push(`/groups/${invitation?.groupId ?? ""}`);
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "No se pudo aceptar la invitación.");
    } finally {
      setIsAccepting(false);
    }
  };

  if (!isReady) {
    return <AppLoadingScreen title="Cargando invitación" subtitle="Comprobando el acceso al grupo..." />;
  }

  return (
    <div className="min-h-screen bg-background md:pt-20">
      <main className="container mx-auto flex min-h-screen max-w-4xl items-center px-4 py-8 sm:px-6 md:min-h-0 md:py-8">
        <Card className="relative overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-primary/5 shadow-2xl shadow-primary/10">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />

          <CardHeader className="relative space-y-5 p-6 sm:p-8">
            <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-background/50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                <span>
                  {signedInAccountLabel ? (
                    <>
                      Has iniciado sesión con <span className="font-semibold text-foreground">{signedInAccountLabel}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-foreground">Debes iniciar sesión</span> o crear una cuenta para aceptar la invitación
                    </>
                  )}
                </span>
              </div>
              {signedInAccountLabel ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSwitchAccount}
                  className="h-8 rounded-full border-primary/25 bg-background/80 px-3 text-xs text-foreground shadow-sm transition-colors hover:border-primary/45 hover:bg-primary/10 hover:text-primary"
                >
                  ¿No eres tú?
                </Button>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm font-semibold text-primary">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
                  <Sparkles className="h-5 w-5" />
                </div>
                Invitación a grupo en PagaYa
              </div>
              <CardTitle className="text-3xl font-bold tracking-tight sm:text-4xl">
                Has sido invitado al grupo <span className="text-primary">{invitation?.groupName ?? "un grupo"}</span>
              </CardTitle>
              <CardDescription className="max-w-2xl text-base">
                Acepta la invitación y empieza a compartir gastos con el resto de miembros.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="relative space-y-5 px-6 pb-6 sm:px-8 sm:pb-8">
            {error ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invitado por</p>
                <p className="mt-1 text-lg font-bold">{invitation?.inviterName ?? "Desconocido"}</p>
                <p className="text-sm text-muted-foreground">{invitation?.inviterEmail ?? ""}</p>
            </div>

            {isAlreadyInGroup ? (
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Ya estás en este grupo</p>
                    <p className="mt-1 text-sm text-foreground/90">
                      Puedes entrar directamente a ver el grupo y seguir gestionando sus gastos.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              {isAlreadyInGroup ? (
                <Button asChild className="h-11 rounded-2xl px-5">
                  <a href={`/groups/${invitation?.groupId ?? ""}`}>
                    <Users className="h-4 w-4" />
                    Ir al grupo
                  </a>
                </Button>
              ) : (
                <Button onClick={handleAccept} disabled={!invitation || isAccepting || !isAuthenticated} className="h-11 rounded-2xl px-5">
                  {isAccepting ? <CheckCircle2 className="h-4 w-4 animate-pulse" /> : <Users className="h-4 w-4" />}
                  {isAuthenticated ? "Aceptar invitación" : "Inicia sesión o crea una cuenta para aceptar"}
                </Button>
              )}

              {!isAuthenticated && !isAlreadyInGroup ? (
                <Button asChild variant="outline" className="h-11 rounded-2xl px-5">
                  <a href={`/auth?next=/groups/invite/${invitationId}`}>Iniciar sesión o crear cuenta</a>
                </Button>
              ) : null}
            </div>

            <div className="rounded-3xl border border-dashed border-primary/20 bg-primary/5 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <LockKeyhole className="h-4 w-4 text-primary" />
                Acceso seguro
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Solo las personas con este enlace pueden ver la invitación y unirse al grupo.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}