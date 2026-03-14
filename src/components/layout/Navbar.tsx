"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, History, CircleUser } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePagaYa } from "@/hooks/use-pagaya";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Navbar() {
  const pathname = usePathname();
  const { user } = usePagaYa();

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
    { name: "Inicio", href: "/dashboard", icon: Home },
    { name: "Amigos", href: "/friends", icon: Users },
    { name: "Historial", href: "/history", icon: History },
    { name: "Perfil", href: "/profile", icon: CircleUser },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 md:top-0 md:bottom-auto md:h-16 md:border-b md:border-t-0">
      <div className="container mx-auto flex h-full max-w-6xl items-center justify-between px-2 sm:px-4">
        <Link
          href="/dashboard"
          aria-label="Ir al inicio"
          className="hidden md:flex items-center gap-2 font-bold text-primary text-xl"
        >
          <Image
            src="/images/PagaYa_logo.svg"
            alt="Logo de PagaYa"
            width={80}
            height={50}
            className="w-11 h-11"
            priority
          />
          <span className="text-[1.4rem] font-bold tracking-tight text-foreground">
            Paga<span className="text-primary">Ya</span>
          </span>
        </Link>

        <div className="flex h-full w-full items-stretch justify-between gap-1 md:w-auto md:justify-around md:gap-6 lg:gap-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors h-full border-t-2 md:min-w-fit md:flex-none md:flex-row md:gap-2 md:px-3 md:text-sm md:border-t-0 md:border-b-2",
                  isActive
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-primary",
                )}
              >
                <Icon className="h-5 w-5 shrink-0 md:h-5 md:w-5" />
                <span className="truncate leading-none md:overflow-visible md:text-clip md:whitespace-nowrap">
                  {item.name}
                </span>
              </Link>
            );
          })}
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
    </nav>
  );
}
