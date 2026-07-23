import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "DRONAR — Camper Aeronautical",
  description:
    "Plataforma de gestión de tripulaciones, cursos y misiones de Camper Aeronautical.",
};

import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${spaceGrotesk.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body className="min-h-screen bg-aero-950 font-sans text-mist antialiased">
        {children}
      </body>
    </html>
  );
}
