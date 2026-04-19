"use client";

import {
  FormEvent,
  Suspense,
  useEffect,
  useRef,
  useState,
  type SVGProps,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LoaderCircle,
  LogIn,
  Mail,
  UserPlus,
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

const GoogleLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlnsXlink="http://www.w3.org/1999/xlink"
    xmlSpace="preserve"
    overflow="hidden"
    viewBox="0 0 268.152 273.883"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="google__a">
        <stop offset="0" stopColor="#0fbc5c" />
        <stop offset="1" stopColor="#0cba65" />
      </linearGradient>
      <linearGradient id="google__g">
        <stop offset=".231" stopColor="#0fbc5f" />
        <stop offset=".312" stopColor="#0fbc5f" />
        <stop offset=".366" stopColor="#0fbc5e" />
        <stop offset=".458" stopColor="#0fbc5d" />
        <stop offset=".54" stopColor="#12bc58" />
        <stop offset=".699" stopColor="#28bf3c" />
        <stop offset=".771" stopColor="#38c02b" />
        <stop offset=".861" stopColor="#52c218" />
        <stop offset=".915" stopColor="#67c30f" />
        <stop offset="1" stopColor="#86c504" />
      </linearGradient>
      <linearGradient id="google__h">
        <stop offset=".142" stopColor="#1abd4d" />
        <stop offset=".248" stopColor="#6ec30d" />
        <stop offset=".312" stopColor="#8ac502" />
        <stop offset=".366" stopColor="#a2c600" />
        <stop offset=".446" stopColor="#c8c903" />
        <stop offset=".54" stopColor="#ebcb03" />
        <stop offset=".616" stopColor="#f7cd07" />
        <stop offset=".699" stopColor="#fdcd04" />
        <stop offset=".771" stopColor="#fdce05" />
        <stop offset=".861" stopColor="#ffce0a" />
      </linearGradient>
      <linearGradient id="google__f">
        <stop offset=".316" stopColor="#ff4c3c" />
        <stop offset=".604" stopColor="#ff692c" />
        <stop offset=".727" stopColor="#ff7825" />
        <stop offset=".885" stopColor="#ff8d1b" />
        <stop offset="1" stopColor="#ff9f13" />
      </linearGradient>
      <linearGradient id="google__b">
        <stop offset=".231" stopColor="#ff4541" />
        <stop offset=".312" stopColor="#ff4540" />
        <stop offset=".458" stopColor="#ff4640" />
        <stop offset=".54" stopColor="#ff473f" />
        <stop offset=".699" stopColor="#ff5138" />
        <stop offset=".771" stopColor="#ff5b33" />
        <stop offset=".861" stopColor="#ff6c29" />
        <stop offset="1" stopColor="#ff8c18" />
      </linearGradient>
      <linearGradient id="google__d">
        <stop offset=".408" stopColor="#fb4e5a" />
        <stop offset="1" stopColor="#ff4540" />
      </linearGradient>
      <linearGradient id="google__c">
        <stop offset=".132" stopColor="#0cba65" />
        <stop offset=".21" stopColor="#0bb86d" />
        <stop offset=".297" stopColor="#09b479" />
        <stop offset=".396" stopColor="#08ad93" />
        <stop offset=".477" stopColor="#0aa6a9" />
        <stop offset=".568" stopColor="#0d9cc6" />
        <stop offset=".667" stopColor="#1893dd" />
        <stop offset=".769" stopColor="#258bf1" />
        <stop offset=".859" stopColor="#3086ff" />
      </linearGradient>
      <linearGradient id="google__e">
        <stop offset=".366" stopColor="#ff4e3a" />
        <stop offset=".458" stopColor="#ff8a1b" />
        <stop offset=".54" stopColor="#ffa312" />
        <stop offset=".616" stopColor="#ffb60c" />
        <stop offset=".771" stopColor="#ffcd0a" />
        <stop offset=".861" stopColor="#fecf0a" />
        <stop offset=".915" stopColor="#fecf08" />
        <stop offset="1" stopColor="#fdcd01" />
      </linearGradient>
      <linearGradient
        xlinkHref="#google__a"
        id="google__s"
        x1="219.7"
        x2="254.467"
        y1="329.535"
        y2="329.535"
        gradientUnits="userSpaceOnUse"
      />
      <radialGradient
        xlinkHref="#google__b"
        id="google__m"
        cx="109.627"
        cy="135.862"
        r="71.46"
        fx="109.627"
        fy="135.862"
        gradientTransform="matrix(-1.93688 1.043 1.45573 2.55542 290.525 -400.634)"
        gradientUnits="userSpaceOnUse"
      />
      <radialGradient
        xlinkHref="#google__c"
        id="google__n"
        cx="45.259"
        cy="279.274"
        r="71.46"
        fx="45.259"
        fy="279.274"
        gradientTransform="matrix(-3.5126 -4.45809 -1.69255 1.26062 870.8 191.554)"
        gradientUnits="userSpaceOnUse"
      />
      <radialGradient
        xlinkHref="#google__d"
        id="google__l"
        cx="304.017"
        cy="118.009"
        r="47.854"
        fx="304.017"
        fy="118.009"
        gradientTransform="matrix(2.06435 0 0 2.59204 -297.679 -151.747)"
        gradientUnits="userSpaceOnUse"
      />
      <radialGradient
        xlinkHref="#google__e"
        id="google__o"
        cx="181.001"
        cy="177.201"
        r="71.46"
        fx="181.001"
        fy="177.201"
        gradientTransform="matrix(-.24858 2.08314 2.96249 .33417 -255.146 -331.164)"
        gradientUnits="userSpaceOnUse"
      />
      <radialGradient
        xlinkHref="#google__f"
        id="google__p"
        cx="207.673"
        cy="108.097"
        r="41.102"
        fx="207.673"
        fy="108.097"
        gradientTransform="matrix(-1.2492 1.34326 -3.89684 -3.4257 880.501 194.905)"
        gradientUnits="userSpaceOnUse"
      />
      <radialGradient
        xlinkHref="#google__g"
        id="google__r"
        cx="109.627"
        cy="135.862"
        r="71.46"
        fx="109.627"
        fy="135.862"
        gradientTransform="matrix(-1.93688 -1.043 1.45573 -2.55542 290.525 838.683)"
        gradientUnits="userSpaceOnUse"
      />
      <radialGradient
        xlinkHref="#google__h"
        id="google__j"
        cx="154.87"
        cy="145.969"
        r="71.46"
        fx="154.87"
        fy="145.969"
        gradientTransform="matrix(-.0814 -1.93722 2.92674 -.11625 -215.135 632.86)"
        gradientUnits="userSpaceOnUse"
      />
      <filter
        id="google__q"
        width="1.097"
        height="1.116"
        x="-.048"
        y="-.058"
        colorInterpolationFilters="sRGB"
      >
        <feGaussianBlur stdDeviation="1.701" />
      </filter>
      <filter
        id="google__k"
        width="1.033"
        height="1.02"
        x="-.017"
        y="-.01"
        colorInterpolationFilters="sRGB"
      >
        <feGaussianBlur stdDeviation=".242" />
      </filter>
      <clipPath id="google__i" clipPathUnits="userSpaceOnUse">
        <path d="M371.378 193.24H237.083v53.438h77.167c-1.241 7.563-4.026 15.003-8.105 21.786-4.674 7.773-10.451 13.69-16.373 18.196-17.74 13.498-38.42 16.258-52.783 16.258-36.283 0-67.283-23.286-79.285-54.928-.484-1.149-.805-2.335-1.197-3.507a81.115 81.115 0 0 1-4.101-25.448c0-9.226 1.569-18.057 4.43-26.398 11.285-32.897 42.985-57.467 80.179-57.467 7.481 0 14.685.884 21.517 2.648a77.668 77.668 0 0 1 33.425 18.25l40.834-39.712c-24.839-22.616-57.219-36.32-95.844-36.32-30.878 0-59.386 9.553-82.748 25.7-18.945 13.093-34.483 30.625-44.97 50.985-9.753 18.879-15.094 39.8-15.094 62.294 0 22.495 5.35 43.633 15.103 62.337v.126c10.302 19.857 25.368 36.954 43.678 49.988 15.997 11.386 44.68 26.551 84.031 26.551 22.63 0 42.687-4.051 60.375-11.644 12.76-5.478 24.065-12.622 34.301-21.804 13.525-12.132 24.117-27.139 31.347-44.404 7.23-17.265 11.097-36.79 11.097-57.957 0-9.858-.998-19.87-2.689-28.968Z" />
      </clipPath>
    </defs>
    <g
      clipPath="url(#google__i)"
      transform="matrix(.95792 0 0 .98525 -90.174 -78.856)"
    >
      <path
        fill="url(#google__j)"
        d="M92.076 219.958c.148 22.14 6.501 44.983 16.117 63.424v.127c6.949 13.392 16.445 23.97 27.26 34.452l65.327-23.67c-12.36-6.235-14.246-10.055-23.105-17.026-9.054-9.066-15.802-19.473-20.004-31.677h-.17l.17-.127c-2.765-8.058-3.037-16.613-3.14-25.503Z"
        filter="url(#google__k)"
      />
      <path
        fill="url(#google__l)"
        d="M237.083 79.025c-6.456 22.526-3.988 44.421 0 57.161 7.457.006 14.64.888 21.45 2.647a77.662 77.662 0 0 1 33.424 18.25l41.88-40.726c-24.81-22.59-54.667-37.297-96.754-37.332Z"
        filter="url(#google__k)"
      />
      <path
        fill="url(#google__m)"
        d="M236.943 78.847c-31.67 0-60.91 9.798-84.871 26.359a145.533 145.533 0 0 0-24.332 21.15c-1.904 17.744 14.257 39.551 46.262 39.37 15.528-17.936 38.495-29.542 64.056-29.542l.07.002-1.044-57.335c-.048 0-.093-.004-.14-.004Z"
        filter="url(#google__k)"
      />
      <path
        fill="url(#google__n)"
        d="m341.475 226.379-28.268 19.285c-1.24 7.562-4.028 15.002-8.107 21.786-4.674 7.772-10.45 13.69-16.373 18.196-17.702 13.47-38.328 16.244-52.687 16.255-14.842 25.102-17.444 37.675 1.043 57.934 22.877-.016 43.157-4.117 61.046-11.796 12.931-5.551 24.388-12.792 34.761-22.097 13.706-12.295 24.442-27.503 31.769-45 7.327-17.497 11.245-37.282 11.245-58.734Z"
        filter="url(#google__k)"
      />
      <path
        fill="#3086ff"
        d="M234.996 191.21v57.498h136.006c1.196-7.874 5.152-18.064 5.152-26.5 0-9.858-.996-21.899-2.687-30.998Z"
        filter="url(#google__k)"
      />
      <path
        fill="url(#google__o)"
        d="M128.39 124.327c-8.394 9.119-15.564 19.326-21.249 30.364-9.753 18.879-15.094 41.83-15.094 64.324 0 .317.026.627.029.944 4.32 8.224 59.666 6.649 62.456 0-.004-.31-.039-.613-.039-.924 0-9.226 1.57-16.026 4.43-24.367 3.53-10.289 9.056-19.763 16.123-27.926 1.602-2.031 5.875-6.397 7.121-9.016.475-.997-.862-1.557-.937-1.908-.083-.393-1.876-.077-2.277-.37-1.275-.929-3.8-1.414-5.334-1.845-3.277-.921-8.708-2.953-11.725-5.06-9.536-6.658-24.417-14.612-33.505-24.216Z"
        filter="url(#google__k)"
      />
      <path
        fill="url(#google__p)"
        d="M162.099 155.857c22.112 13.301 28.471-6.714 43.173-12.977l-25.574-52.664a144.74 144.74 0 0 0-26.543 14.504c-12.316 8.512-23.192 18.9-32.176 30.72Z"
        filter="url(#google__q)"
      />
      <path
        fill="url(#google__r)"
        d="M171.099 290.222c-29.683 10.641-34.33 11.023-37.062 29.29a144.806 144.806 0 0 0 16.792 13.984c15.996 11.386 46.766 26.551 86.118 26.551.046 0 .09-.004.137-.004v-59.157l-.094.002c-14.736 0-26.512-3.843-38.585-10.527-2.977-1.648-8.378 2.777-11.123.799-3.786-2.729-12.9 2.35-16.183-.938Z"
        filter="url(#google__k)"
      />
      <path
        fill="url(#google__s)"
        d="M219.7 299.023v59.996c5.506.64 11.236 1.028 17.247 1.028 6.026 0 11.855-.307 17.52-.872v-59.748a105.119 105.119 0 0 1-17.477 1.461c-5.932 0-11.7-.686-17.29-1.865Z"
        filter="url(#google__k)"
        opacity=".5"
      />
    </g>
  </svg>
);

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
    if (typeof window === "undefined") {
      return;
    }

    const queryParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const authProvider = queryParams.get("authProvider");
    const hasOAuthPayload =
      authProvider === "google" ||
      Boolean(queryParams.get("code")) ||
      Boolean(hashParams.get("access_token"));

    if (!hasOAuthPayload) {
      return;
    }

    const capacitor = (
      window as Window & {
        Capacitor?: {
          isNativePlatform?: () => boolean;
          getPlatform?: () => string;
        };
      }
    ).Capacitor;

    const isNativeByProtocol =
      window.location.protocol === "capacitor:" ||
      window.location.protocol === "ionic:";
    const isNativeByApi =
      typeof capacitor?.isNativePlatform === "function"
        ? capacitor.isNativePlatform()
        : typeof capacitor?.getPlatform === "function"
          ? capacitor.getPlatform() !== "web"
          : false;

    if (isNativeByProtocol || isNativeByApi) {
      return;
    }

    const deepLinkTarget = `com.markel.pagaya://auth/callback${window.location.search}${window.location.hash}`;
    window.location.replace(deepLinkTarget);
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
    <div className="relative min-h-[100svh] overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.16),_transparent_42%),radial-gradient(circle_at_bottom_right,_hsl(var(--primary)/0.10),_transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)] [background-image:linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] [background-size:32px_32px]" />

      <main className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-md flex-col justify-center px-4 py-3 sm:px-6 sm:py-6">
        <section className="animate-in fade-in zoom-in-95 space-y-3 duration-500">
          <div className="flex items-center justify-between gap-3 rounded-3xl border border-primary/15 bg-card/80 px-4 py-3 shadow-lg shadow-primary/10 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
                <Image
                  src="/images/PagaYa_logo.svg"
                  alt="Logo de PagaYa"
                  width={28}
                  height={28}
                  className="h-9 w-9 object-contain"
                  priority
                />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  Tu espacio personal
                </p>
                <h1 className="text-[1.65rem] font-semibold leading-none tracking-tight font-headline">
                  Paga<span className="text-primary">Ya</span>
                </h1>
              </div>
            </div>

            <Link
              href="/"
              className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              Ir a inicio
            </Link>
          </div>

          <Card className="max-h-[calc(100svh-9.5rem)] overflow-y-auto rounded-3xl border-primary/15 bg-card/95 shadow-2xl shadow-primary/15 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">
                {isRecoveryMode ? "Recuperar contraseña" : "Acceso a tu cuenta"}
              </CardTitle>
              <CardDescription>
                {isRecoveryMode
                  ? "Estás en el proceso de recuperación. Define una nueva contraseña para volver a entrar en tu cuenta."
                  : "Inicia sesión o crea tu cuenta para gestionar tus deudas de forma rápida y segura."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-5">
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
                  <TabsList className="grid h-12 w-full grid-cols-2 rounded-2xl bg-muted/80 p-1">
                    <TabsTrigger
                      value="login"
                      className="rounded-xl text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      Login
                    </TabsTrigger>
                    <TabsTrigger
                      value="register"
                      className="rounded-xl text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      Registro
                    </TabsTrigger>
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
                        Acceder
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
                      className="w-full border-primary/20 hover:bg-primary/5"
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
                      className="w-full border-primary/20 hover:bg-primary/5"
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
