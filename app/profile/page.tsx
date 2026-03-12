"use client"

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { usePagaYa } from '@/hooks/use-pagaya';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { user, isReady, signOut, updateUserProfile, updatePassword } = usePagaYa();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const userMetadata = useMemo(() => (user?.user_metadata ?? {}) as Record<string, unknown>, [user]);

  useEffect(() => {
    const name = typeof userMetadata.full_name === 'string' ? userMetadata.full_name : '';
    const avatar = typeof userMetadata.avatar_url === 'string' ? userMetadata.avatar_url : '';

    setFullName(name);
    setAvatarUrl(avatar);
  }, [userMetadata]);

  const displayName = fullName.trim() || user?.email?.split('@')[0] || 'Usuario';
  const effectiveAvatarUrl = avatarPreviewUrl || avatarUrl;

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
        fullName,
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

  if (!isReady) {
    return null;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-20 md:pt-20">
        <Navbar />

        <main className="container mx-auto px-4 py-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Tu perfil</h1>
            <p className="text-muted-foreground">Actualiza tu nombre y avatar para personalizar la app.</p>
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
                  <p className="font-semibold text-lg">{displayName}</p>
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
                    <Label htmlFor="fullName">Nombre visible</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Indica un nombre para mostrar"
                      maxLength={80}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avatarFile">Foto de perfil</Label>
                    <Input
                      id="avatarFile"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      Sube una imagen (maximo 5MB). Si no subes ninguna, se mantiene la actual.
                    </p>
                  </div>

                  <Button type="submit" disabled={isSubmittingProfile} className="w-full md:w-auto">
                    {isSubmittingProfile ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </form>
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
                    {isSubmittingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="lg:col-start-2 border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-destructive">Cerrar sesión</CardTitle>
                <CardDescription>
                  Desconéctate de tu cuenta. Tendrás que volver a iniciar sesión para acceder.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleSignOut} 
                  disabled={isLoggingOut}
                  variant="destructive"
                  className="w-full md:w-auto"
                >
                  <LogOut className="w-4 h-4 mr-2" />
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
