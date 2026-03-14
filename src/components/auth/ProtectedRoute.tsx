"use client"

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePagaYa } from '@/hooks/use-pagaya';
import { AppLoadingScreen } from '@/components/ui/app-loading-screen';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isReady, isConfigured, isAuthenticated, isLoadingAuth } = usePagaYa();

  useEffect(() => {
    if (!isReady || isLoadingAuth) {
      return;
    }

    if (!isConfigured) {
      router.replace('/auth');
      return;
    }

    if (!isAuthenticated) {
      router.replace(`/auth?next=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isConfigured, isLoadingAuth, isReady, pathname, router]);

  if (!isReady || isLoadingAuth) {
    return <AppLoadingScreen title="Comprobando sesion" subtitle="Validando acceso seguro..." />;
  }

  if (!isConfigured || !isAuthenticated) {
    return <AppLoadingScreen title="Acceso requerido" subtitle="Redirigiendo a la pantalla de autenticacion..." />;
  }

  return <>{children}</>;
}