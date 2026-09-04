import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenGravity — Motor de due diligence bayesiano | Demo interactiva",
  description:
    "P(Hit) calibrada para startups: prior bayesiano + señales agénticas + Monte Carlo. Simulador en vivo del motor V10.5.0 de AliceLabs. Casos reales: WeWork, Uber, Pets.com.",
  keywords: [
    "OpenGravity",
    "due diligence",
    "bayesiano",
    "Monte Carlo",
    "startups",
    "venture capital",
    "scoring",
    "AliceLabs",
  ],
  authors: [{ name: "AliceLabs LLC" }],
  openGraph: {
    title: "OpenGravity — Motor de due diligence bayesiano",
    description:
      "Simula P(Hit) de cualquier startup con el motor bayesiano + Monte Carlo de AliceLabs. Demo interactiva en vivo.",
    siteName: "OpenGravity Demo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenGravity — Motor de due diligence bayesiano",
    description: "Simula P(Hit) de cualquier startup. Demo interactiva del motor V10.5.0.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
