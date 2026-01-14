import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { AnalyticsProvider } from "@/lib/analytics";
import { SherpaWidget } from "@/components/shared/SherpaWidget";
import { NewVersionBanner } from "@/components/shared/NewVersionBanner";
import { DevModeIndicator } from "@/components/shared/DevModeIndicator";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EcoPlaza Dashboard - Gestión de Leads",
  description: "Dashboard de gestión de leads para EcoPlaza Proyecto Trapiche",
  // Bloquear indexación por motores de búsqueda - sistema privado
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        {/* Sherpa CSS - Centro de Ayuda */}
        <link rel="stylesheet" href="/sherpa/sherpa.min.css" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {/* Analytics - Se activa con NEXT_PUBLIC_ANALYTICS_ENABLED=true */}
          <AnalyticsProvider>
            {/* Version Banner - Shows when new deployment is available */}
            <NewVersionBanner />
            {/* Dev Mode Indicator - Only shows in development */}
            <DevModeIndicator />
            {children}
          </AnalyticsProvider>
        </AuthProvider>

        {/* Sherpa Widget - Centro de Ayuda */}
        <SherpaWidget />

        {/* Toast Notifications - sonner */}
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
        />
      </body>
    </html>
  );
}
