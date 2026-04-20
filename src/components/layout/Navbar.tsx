"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Wallet,
  Users,
  UsersRound,
  History,
  CircleUser,
  Bell,
  CheckCheck,
  Check,
  Trash2,
  Contact,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePagaYa } from "@/hooks/use-pagaya";
import { AppNotification } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";

function formatRelativeTime(dateIso: string) {
  const date = new Date(dateIso);
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const relativeFormat = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return relativeFormat.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (Math.abs(diffHours) < 24) {
    return relativeFormat.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return relativeFormat.format(diffDays, "day");
}

function formatDebtAmount(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getNotificationPresentation(notification: AppNotification) {
  if (notification.type !== "debt_created") {
    return {
      title: notification.title,
      message: notification.message,
    };
  }

  const metadata = notification.metadata as Record<string, unknown> | undefined;
  const creatorName = typeof metadata?.creator_name === "string" ? metadata.creator_name.trim() : "";
  const description = typeof metadata?.description === "string" ? metadata.description.trim() : "";
  const amountLabel = formatDebtAmount(metadata?.amount);

  if (!creatorName || !description || !amountLabel) {
    return {
      title: notification.title,
      message: notification.message,
    };
  }

  return {
    title: "Nueva deuda asignada",
    message: `${creatorName} ha registrado una deuda para ti de ${amountLabel}€ por "${description}".`,
  };
}

export function Navbar() {
  const pathname = usePathname();
  const { toast } = useToast();
  const {
    user,
    notifications,
    notificationPreferences,
    notificationChannelsEnabled,
    setNotificationRead,
    removeNotification,
  } = usePagaYa();
  const normalizePath = (value: string) => {
    if (!value) return '/';
    if (value === '/') return value;
    return value.replace(/\/+$/, '');
  };

  const currentPath = normalizePath(pathname);

  const isNavItemActive = (href: string) => {
    const normalizedHref = normalizePath(href);

    if (normalizedHref === '/') {
      return currentPath === '/';
    }

    return currentPath === normalizedHref || currentPath.startsWith(`${normalizedHref}/`);
  };

  const userMetadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const username =
    typeof userMetadata.username === "string"
      ? userMetadata.username.trim()
      : "";
  const avatarUrl =
    typeof userMetadata.avatar_url === "string"
      ? userMetadata.avatar_url.trim()
      : "";
  const displayName = username || user?.email?.split("@")[0] || "usuario";

  const navItems = [
    { name: "Deudas", href: "/debts", icon: Wallet },
    { name: "Grupos", href: "/groups", icon: UsersRound },
    { name: "Amigos", href: "/friends", icon: Contact },
    { name: "Historial", href: "/history", icon: History },
    { name: "Perfil", href: "/profile", icon: CircleUser },
  ];

  const visibleNotifications = useMemo(() => {
    // Este centro muestra notificaciones internas de la app.
    // Las push nativas de Android ya se envian en paralelo por FCM.
    if (!notificationChannelsEnabled.web) {
      return [];
    }

    return notifications.filter((notification) => notificationPreferences[notification.type]?.web ?? true);
  }, [notificationChannelsEnabled.web, notificationPreferences, notifications]);

  const unreadCount = visibleNotifications.filter((notification) => !notification.isRead).length;

  const handleToggleRead = async (notification: AppNotification) => {
    try {
      await setNotificationRead(notification.id, !notification.isRead);
    } catch (error) {
      toast({
        title: "No se pudo actualizar",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveNotification = async (notificationId: string) => {
    try {
      await removeNotification(notificationId);
    } catch (error) {
      toast({
        title: "No se pudo eliminar",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unreadIds = visibleNotifications
        .filter((notification) => !notification.isRead)
        .map((notification) => notification.id);

      await Promise.all(unreadIds.map((notificationId) => setNotificationRead(notificationId, true)));
    } catch (error) {
      toast({
        title: "No se pudo completar",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="h-16 md:hidden" />

      <header
        className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85"
        style={{ top: "var(--safe-area-top)" }}
      >
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-3 sm:px-4">
          <Link
            href="/debts"
            aria-label="Ir a deudas"
            className="flex items-center gap-2 font-bold text-primary text-xl"
          >
            <Image
              src="/images/PagaYa_logo.svg"
              alt="Logo de PagaYa"
              width={80}
              height={50}
              className="w-10 h-10"
              priority
            />
            <span className="text-[1.25rem] font-bold tracking-tight text-foreground">
              Paga<span className="text-primary">Ya</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isNavItemActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden md:block">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="relative rounded-full">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
                        {unreadCount}
                      </span>
                    ) : null}
                    <span className="sr-only">Abrir notificaciones</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[360px] p-0">
                  <NotificationPanel
                    notifications={visibleNotifications}
                    onToggleRead={handleToggleRead}
                    onRemove={handleRemoveNotification}
                    onMarkAllRead={handleMarkAllRead}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="relative rounded-full">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
                        {unreadCount}
                      </span>
                    ) : null}
                    <span className="sr-only">Abrir notificaciones</span>
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="flex h-[100dvh] w-full flex-col overflow-hidden sm:max-w-md"
                  style={{
                    paddingTop: "calc(var(--safe-area-top) + 1rem)",
                    paddingBottom: "calc(var(--safe-area-bottom) + 1rem)",
                  }}
                >
                  <SheetHeader className="shrink-0">
                    <SheetTitle>Notificaciones</SheetTitle>
                    <SheetDescription>
                      Actividad reciente de tu cuenta.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
                    <NotificationList
                      notifications={visibleNotifications}
                      onToggleRead={handleToggleRead}
                      onRemove={handleRemoveNotification}
                      onMarkAllRead={handleMarkAllRead}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium leading-none">@{displayName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Avatar className="w-8 h-8">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={`Avatar de ${displayName}`} />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary font-bold uppercase">
                  {displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 md:hidden"
        style={{ paddingBottom: "var(--safe-area-bottom)" }}
      >
        <div className="container mx-auto flex h-16 max-w-6xl items-stretch justify-between gap-1 px-2 sm:px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavItemActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors h-full border-t-2",
                  isActive
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-primary",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate leading-none">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

type NotificationActionProps = {
  notifications: AppNotification[];
  onToggleRead: (notification: AppNotification) => void | Promise<void>;
  onRemove: (notificationId: string) => void | Promise<void>;
  onMarkAllRead: () => void | Promise<void>;
};

function NotificationPanel({ notifications, onToggleRead, onRemove, onMarkAllRead }: NotificationActionProps) {
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <div className="overflow-hidden rounded-md">
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold leading-none">Notificaciones</p>
          <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
            {unreadCount} nuevas
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="min-w-0 text-xs leading-snug text-muted-foreground">
            Actividad reciente de tu cuenta
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary"
            onClick={onMarkAllRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas
          </Button>
        </div>
      </div>
      <div className="max-h-[320px] overflow-y-auto p-2">
        <NotificationList
          notifications={notifications}
          onToggleRead={onToggleRead}
          onRemove={onRemove}
          onMarkAllRead={onMarkAllRead}
        />
      </div>
    </div>
  );
}

function NotificationList({ notifications, onToggleRead, onRemove }: NotificationActionProps) {
  if (notifications.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/40 p-4 text-center">
        <p className="text-sm font-medium text-foreground">No tienes notificaciones</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Cuando haya actividad nueva, aparecerá aquí.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {notifications.map((item) => (
        (() => {
          const presentation = getNotificationPresentation(item);

          return (
        <li
          key={item.id}
          className={cn(
            "rounded-xl border bg-card p-3 transition-opacity",
            item.isRead ? "opacity-75" : "opacity-100",
          )}
        >
          <div className="mb-1 flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-sm leading-tight",
                item.isRead ? "font-medium" : "font-semibold",
              )}
            >
              {presentation.title}
            </p>
            <span className="shrink-0 pt-0.5 text-[11px] leading-none text-muted-foreground">{formatRelativeTime(item.createdAt)}</span>
          </div>
          <p className="text-xs leading-snug text-muted-foreground">{presentation.message}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs leading-none text-muted-foreground hover:bg-primary/10 hover:text-primary"
              onClick={() => onToggleRead(item)}
            >
              <Check className="h-3.5 w-3.5 shrink-0" />
              {item.isRead ? "Marcar no leída" : "Marcar leída"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs leading-none text-rose-700 dark:text-rose-400 hover:bg-rose-500/15 hover:text-rose-800 dark:hover:text-rose-300"
              onClick={() => onRemove(item.id)}
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              Eliminar
            </Button>
          </div>
        </li>
          );
        })()
      ))}
    </ul>
  );
}
