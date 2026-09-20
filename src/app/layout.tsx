import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VendyTrack - PWA Móvil para Vending Institucional",
  description:
    "Gestión de rutas, liquidación reactiva de contadores e inventario para máquinas de café vending en Vercel.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VendyTrack",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#5c3d2e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} min-h-full bg-stone-100 dark:bg-stone-950 antialiased`}>
        <div className="min-h-screen flex flex-col justify-between">
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
