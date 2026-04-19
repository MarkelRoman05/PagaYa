"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  LoaderCircle,
  LogIn,
  Mail,
  UserPlus,
  Wallet,
} from "lucide-react";
import { usePagaYa } from "@/hooks/use-pagaya";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { getSupabaseBrowserClient } from "@/lib/supabase";

const PASSWORD_RESET_COOLDOWN_SECONDS = 60;
const PASSWORD_RESET_COOLDOWN_STORAGE_KEY = "pagaya.passwordResetCooldownUntil";

function GoogleLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6.1-2.8-6.1-6.2s2.7-6.2 6.1-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3 14.6 2 12 2 6.9 2 2.8 6.2 2.8 11.3S6.9 20.6 12 20.6c6.9 0 9.1-4.8 9.1-7.2 0-.5 0-.9-.1-1.3H12z"
      />
      <path
        fill="#34A853"
        d="M2.8 11.3c0 1.6.4 3.1 1.2 4.3l3.1-2.4c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9L4 7c-.8 1.2-1.2 2.7-1.2 4.3z"
      />
      <path
        fill="#FBBC05"
        d="M12 20.6c2.6 0 4.8-.8 6.4-2.2l-3-2.3c-.8.6-1.9 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1L3.2 15c1.6 3.2 5 5.6 8.8 5.6z"
      />
      <path
        fill="#4285F4"
        d="M21.1 12.1c0-.6-.1-1.1-.2-1.6H12v3.9h5.1c-.2 1.1-.9 2-1.7 2.7l3 2.3c1.8-1.7 2.7-4.1 2.7-7.3z"
      />
    </svg>
  );
}

