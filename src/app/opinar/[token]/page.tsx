import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseReviewToken } from "@/lib/review-links";
import { getReviewTarget } from "@/lib/reviews-data";
import { publicAuthorName } from "@/lib/reviews";
import ReviewForm from "../ReviewForm";

export const metadata: Metadata = {
  title: "Cuéntanos qué te pareció",
};

/**
 * Donde aterriza el enlace personal que se manda por WhatsApp: el de una venta
 * o uno hecho a mano. Como es de una sola persona, llega sabiendo su nombre y
 * qué compró, y el comentario queda opcional: las estrellas ya valen, porque
 * detrás hay una compra registrada.
 */
export default async function OpinarConEnlacePage({
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
    <ReviewForm
      token={token}
      firstName={firstName}
      defaultAuthorName={publicAuthorName(target.customerName)}
      products={target.products}
      choose={target.choose}
    />
  );
}
