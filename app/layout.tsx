import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { PagaYaProvider } from "@/hooks/use-pagaya";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.pagaya.app";
const metadataBase = new URL(siteUrl);
const siteName = "PagaYa";
const siteDescription =
  "PagaYa es la app para gestionar deudas, saldos y pagos con amigos desde la web y desde su app de Android.";

const applicationSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: siteName,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web, Android",
  description: siteDescription,
  url: siteUrl,
  inLanguage: "es-ES",
  image: `${siteUrl}/images/PagaYa_Horizontal_Full.png`,
  author: {
    "@type": "Organization",
    name: siteName,
    url: siteUrl,
  },
};

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "PagaYa",
    template: "%s | PagaYa",
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    "PagaYa",
    "PagaYa app",
    "deudas con amigos",
    "gestionar deudas",
    "control de gastos",
    "cuentas con amigos",
    "app de finanzas personales",
    "Android",
    "web app",
  ],
  authors: [{ name: "Markel Roman" }],
  creator: "Markel Roman",
  publisher: siteName,
  category: "finance",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName,
    title: siteName,
    description: siteDescription,
    locale: "es_ES",
    images: [
      {
        url: "/images/PagaYa_Horizontal_Full.png",
        width: 1200,
        height: 630,
        alt: "PagaYa - Gestiona tus deudas con amigos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
    images: ["/images/PagaYa_Horizontal_Full.png"],
  },
  icons: {
    icon: [
      { url: "/images/PagaYa_logo.svg", type: "image/svg+xml" },
      { url: "/images/PagaYa_Horizontal_Full.png", type: "image/png" },
    ],
    apple: "/images/PagaYa_Horizontal_Full.png",
    shortcut: "/images/PagaYa_logo.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="canonical" href={siteUrl} />
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "w0ur1aso7r");`}
        </Script>
        <Script id="pagaya-schema" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify(applicationSchema)}
        </Script>
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <PagaYaProvider>
          {children}
          <Toaster />
        </PagaYaProvider>
      </body>
    </html>
  );
}
