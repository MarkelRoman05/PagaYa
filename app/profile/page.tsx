"use client"

import { ChangeEvent, FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { usePagaYa } from '@/hooks/use-pagaya';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Clock3, Laptop, LogOut, Moon, RefreshCw, Smartphone, Sun, LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DeviceSession, NotificationType, Theme } from '@/lib/types';
import { AppLoadingScreen } from '@/components/ui/app-loading-screen';
import { getSupabaseBrowserClient } from '@/lib/supabase';

const NOTIFICATION_PREFERENCE_ITEMS: Array<{ type: NotificationType; label: string; description: string }> = [
  {
    type: 'invitation_received',
    label: 'Invitaciones recibidas',
    description: 'Cuando alguien te envía una invitación de amistad.',
  },
  {
    type: 'invitation_accepted',
    label: 'Invitaciones aceptadas',
    description: 'Cuando aceptan una invitación que tú enviaste.',
  },
  {
    type: 'invitation_rejected',
    label: 'Invitaciones rechazadas',
    description: 'Cuando rechazan una invitación que tú enviaste.',
  },
  {
    type: 'debt_created',
    label: 'Nueva deuda',
    description: 'Cuando se registra una deuda en la que participas.',
  },
  {
    type: 'debt_payment_requested',
    label: 'Solicitud de confirmación de pago',
    description: 'Cuando te piden confirmar el pago de una deuda.',
  },
  {
    type: 'debt_paid',
    label: 'Pago confirmado',
    description: 'Cuando una deuda queda marcada como pagada.',
  },
  {
    type: 'debt_payment_rejected',
    label: 'Solicitud de pago rechazada',
    description: 'Cuando se rechaza una solicitud para marcar una deuda como pagada.',
  },
];

const GOOGLE_LINK_TOAST_PENDING_KEY = 'pagaya.googleLinkToastPending';

function formatSessionDate(value: string | undefined) {
  if (!value) {
    return 'Sin datos';
  }

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function DeviceSessionIcon({ deviceSession }: { deviceSession: DeviceSession }) {
  const normalizedLabel = `${deviceSession.deviceLabel} ${deviceSession.os}`.toLowerCase();

  if (normalizedLabel.includes('movil') || normalizedLabel.includes('android') || normalizedLabel.includes('ios')) {
    return <Smartphone className="w-5 h-5 text-primary" />;
  }

  return <Laptop className="w-5 h-5 text-primary" />;
}

function GoogleLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6.1-2.8-6.1-6.2s2.7-6.2 6.1-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3 14.6 2 12 2 6.9 2 2.8 6.2 2.8 11.3S6.9 20.6 12 20.6c6.9 0 9.1-4.8 9.1-7.2 0-.5 0-.9-.1-1.3H12z" />
      <path fill="#34A853" d="M2.8 11.3c0 1.6.4 3.1 1.2 4.3l3.1-2.4c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9L4 7c-.8 1.2-1.2 2.7-1.2 4.3z" />
      <path fill="#FBBC05" d="M12 20.6c2.6 0 4.8-.8 6.4-2.2l-3-2.3c-.8.6-1.9 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1L3.2 15c1.6 3.2 5 5.6 8.8 5.6z" />
      <path fill="#4285F4" d="M21.1 12.1c0-.6-.1-1.1-.2-1.6H12v3.9h5.1c-.2 1.1-.9 2-1.7 2.7l3 2.3c1.8-1.7 2.7-4.1 2.7-7.3z" />
    </svg>
  );
}

function ProfilePageFallback() {
  return <AppLoadingScreen title="Cargando perfil" subtitle="Preparando tu panel y configuración..." />;
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfilePageFallback />}>
      <ProfilePageContent />
    </Suspense>
  );
}

function ProfilePageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasShownGoogleLinkedToastRef = useRef(false);
  const {
    user,
    isReady,
    signOut,
    connectGoogleIdentity,
    disconnectGoogleIdentity,
    updateUserProfile,
    updatePassword,
    theme,
    setTheme,
    deviceSessions,
    currentSessionId,
    refreshDeviceSessions,
    notificationPreferences,
    notificationChannelsEnabled,
    updateNotificationPreference,
    updateNotificationChannelEnabled,
  } = usePagaYa();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isSubmittingTheme, setIsSubmittingTheme] = useState(false);
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);
  const [isSubmittingGoogleIdentity, setIsSubmittingGoogleIdentity] = useState(false);
  const [identityProviders, setIdentityProviders] = useState<string[]>([]);
  const [updatingNotificationPreferenceKey, setUpdatingNotificationPreferenceKey] = useState<string | null>(null);

  const userMetadata = useMemo(() => (user?.user_metadata ?? {}) as Record<string, unknown>, [user]);

  useEffect(() => {
    const currentUsername = typeof userMetadata.username === 'string' ? userMetadata.username : '';
    const avatar = typeof userMetadata.avatar_url === 'string' ? userMetadata.avatar_url : '';

    setUsername(currentUsername);
    setAvatarUrl(avatar);
  }, [userMetadata]);

  const displayName = username.trim() || user?.email?.split('@')[0] || 'usuario';
  const effectiveAvatarUrl = avatarPreviewUrl || avatarUrl;
  const loadIdentityProviders = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !user) {
      setIdentityProviders([]);
      return;
    }

    const { data, error } = await supabase.auth.getUserIdentities();

    if (error) {
      // Fallback to local user identities if request fails.
      const fallbackProviders = Array.from(
        new Set(
          (user.identities ?? [])
            .map((identity) => identity.provider?.trim().toLowerCase())
            .filter((provider): provider is string => Boolean(provider)),
        ),
      );

      setIdentityProviders(fallbackProviders);
      return;
    }

    const providers = Array.from(
      new Set(
        (data.identities ?? [])
          .map((identity) => identity.provider?.trim().toLowerCase())
          .filter((provider): provider is string => Boolean(provider)),
      ),
    );

    setIdentityProviders(providers);
  }, [user]);

  useEffect(() => {
    void loadIdentityProviders();
  }, [loadIdentityProviders]);

  useEffect(() => {
    const googleStatus = searchParams.get('google');
    const hasPendingToast = typeof window !== 'undefined' && window.sessionStorage.getItem(GOOGLE_LINK_TOAST_PENDING_KEY) === '1';
    const isGoogleLinkedNow = identityProviders.includes('google');

    if (hasShownGoogleLinkedToastRef.current) {
      return;
    }

    const shouldShowToast = googleStatus === 'connected' || (hasPendingToast && isGoogleLinkedNow);

    if (!shouldShowToast) {
      return;
    }

    hasShownGoogleLinkedToastRef.current = true;
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(GOOGLE_LINK_TOAST_PENDING_KEY);
    }
    void loadIdentityProviders();

    toast({
      title: 'Google conectado',
      description: 'Ya puedes iniciar sesión también con Google.',
    });

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('google');
    const nextQuery = nextParams.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;

    if (googleStatus === 'connected') {
      router.replace(nextUrl);
    }
  }, [identityProviders, loadIdentityProviders, pathname, router, searchParams, toast]);

  const hasGoogleLinked = identityProviders.includes('google');
  const hasAlternativeProvider = identityProviders.some((provider) => provider !== 'google');
  const currentDeviceSession = useMemo(
    () => deviceSessions.find((deviceSession) => deviceSession.sessionId === currentSessionId) ?? null,
    [currentSessionId, deviceSessions]
  );
  const otherDeviceSessions = useMemo(
    () => deviceSessions.filter((deviceSession) => deviceSession.sessionId !== currentSessionId),
    [currentSessionId, deviceSessions]
  );

  useEffect(() => {
    if (!selectedAvatarFile) {
      setAvatarPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedAvatarFile);
    setAvatarPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedAvatarFile]);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedAvatarFile(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Archivo no valido',
        description: 'Selecciona una imagen (jpg, png, webp...).',
        variant: 'destructive',
      });
      event.currentTarget.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Imagen demasiado grande',
        description: 'El tamano maximo permitido es 5MB.',
        variant: 'destructive',
      });
      event.currentTarget.value = '';
      return;
    }

    setSelectedAvatarFile(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSubmittingProfile(true);

    try {
      await updateUserProfile({
        username,
        avatarFile: selectedAvatarFile,
      });

      toast({
        title: 'Perfil actualizado',
        description: 'Tus cambios se han guardado correctamente.',
      });
      setSelectedAvatarFile(null);
    } catch (error) {
      toast({
        title: 'No se pudo actualizar tu perfil',
        description: error instanceof Error ? error.message : 'Intentalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword.trim().length < 8) {
      toast({
        title: 'Contraseña demasiado corta',
        description: 'Debe tener al menos 8 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Las contraseñas no coinciden',
        description: 'Revisa ambos campos antes de guardar.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmittingPassword(true);

    try {
      await updatePassword(newPassword);

      setNewPassword('');
      setConfirmPassword('');

      toast({
        title: 'Contraseña actualizada',
        description: 'Tu nueva contraseña ya esta activa.',
      });
    } catch (error) {
      toast({
        title: 'No se pudo cambiar la contraseña',
        description: error instanceof Error ? error.message : 'Intentalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleThemeChange = async (newTheme: Theme) => {
    setIsSubmittingTheme(true);
    try {
      await setTheme(newTheme);
      toast({
        title: 'Apariencia actualizada',
        description: newTheme === 'dark' ? 'Modo oscuro activado.' : 'Modo claro activado.',
      });
    } catch (error) {
      toast({
        title: 'No se pudo guardar la apariencia',
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingTheme(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch (error) {
      toast({
        title: 'No se pudo cerrar sesión',
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
      setIsLoggingOut(false);
    }
  };

  const handleNotificationPreferenceChange = async (
    type: NotificationType,
    channel: 'web' | 'app',
    enabled: boolean,
  ) => {
    const key = `${type}:${channel}`;
    setUpdatingNotificationPreferenceKey(key);

    try {
      await updateNotificationPreference(type, channel, enabled);
    } catch (error) {
      toast({
        title: 'No se pudo guardar la preferencia',
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingNotificationPreferenceKey(null);
    }
  };

  const handleNotificationChannelEnabledChange = async (
    channel: 'web' | 'app',
    enabled: boolean,
  ) => {
    const key = `global:${channel}`;
    setUpdatingNotificationPreferenceKey(key);

    try {
      await updateNotificationChannelEnabled(channel, enabled);
    } catch (error) {
      toast({
        title: 'No se pudo guardar la configuración',
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingNotificationPreferenceKey(null);
    }
  };

  const handleRefreshDevices = async () => {
    setIsRefreshingDevices(true);

    try {
      await refreshDeviceSessions();
    } catch (error) {
      toast({
        title: 'No se pudo refrescar la lista',
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshingDevices(false);
    }
  };

  const handleConnectGoogle = async () => {
    setIsSubmittingGoogleIdentity(true);

    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(GOOGLE_LINK_TOAST_PENDING_KEY, '1');
      }

      await connectGoogleIdentity('/profile');
    } catch (error) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(GOOGLE_LINK_TOAST_PENDING_KEY);
      }

      toast({
        title: 'No se pudo conectar Google',
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
      setIsSubmittingGoogleIdentity(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    setIsSubmittingGoogleIdentity(true);

    try {
      await disconnectGoogleIdentity();
      await loadIdentityProviders();
      toast({
        title: 'Google desconectado',
        description: 'Ya no podrás iniciar sesión con Google en esta cuenta.',
      });
    } catch (error) {
      toast({
        title: 'No se pudo desconectar Google',
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingGoogleIdentity(false);
    }
  };

  if (!isReady) {
    return <AppLoadingScreen title="Cargando perfil" subtitle="Recuperando tu cuenta y dispositivos..." />;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-24 md:pb-20 md:pt-20">
        <Navbar />

        <main className="container mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Tu perfil</h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">Actualiza tu username y avatar para personalizar la app.</p>
          </header>

          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Vista previa</CardTitle>
                <CardDescription>Así se te verá en la app</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <Avatar className="w-24 h-24 border">
                  {effectiveAvatarUrl.trim() ? <AvatarImage src={effectiveAvatarUrl.trim()} alt={`Avatar de ${displayName}`} /> : null}
                  <AvatarFallback className="text-xl font-semibold uppercase">
                    {displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="font-semibold text-lg">@{displayName}</p>
                  <p className="text-sm text-muted-foreground break-all">{user?.email}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Editar perfil</CardTitle>
                <CardDescription>
                  Aquí puedes cambiar tus datos en la app de PagaYa.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user?.email ?? ''} disabled readOnly />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Nombre de usuario</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value.toLowerCase())}
                      placeholder="Introduce un username único"
                      maxLength={24}
                    />
                    <p className="text-xs text-muted-foreground">Debe ser único. Solo letras minúsculas, números y _. Entre 3 y 24 caracteres.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avatarFile">Foto de perfil</Label>
                    <Input
                      id="avatarFile"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="h-auto cursor-pointer py-2 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted/70"
                    />
                    <p className="text-xs text-muted-foreground">
                      Sube una imagen (máximo 5MB). Si no subes ninguna, se mantiene la actual.
                    </p>
                  </div>

                  <Button type="submit" disabled={isSubmittingProfile} className="w-full md:w-auto">
                    {isSubmittingProfile ? <LoaderCircle className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {isSubmittingProfile ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="lg:col-start-2">
              <CardHeader>
                <CardTitle>Apariencia</CardTitle>
                <CardDescription>
                  Elige entre modo claro u oscuro. Se guarda automáticamente en tu cuenta.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={theme === 'light' ? 'default' : 'outline'}
                    disabled={isSubmittingTheme}
                    onClick={() => handleThemeChange('light')}
                    className="flex items-center gap-2"
                  >
                    <Sun className="w-4 h-4" />
                    Claro
                  </Button>
                  <Button
                    type="button"
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    disabled={isSubmittingTheme}
                    onClick={() => handleThemeChange('dark')}
                    className="flex items-center gap-2"
                  >
                    <Moon className="w-4 h-4" />
                    Oscuro
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-start-2">
              <CardHeader>
                <CardTitle>Cuenta de Google</CardTitle>
                <CardDescription>
                  Gestiona si quieres usar tu cuenta de Google para iniciar sesión.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <GoogleLogo className="w-5 h-5" />
                    <div>
                      <p className="text-sm font-medium">Google</p>
                      <p className="text-xs text-muted-foreground">
                        {hasGoogleLinked ? 'Cuenta conectada' : 'Cuenta no conectada'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={hasGoogleLinked ? 'secondary' : 'outline'}>{hasGoogleLinked ? 'Conectado' : 'No conectado'}</Badge>
                </div>

                {hasGoogleLinked ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDisconnectGoogle}
                    disabled={isSubmittingGoogleIdentity || !hasAlternativeProvider}
                    className="w-full sm:w-auto"
                  >
                    {isSubmittingGoogleIdentity ? <LoaderCircle className="w-4 h-4 mr-2 animate-spin" /> : <GoogleLogo className="w-4 h-4 mr-2" />}
                    Desconectar cuenta de Google
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleConnectGoogle}
                    disabled={isSubmittingGoogleIdentity}
                    className="w-full sm:w-auto"
                  >
                    {isSubmittingGoogleIdentity ? <LoaderCircle className="w-4 h-4 mr-2 animate-spin" /> : <GoogleLogo className="w-4 h-4 mr-2" />}
                    Vincular cuenta de Google
                  </Button>
                )}

              </CardContent>
            </Card>

            <Card className="lg:col-start-2">
              <CardHeader>
                <CardTitle>Preferencias de notificaciones</CardTitle>
                <CardDescription>
                  Configura tanto las notificaciones del panel web como las push móviles.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  <div className="rounded-xl border bg-card/50 p-4">
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-foreground">Canales globales</p>
                      <p className="text-xs text-muted-foreground">
                        Puedes activar o desactivar por completo los canales web y push móvil.
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="flex items-center justify-between rounded-lg border bg-background/60 px-3 py-2.5">
                        <div>
                          <p className="text-sm font-medium">Web</p>
                          <p className="text-[11px] text-muted-foreground">Panel de notificaciones del navegador</p>
                        </div>
                        <Switch
                          checked={notificationChannelsEnabled.web}
                          onCheckedChange={(checked) => {
                            void handleNotificationChannelEnabledChange('web', checked);
                          }}
                          disabled={updatingNotificationPreferenceKey === 'global:web'}
                          aria-label="Activar notificaciones globales en web"
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-lg border bg-background/60 px-3 py-2.5">
                        <div>
                          <p className="text-sm font-medium">Push app</p>
                          <p className="text-[11px] text-muted-foreground">Notificaciones push en Android</p>
                        </div>
                        <Switch
                          checked={notificationChannelsEnabled.app}
                          onCheckedChange={(checked) => {
                            void handleNotificationChannelEnabledChange('app', checked);
                          }}
                          disabled={updatingNotificationPreferenceKey === 'global:app'}
                          aria-label="Activar notificaciones globales en app"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card/40">
                    <div className="grid grid-cols-[minmax(0,1fr)_64px_64px] items-center border-b px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <span>Tipo de evento</span>
                      <span className="text-center">Web</span>
                      <span className="text-center">Push</span>
                    </div>

                    <div className="divide-y">
                      {NOTIFICATION_PREFERENCE_ITEMS.map((item) => {
                        const currentValue = notificationPreferences[item.type];
                        const webKey = `${item.type}:web`;
                        const appKey = `${item.type}:app`;

                        return (
                          <div key={item.type} className="grid grid-cols-[minmax(0,1fr)_64px_64px] items-center gap-2 px-3 py-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">{item.label}</p>
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            </div>

                            <div className="flex items-center justify-center">
                              <Switch
                                checked={currentValue.web}
                                onCheckedChange={(checked) => {
                                  void handleNotificationPreferenceChange(item.type, 'web', checked);
                                }}
                                disabled={!notificationChannelsEnabled.web || updatingNotificationPreferenceKey === webKey}
                                aria-label={`Activar ${item.label} en web`}
                              />
                            </div>

                            <div className="flex items-center justify-center">
                              <Switch
                                checked={currentValue.app}
                                onCheckedChange={(checked) => {
                                  void handleNotificationPreferenceChange(item.type, 'app', checked);
                                }}
                                disabled={!notificationChannelsEnabled.app || updatingNotificationPreferenceKey === appKey}
                                aria-label={`Activar ${item.label} en app`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-start-2">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1.5">
                  <CardTitle>Dispositivos y sesiones</CardTitle>
                  <CardDescription>
                    Cada dispositivo mantiene su propia sesión. Cerrar sesión aquí no afecta a los demás.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRefreshDevices}
                  disabled={isRefreshingDevices}
                  className="md:self-start"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshingDevices ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentDeviceSession && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-sm">
                          <DeviceSessionIcon deviceSession={currentDeviceSession} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">Sesión actual</p>
                            <Badge variant="secondary">Este dispositivo</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {currentDeviceSession.deviceLabel}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Iniciada: {formatSessionDate(currentDeviceSession.signedInAt)}</p>
                        <p>Última actividad: {formatSessionDate(currentDeviceSession.lastSeenAt)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {otherDeviceSessions.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                    No hay otras sesiones activas en dispositivos distintos.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {otherDeviceSessions.map((deviceSession) => {
                      return (
                        <div
                          key={deviceSession.id}
                          className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                              <DeviceSessionIcon deviceSession={deviceSession} />
                            </div>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium">{deviceSession.deviceLabel}</p>
                                <Badge variant="outline">Activa</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {deviceSession.deviceLabel.includes('·')
                                  ? `${deviceSession.browser} · ${deviceSession.os}`
                                  : deviceSession.os}
                              </p>
                              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <Clock3 className="w-3.5 h-3.5" />
                                  Inicio: {formatSessionDate(deviceSession.signedInAt)}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  Última actividad: {formatSessionDate(deviceSession.lastSeenAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-start-2">
              <CardHeader>
                <CardTitle>Cambiar contraseña</CardTitle>
                <CardDescription>
                  Usa una contraseña segura de al menos 8 caracteres.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva contraseña</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                    />
                  </div>

                  <Button type="submit" disabled={isSubmittingPassword} className="w-full md:w-auto">
                    {isSubmittingPassword ? <LoaderCircle className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {isSubmittingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="lg:col-start-2 border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-destructive">Cerrar sesión</CardTitle>
                <CardDescription>
                  Solo se cerrará la sesión de este dispositivo. Las demás seguirán activas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleSignOut} 
                  disabled={isLoggingOut}
                  variant="destructive"
                  className="w-full md:w-auto"
                >
                  {isLoggingOut ? <LoaderCircle className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                  {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
