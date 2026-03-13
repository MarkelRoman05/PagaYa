import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { PagaYaProvider } from '@/hooks/use-pagaya';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'PagaYa - Gestiona tus deudas con amigos',
  description: 'La forma más fácil y rápida de llevar las cuentas con tus amigos.',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <body className="font-body antialiased bg-background text-foreground">
        <PagaYaProvider>
          {children}
          <Toaster />
        </PagaYaProvider>
      </body>
    </html>
  );
}
