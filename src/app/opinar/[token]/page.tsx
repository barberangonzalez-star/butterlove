import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { parseReviewToken } from "@/lib/review-links";
import { getReviewTarget } from "@/lib/reviews-data";
import { publicAuthorName } from "@/lib/reviews";
import ReviewForm from "./ReviewForm";

export const metadata: Metadata = {
  title: "Cuéntanos qué te pareció",
  // Cada enlace es de una sola persona: no hay nada que indexar, y un
  // rastreador que lo encuentre compartido no tiene por qué seguirlo.
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

/**
 * Donde aterriza el enlace que se manda por WhatsApp. Va fuera del layout de
 * la tienda a propósito: sin menú, carrito ni chat, porque quien llega acá
 * viene a una sola cosa y cualquier otro botón es una forma de no terminarla.
 */
export default async function OpinarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ref = parseReviewToken(token);
  if (!ref) notFound();

  const target = await getReviewTarget(ref);
  if (!target) notFound();

  const firstName = target.customerName?.trim().split(/\s+/)[0] || null;

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

      <div className="mx-auto max-w-xl px-5 pt-8 pb-16">
        <ReviewForm
          token={token}
          firstName={firstName}
          defaultAuthorName={publicAuthorName(target.customerName)}
          products={target.products}
          choose={target.choose}
        />
      </div>
    </main>
  );
}
