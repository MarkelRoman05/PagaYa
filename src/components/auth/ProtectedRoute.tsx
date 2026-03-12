"use client"

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LoaderCircle, Lock } from 'lucide-react';
import { usePagaYa } from '@/hooks/use-pagaya';

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
          <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
          <p>Comprobando sesión...</p>
        </div>
      </div>
    );
  }

  if (!isConfigured || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
          <Lock className="w-8 h-8 text-primary" />
          <p>Redirigiendo al acceso seguro...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}