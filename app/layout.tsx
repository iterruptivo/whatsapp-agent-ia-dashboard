import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { SherpaWidget } from "@/components/shared/SherpaWidget";
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
        <AuthProvider>{children}</AuthProvider>

        {/* Sherpa Widget - Centro de Ayuda */}
        <SherpaWidget />
      </body>
    </html>
  );
}