function AuthPageFallback() {
  return (
    <AppLoadingScreen
      title="Preparando acceso"
      subtitle="Conectando con tu cuenta segura..."
    />
  );
}
export default function AuthPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <AuthPageContent />
    </Suspense>
  );
}
function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const {
    isReady,
    isConfigured,
    isAuthenticated,
    isLoadingAuth,
    signIn,
    signInWithGoogle,
    signUp,
    requestPasswordReset,
    updatePassword,
    session,
  } = usePagaYa();
  const [loginValues, setLoginValues] = useState({ email: "", password: "" });
  const [registerValues, setRegisterValues] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState<
    "login" | "register" | "google" | null
  >(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [resetCooldownUntil, setResetCooldownUntil] = useState(0);
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPasswordValues, setNewPasswordValues] = useState({
    password: "",
    confirmPassword: "",
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const hasHandledGoogleNoAccountRef = useRef(false);
  const hasShownGoogleNoAccountToastRef = useRef(false);
  const hasShownGoogleAlreadyRegisteredToastRef = useRef(false);
  const hasShownGoogleNewRegisterToastRef = useRef(false);

  const initialTab =
    searchParams.get("tab") === "register" ? "register" : "login";
  const nextPath = searchParams.get("next") || "/debts";
  const resetCooldownSecondsRemaining = Math.max(
    0,
    Math.ceil((resetCooldownUntil - currentTimestamp) / 1000),
  );
  const isResetOnCooldown = resetCooldownSecondsRemaining > 0;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedValue = window.localStorage.getItem(
      PASSWORD_RESET_COOLDOWN_STORAGE_KEY,
    );

    if (!storedValue) {
      return;
    }

    const parsedValue = Number(storedValue);

    if (Number.isNaN(parsedValue) || parsedValue <= Date.now()) {
      window.localStorage.removeItem(PASSWORD_RESET_COOLDOWN_STORAGE_KEY);
      return;
    }

    setResetCooldownUntil(parsedValue);
  }, []);

  useEffect(() => {
    if (!isResetOnCooldown) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isResetOnCooldown]);

  useEffect(() => {
    const mode = searchParams.get("mode");
    const type = searchParams.get("type");
    const hashParams =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.hash.replace(/^#/, ""))
        : null;
    const hashType = hashParams?.get("type");

    setIsRecoveryMode(
      mode === "reset" || type === "recovery" || hashType === "recovery",
    );
  }, [searchParams]);

  useEffect(() => {
    if (!isReady || isLoadingAuth) {
      return;
    }

    if (isRecoveryMode) {
      return;
    }

    const isGoogleCallback = searchParams.get("authProvider") === "google";
    const googleAuthIntent = searchParams.get("authIntent");
    const hasPagaYaAccount =
      typeof session?.user?.user_metadata?.username === "string" &&
      session.user.user_metadata.username.trim().length > 0;

    if (
      isAuthenticated &&
      isGoogleCallback &&
      !hasPagaYaAccount &&
      googleAuthIntent !== "register" &&
      !hasHandledGoogleNoAccountRef.current
    ) {
      hasHandledGoogleNoAccountRef.current = true;

      const fallbackNextPath = nextPath || "/debts";
      const prefilledEmail = session?.user?.email?.trim() ?? "";

      const redirectToRegister = async () => {
        const supabase = getSupabaseBrowserClient();
        await supabase?.auth.signOut({ scope: "local" });

        const params = new URLSearchParams();
        params.set("tab", "register");
        params.set("reason", "google-no-account");
        params.set("next", fallbackNextPath);

        if (prefilledEmail) {
          params.set("email", prefilledEmail);
        }

        router.replace(`/auth?${params.toString()}`);
      };

      void redirectToRegister();
      return;
    }

    if (
      isAuthenticated &&
      isGoogleCallback &&
      !hasPagaYaAccount &&
      googleAuthIntent === "register" &&
      !hasShownGoogleNewRegisterToastRef.current
    ) {
      hasShownGoogleNewRegisterToastRef.current = true;

      toast({
        title: "Cuenta creada con Google",
        description: "Ya puedes entrar en PagaYa con tu cuenta de Google.",
      });

      router.replace(nextPath);
      return;
    }

    if (
      isAuthenticated &&
      isGoogleCallback &&
      hasPagaYaAccount &&
      googleAuthIntent === "register" &&
      !hasShownGoogleAlreadyRegisteredToastRef.current
    ) {
      hasShownGoogleAlreadyRegisteredToastRef.current = true;

      toast({
        title: "Ya estabas registrado en PagaYa",
        description: "Hemos iniciado sesión con tu cuenta existente.",
      });

      router.replace(nextPath);
      return;
    }

    if (isAuthenticated) {
      router.replace(nextPath);
    }
  }, [
    isAuthenticated,
    isLoadingAuth,
    isReady,
    isRecoveryMode,
    nextPath,
    router,
    searchParams,
    session?.user?.email,
    session?.user?.user_metadata?.username,
  ]);

  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason !== "google-no-account" || hasShownGoogleNoAccountToastRef.current) {
      return;
    }

    hasShownGoogleNoAccountToastRef.current = true;

    const prefilledEmail = searchParams.get("email")?.trim().toLowerCase() ?? "";

    if (prefilledEmail) {
      setRegisterValues((current) => ({ ...current, email: prefilledEmail }));
    }

    toast({
      title: "No tienes cuenta en PagaYa",
      description:
        "Regístrate para completar tu alta y después podrás iniciar sesión con Google.",
      variant: "destructive",
    });

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("reason");
    nextParams.delete("authProvider");
    nextParams.delete("authIntent");

    router.replace(`/auth?${nextParams.toString()}`);
  }, [router, searchParams, toast]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!loginValues.email.trim() || !loginValues.password) {
      toast({
        title: "Faltan credenciales",
        description: "Introduce tu email y contraseña.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting("login");

    try {
      await signIn({
        email: loginValues.email.trim().toLowerCase(),
        password: loginValues.password,
      });
      router.replace(nextPath);
    } catch (error) {
      toast({
        title: "No se pudo iniciar sesión",
        description:
          error instanceof Error ? error.message : "Revisa tus credenciales.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleOpenPasswordReset = () => {
    setResetEmail(loginValues.email.trim().toLowerCase());
    setIsResetDialogOpen(true);
  };

  const handlePasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isResetOnCooldown) {
      toast({
        title: "Espera un momento",
        description: `Podrás solicitar otro correo en ${resetCooldownSecondsRemaining}s.`,
        variant: "destructive",
      });
      return;
    }

    const email = resetEmail.trim().toLowerCase();

    if (!email) {
      toast({
        title: "Introduce tu email",
        description:
          "Necesitamos tu email para enviarte el enlace de recuperación.",
        variant: "destructive",
      });
      return;
    }

    setIsResetSubmitting(true);

    try {
      await requestPasswordReset(email);

      const nextCooldownUntil =
        Date.now() + PASSWORD_RESET_COOLDOWN_SECONDS * 1000;
      setCurrentTimestamp(Date.now());
      setResetCooldownUntil(nextCooldownUntil);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          PASSWORD_RESET_COOLDOWN_STORAGE_KEY,
          String(nextCooldownUntil),
        );
      }

      toast({
        title: "Correo enviado",
        description:
          "Te hemos enviado un enlace para restablecer tu contraseña.",
      });

      setLoginValues((current) => ({ ...current, email }));
      setIsResetDialogOpen(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Inténtalo de nuevo en unos minutos.";

      if (message.toLowerCase().includes("rate limit")) {
        const nextCooldownUntil =
          Date.now() + PASSWORD_RESET_COOLDOWN_SECONDS * 1000;
        setCurrentTimestamp(Date.now());
        setResetCooldownUntil(nextCooldownUntil);

        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            PASSWORD_RESET_COOLDOWN_STORAGE_KEY,
            String(nextCooldownUntil),
          );
        }
      }

      toast({
        title: "No se pudo enviar el correo",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const email = registerValues.email.trim().toLowerCase();
    const username = registerValues.username.trim().toLowerCase();

    if (
      !email ||
      !username ||
      !registerValues.password ||
      !registerValues.confirmPassword
    ) {
      toast({
        title: "Completa el formulario",
        description:
          "Necesitamos email, nombre de usuario y contraseña para crear tu cuenta.",
        variant: "destructive",
      });
      return;
    }

    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      toast({
        title: "Nombre de usuario no válido",
        description:
          "Usa entre 3 y 24 caracteres: letras, números o guion bajo (_).",
        variant: "destructive",
      });
      return;
    }

    if (registerValues.password.length < 6) {
      toast({
        title: "Contraseña demasiado corta",
        description: "Usa al menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (registerValues.password !== registerValues.confirmPassword) {
      toast({
        title: "Las contraseñas no coinciden",
        description: "Repite la misma contraseña en ambos campos.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting("register");
    setSuccessMessage("");

    try {
      await signUp({ email, username, password: registerValues.password });
      setRegisterValues({ email, username, password: "", confirmPassword: "" });

      if (!session) {
        setSuccessMessage(
          "Cuenta creada. Revisa tu correo para verificar tu cuenta.",
        );
      } else {
        router.replace(nextPath);
      }
    } catch (error) {
      toast({
        title: "No se pudo crear la cuenta",
        description:
          error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleGoogleAuth = async (authIntent: "login" | "register") => {
    setIsSubmitting("google");

    try {
      await signInWithGoogle(nextPath, authIntent);
    } catch (error) {
      toast({
        title: "No se pudo iniciar con Google",
        description:
          error instanceof Error
            ? error.message
            : "Inténtalo de nuevo en unos minutos.",
        variant: "destructive",
      });
      setIsSubmitting(null);
    }
  };

  const handleSetNewPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const password = newPasswordValues.password.trim();
    const confirmPassword = newPasswordValues.confirmPassword.trim();

    if (!password || !confirmPassword) {
      toast({
        title: "Completa los campos",
        description: "Introduce y confirma tu nueva contraseña.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Contraseña demasiado corta",
        description: "La nueva contraseña debe tener al menos 8 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Las contraseñas no coinciden",
        description:
          "Asegúrate de escribir la misma contraseña en ambos campos.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      await updatePassword(password);
      setNewPasswordValues({ password: "", confirmPassword: "" });
      setIsRecoveryMode(false);
      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña se ha cambiado correctamente.",
      });
      router.replace(nextPath);
    } catch (error) {
      toast({
        title: "No se pudo actualizar la contraseña",
        description:
          error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (!isReady || isLoadingAuth) {
    return <AuthPageFallback />;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto grid min-h-screen max-w-6xl gap-10 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="space-y-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-primary/10 text-primary items-center justify-center">
            <Wallet className="w-9 h-9" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight font-headline sm:text-5xl md:text-6xl">
              Paga<span className="text-primary">Ya</span>
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              Accede a tu espacio personal y guarda tus deudas con amigos y el
              historial desde cualquier dispositivo.
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            ¿Prefieres volver a la portada?{" "}
            <Link
              href="/"
              className="text-primary underline underline-offset-4"
            >
              Ir al inicio
            </Link>
          </p>
        </section>

        <section>
          <Card className="shadow-xl border-primary/10">
            <CardHeader>
              <CardTitle>Acceso a tu cuenta</CardTitle>
              <CardDescription>
                Usa una cuenta propia para que cada usuario tenga sus amigos y
                deudas aislados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isConfigured && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Falta configurar Supabase</AlertTitle>
                  <AlertDescription>
                    Define NEXT_PUBLIC_SUPABASE_URL y
                    NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno y ejecuta el
                    esquema SQL incluido en el proyecto.
                  </AlertDescription>
                </Alert>
              )}

              {successMessage && (
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertTitle>Registro completado</AlertTitle>
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}

              {isRecoveryMode ? (
                <div className="space-y-4">
                  <Alert>
                    <Mail className="h-4 w-4" />
                    <AlertTitle>Define tu nueva contraseña</AlertTitle>
                    <AlertDescription>
                      Por seguridad, crea una contraseña nueva para terminar la
                      recuperación de tu cuenta.
                    </AlertDescription>
                  </Alert>

                  <form onSubmit={handleSetNewPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">Nueva contraseña</Label>
                      <Input
                        id="new-password"
                        type="password"
                        autoComplete="new-password"
                        value={newPasswordValues.password}
                        onChange={(event) =>
                          setNewPasswordValues((current) => ({
                            ...current,
                            password: event.target.value,
                          }))
                        }
                        placeholder="Mínimo 8 caracteres"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password-confirm">
                        Repetir nueva contraseña
                      </Label>
                      <Input
                        id="new-password-confirm"
                        type="password"
                        autoComplete="new-password"
                        value={newPasswordValues.confirmPassword}
                        onChange={(event) =>
                          setNewPasswordValues((current) => ({
                            ...current,
                            confirmPassword: event.target.value,
                          }))
                        }
                        placeholder="Repite la nueva contraseña"
                      />
                    </div>
                    {!isAuthenticated && (
                      <p className="text-sm text-muted-foreground">
                        Abre este flujo desde el enlace del email de
                        recuperación para poder actualizar la contraseña.
                      </p>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={
                        !isConfigured || !isAuthenticated || isUpdatingPassword
                      }
                    >
                      {isUpdatingPassword ? (
                        <LoaderCircle className="w-4 h-4 animate-spin" />
                      ) : null}
                      Guardar nueva contraseña
                    </Button>
                  </form>

                  <Button
                    type="button"
                    variant="link"
                    className="h-auto px-0 text-sm"
                    onClick={() => setIsRecoveryMode(false)}
                  >
                    Volver al login
                  </Button>
                </div>
              ) : (
                <Tabs defaultValue={initialTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="register">Registro</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="space-y-4">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          autoComplete="email"
                          value={loginValues.email}
                          onChange={(event) =>
                            setLoginValues((current) => ({
                              ...current,
                              email: event.target.value,
                            }))
                          }
                          placeholder="Introduce tu email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Contraseña</Label>
                        <Input
                          id="login-password"
                          type="password"
                          autoComplete="current-password"
                          value={loginValues.password}
                          onChange={(event) =>
                            setLoginValues((current) => ({
                              ...current,
                              password: event.target.value,
                            }))
                          }
                          placeholder="Introduce tu contraseña"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto px-0 text-sm"
                          onClick={handleOpenPasswordReset}
                          disabled={
                            !isConfigured ||
                            isResetSubmitting ||
                            isResetOnCooldown
                          }
                        >
                          {isResetOnCooldown
                            ? `Reenviar en ${resetCooldownSecondsRemaining}s`
                            : "¿Olvidaste tu contraseña?"}
                        </Button>
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={!isConfigured || isSubmitting === "login"}
                      >
                        {isSubmitting === "login" ? (
                          <LoaderCircle className="w-4 h-4 animate-spin" />
                        ) : (
                          <LogIn className="w-4 h-4" />
                        )}
                        Entrar
                      </Button>
                    </form>

                    <Dialog
                      open={isResetDialogOpen}
                      onOpenChange={setIsResetDialogOpen}
                    >
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Restablecer contraseña</DialogTitle>
                          <DialogDescription>
                            Introduce el email de tu cuenta y te enviaremos un
                            enlace para restablecer tu contraseña.
                          </DialogDescription>
                        </DialogHeader>

                        <form
                          onSubmit={handlePasswordReset}
                          className="space-y-4"
                        >
                          <div className="space-y-2">
                            <Label htmlFor="reset-email">Email</Label>
                            <Input
                              id="reset-email"
                              type="email"
                              autoComplete="email"
                              autoFocus
                              value={resetEmail}
                              onChange={(event) =>
                                setResetEmail(event.target.value)
                              }
                              placeholder="tu@email.com"
                            />
                          </div>

                          <DialogFooter>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsResetDialogOpen(false)}
                              disabled={isResetSubmitting}
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="submit"
                              disabled={
                                !isConfigured ||
                                isResetSubmitting ||
                                isResetOnCooldown
                              }
                            >
                              {isResetSubmitting ? (
                                <LoaderCircle className="w-4 h-4 animate-spin" />
                              ) : null}
                              {isResetOnCooldown
                                ? `Espera ${resetCooldownSecondsRemaining}s`
                                : "Enviar enlace"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>

                    <div className="relative pt-1">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase tracking-wide">
                        <span className="bg-card px-2 text-muted-foreground">
                          o
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        void handleGoogleAuth("login");
                      }}
                      disabled={!isConfigured || isSubmitting !== null}
                    >
                      {isSubmitting === "google" ? (
                        <LoaderCircle className="w-4 h-4 animate-spin" />
                      ) : (
                        <GoogleLogo className="w-4 h-4" />
                      )}
                      Inicia sesión con Google
                    </Button>
                  </TabsContent>

                  <TabsContent value="register" className="space-y-4">
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-email">Email</Label>
                        <Input
                          id="register-email"
                          type="email"
                          autoComplete="email"
                          value={registerValues.email}
                          onChange={(event) =>
                            setRegisterValues((current) => ({
                              ...current,
                              email: event.target.value,
                            }))
                          }
                          placeholder="tu@email.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-username">
                          Nombre de usuario
                        </Label>
                        <Input
                          id="register-username"
                          type="text"
                          autoComplete="username"
                          value={registerValues.username}
                          onChange={(event) =>
                            setRegisterValues((current) => ({
                              ...current,
                              username: event.target.value,
                            }))
                          }
                          placeholder="Introduce un username"
                        />
                        <p className="text-xs text-muted-foreground">
                          Entre 3 y 20 caracteres. Puede contener letras,
                          números y guiones bajos.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-password">Contraseña</Label>
                        <Input
                          id="register-password"
                          type="password"
                          autoComplete="new-password"
                          value={registerValues.password}
                          onChange={(event) =>
                            setRegisterValues((current) => ({
                              ...current,
                              password: event.target.value,
                            }))
                          }
                          placeholder="Mínimo 6 caracteres"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-confirm">
                          Repetir contraseña
                        </Label>
                        <Input
                          id="register-confirm"
                          type="password"
                          autoComplete="new-password"
                          value={registerValues.confirmPassword}
                          onChange={(event) =>
                            setRegisterValues((current) => ({
                              ...current,
                              confirmPassword: event.target.value,
                            }))
                          }
                          placeholder="Repite tu contraseña"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={!isConfigured || isSubmitting === "register"}
                      >
                        {isSubmitting === "register" ? (
                          <LoaderCircle className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserPlus className="w-4 h-4" />
                        )}
                        Crear cuenta
                      </Button>
                    </form>

                    <div className="relative pt-1">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase tracking-wide">
                        <span className="bg-card px-2 text-muted-foreground">
                          o
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        void handleGoogleAuth("register");
                      }}
                      disabled={!isConfigured || isSubmitting !== null}
                    >
                      {isSubmitting === "google" ? (
                        <LoaderCircle className="w-4 h-4 animate-spin" />
                      ) : (
                        <GoogleLogo className="w-4 h-4" />
                      )}
                      Registrarme con Google
                    </Button>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
