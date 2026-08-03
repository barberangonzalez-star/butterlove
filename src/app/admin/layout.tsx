import type { Metadata, Viewport } from "next";
import ServiceWorkerRegistrar from "./_pwa/ServiceWorkerRegistrar";

// El panel se instala como PWA aparte de la tienda: manifiesto propio, con
// scope /admin para que el service worker no toque el sitio público.
export const metadata: Metadata = {
  title: "Butter Love Admin",
  manifest: "/admin.webmanifest",
  // Los iconos viven fuera de /admin a propósito: el proxy protege
  // /admin/:path* y iOS los pide sin sesión al agregar a la pantalla de inicio.
  icons: { apple: "/icons/admin-apple-touch.png" },
  appleWebApp: {
    capable: true,
    title: "BL Admin",
    statusBarStyle: "default",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f7f6f4",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <ServiceWorkerRegistrar />
    </>
  );
}
