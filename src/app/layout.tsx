import type { Metadata } from "next";
import { Fredoka, DM_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import { SITE_URL } from "@/lib/config";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import FloatingNav from "@/components/FloatingNav";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dmsans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Butter Love | Mantequillas de maní y frutos secos 100% naturales",
  description:
    "Mantequillas artesanales de maní, pistacho, almendras y merey. 100% naturales, sin azúcar agregada, hechas a mano en Venezuela.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${fredoka.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink font-body">
        <CartProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <CartDrawer />
          <FloatingNav />
        </CartProvider>
      </body>
    </html>
  );
}
