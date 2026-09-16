import type { Metadata } from "next";
import { getReviewTarget } from "@/lib/reviews-data";
import ReviewForm from "./ReviewForm";

export const metadata: Metadata = {
  title: "Cuéntanos qué te pareció",
};

/**
 * El enlace general: uno solo, sin firma, para mandarle a quien sea —la
 * historia de Instagram, un grupo, el sticker de la caja—.
 *
 * Como no sabe quién llega, pide las tres cosas: el primer nombre, las
 * estrellas y el comentario. Y sus reseñas no salen como compra verificada,
 * porque nada acá dice que quien opinó compró.
 *
 * Es estática y se rearma cuando cambia el catálogo, igual que la tienda: lo
 * único que consulta es qué productos están en la vitrina.
 */
export default async function OpinarPage() {
  const target = await getReviewTarget({ kind: "general" });

  return (
    <ReviewForm
      token={null}
      firstName={null}
      defaultAuthorName=""
      products={target?.products ?? []}
      choose
    />
  );
}
