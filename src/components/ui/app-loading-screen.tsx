import { LoaderCircle, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

type AppLoadingScreenProps = {
  title?: string;
  subtitle?: string;
  className?: string;
};

export function AppLoadingScreen({
  title = 'Preparando tu espacio',
  subtitle = 'Cargando la informacion necesaria...',
  className,
}: AppLoadingScreenProps) {
  return (
    <div className={cn('relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6', className)}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm rounded-3xl border border-border/70 bg-card/80 p-8 text-center shadow-2xl backdrop-blur-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Wallet className="h-8 w-8" />
        </div>

        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-primary">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          <span className="text-xs font-medium uppercase tracking-wider">Cargando</span>
        </div>
      </div>
    </div>
  );
}

type InlineLoadingNoticeProps = {
  message: string;
  className?: string;
};

export function InlineLoadingNotice({ message, className }: InlineLoadingNoticeProps) {
  return (
    <div className={cn('mb-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground', className)}>
      <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
      <span>{message}</span>
    </div>
  );
}
