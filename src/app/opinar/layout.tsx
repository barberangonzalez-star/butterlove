import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  // Un formulario no tiene nada que indexar, y los enlaces personales son de
  // una sola persona: un rastreador que encuentre uno compartido no tiene por
  // qué seguirlo. Las páginas de acá heredan esto y sólo declaran su título.
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

/**
 * Donde aterrizan los enlaces para opinar, el general y los personales.
 *
 * Va fuera del layout de la tienda a propósito: sin menú, carrito ni chat,
 * porque quien llega acá viene a una sola cosa y cualquier otro botón es una
 * forma de no terminarla. El logo sí lleva a la tienda, para quien no sepa
 * dónde cayó.
 */
export default function OpinarLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 bg-page">
      <header className="border-b border-ink/10">
        <div className="mx-auto max-w-xl px-5 h-16 flex items-center justify-center">
          <Link href="/" aria-label="Ir a la tienda Butter Love">
            <Image
              src="/logo-navbar.png"
              alt="Butter Love"
              width={1808}
              height={500}
              priority
              className="h-9 w-auto"
            />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-5 pt-8 pb-16">{children}</div>
    </main>
  );
}
