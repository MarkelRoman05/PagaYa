"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, PlusCircle, History, Wallet, CircleUser } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePagaYa } from '@/hooks/use-pagaya';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function Navbar() {
  const pathname = usePathname();
  const { user } = usePagaYa();

  const userMetadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = typeof userMetadata.full_name === 'string' ? userMetadata.full_name.trim() : '';
  const avatarUrl = typeof userMetadata.avatar_url === 'string' ? userMetadata.avatar_url.trim() : '';
  const displayName = fullName || user?.email?.split('@')[0] || 'U';

  const navItems = [
    { name: 'Inicio', href: '/dashboard', icon: Home },
    { name: 'Amigos', href: '/friends', icon: Users },
    { name: 'Nueva', href: '/debts/new', icon: PlusCircle },
    { name: 'Historial', href: '/history', icon: History },
    { name: 'Perfil', href: '/profile', icon: CircleUser },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border md:top-0 md:bottom-auto md:h-16 md:border-b md:border-t-0">
      <div className="container mx-auto h-full flex items-center justify-between px-4">
        <div className="hidden md:flex items-center gap-2 font-bold text-primary text-xl">
          <Wallet className="w-6 h-6" />
          <span>PagaYa</span>
        </div>
        
        <div className="flex w-full md:w-auto justify-around md:gap-8 h-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-3 py-2 text-xs md:text-sm font-medium transition-colors h-full border-t-2 md:border-t-0 md:border-b-2",
                  isActive 
                    ? "text-primary border-primary" 
                    : "text-muted-foreground border-transparent hover:text-primary"
                )}
              >
                <Icon className="w-6 h-6 md:w-5 md:h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

          <div className="hidden md:flex items-center gap-3">
            <Avatar className="w-8 h-8">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={`Avatar de ${displayName}`} /> : null}
              <AvatarFallback className="bg-primary/10 text-primary font-bold uppercase">
                {displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="text-right">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
        </div>
      </div>
    </nav>
  );
}