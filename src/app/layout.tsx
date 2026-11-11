import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorker } from "@/components/service-worker";
import { SITE_URL } from "@/lib/env";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Korpsfix – bidragslister for skolekorps",
    template: "%s · Korpsfix",
  },
  description:
    "Hvem tar med hva? Lag en bidragsliste for dugnaden, del lenken i Spond, og se hva som mangler. Foreldre melder seg på uten konto.",
  applicationName: "Korpsfix",
  appleWebApp: {
    capable: true,
    title: "Korpsfix",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "nb_NO",
    siteName: "Korpsfix",
  },
};

export const viewport: Viewport = {
  themeColor: "#3b4fd8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nb" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster theme="light" position="top-center" richColors closeButton />
        <ServiceWorker />
      </body>
    </html>
  );
}
