import Image from "next/image";
import Link from "next/link";
import { WHATSAPP_LINK } from "@/lib/config";

/**
 * La página al mayor va fuera del grupo `(site)`, igual que la landing de
 * promoción: sin barra de tienda, sin carrito y sin chat.
 *
 * No es pudor de diseño. La barra lleva al catálogo con precios de detal y el
 * carrito cotiza al detal; un mayorista que entre por ahí termina viendo el
 * precio del que compra un frasco, que es justo lo que esta página no vende.
 * Lo único que se comparte es el WhatsApp, porque el pedido termina donde
 * siempre.
 */
export default function VentasAlMayorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex flex-col bg-page">
      <header className="border-b border-ink/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* El de la barra, no el del pie: el del pie es la versión clara,
              hecha para el panel oscuro, y sobre blanco no se ve. */}
          <Image
            src="/logo-navbar.png"
            alt="Butter Love"
            width={1808}
            height={500}
            className="h-8 sm:h-9 w-auto"
          />
          <span className="text-xs font-bold uppercase tracking-widest text-ink-soft">
            Venta al mayor
          </span>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-ink/10 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
          <p>Butter Love · Mantequillas 100% naturales</p>
          <Link
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-ink hover:underline"
          >
            Escríbenos por WhatsApp
          </Link>
        </div>
      </footer>
    </div>
  );
}
