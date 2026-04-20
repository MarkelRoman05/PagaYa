"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { usePagaYa } from "@/hooks/use-pagaya";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import type { GroupInvitation } from "@/lib/types";
import { CheckCircle2, ChevronLeft, Mail, MessageCircleMore, Users } from "lucide-react";

type PublicGroupInvitation = GroupInvitation & {
  groupName: string;
};

export default function GroupInvitePage() {
  const params = useParams();
  const router = useRouter();
  const invitationId = params.invitationId as string;
  const { acceptGroupInvitation, user, isAuthenticated } = usePagaYa();
  const [isReady, setIsReady] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [invitation, setInvitation] = useState<PublicGroupInvitation | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        toEmail: row.to_email,
        invitedName: row.invited_name,
        inviterName: row.inviter_name,
        inviterUserName: row.inviter_username,
        inviterEmail: row.inviter_email,
        status: row.status,
        createdAt: row.created_at,
        groupName: row.group_name,
      });
      setIsReady(true);
    };

    void loadInvitation();
  }, [invitationId]);

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
    <div className="min-h-screen bg-background pb-24 md:pb-20 md:pt-20">
      <main className="container mx-auto max-w-3xl px-4 py-8">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
            <Link href="/groups" className="flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" />
              Volver a grupos
            </Link>
          </Button>

          <Card className="border-none shadow-lg shadow-primary/5">
            <CardHeader className="space-y-3">
              <Badge variant="secondary" className="w-fit rounded-full px-3 py-1 text-xs uppercase tracking-wide">
                Invitación pública
              </Badge>
              <CardTitle className="text-3xl font-bold tracking-tight">{invitation?.groupName ?? "Grupo compartido"}</CardTitle>
              <CardDescription>
                {invitation?.deliveryChannel === "whatsapp" ? "Te han invitado por WhatsApp." : "Te han invitado por email."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {error ? (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              {invitation ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 p-4">
                    <p className="text-sm text-muted-foreground">Invitó</p>
                    <p className="font-semibold">{invitation.inviterName}</p>
                    <p className="text-sm text-muted-foreground">{invitation.inviterEmail}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 p-4">
                    <p className="text-sm text-muted-foreground">Canal</p>
                    <p className="font-semibold capitalize">{invitation.deliveryChannel}</p>
                    <p className="text-sm text-muted-foreground break-all">{invitation.deliveryTarget}</p>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleAccept} disabled={!invitation || isAccepting || !isAuthenticated} className="rounded-xl">
                  {isAccepting ? <CheckCircle2 className="h-4 w-4 animate-pulse" /> : <Users className="h-4 w-4" />}
                  {isAuthenticated ? "Aceptar invitación" : "Inicia sesión para aceptar"}
                </Button>
                {!isAuthenticated ? (
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link href={`/auth?next=/groups/invite/${invitationId}`}>Ir a iniciar sesión</Link>
                  </Button>
                ) : null}
              </div>

              <div className="rounded-2xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                <div className="mb-2 flex items-center gap-2 text-foreground">
                  {invitation?.deliveryChannel === "whatsapp" ? <MessageCircleMore className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                  <span>Importe estimado del grupo</span>
                </div>
                <p>{invitation?.groupName ? "Repartir gastos y liquidarlos será más fácil desde esta pantalla." : ""}</p>
                {invitation ? <p className="mt-2 font-medium text-foreground">No hay saldo que mostrar todavía. {formatCurrency(0)}</p> : null}
              </div>
            </CardContent>
          </Card>
      </main>
    </div>
  );
}