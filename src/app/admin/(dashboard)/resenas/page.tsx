import Link from "next/link";
import {
  countReviewsByStatus,
  getAdminReviews,
  getReviewRequestCandidates,
} from "@/lib/reviews-data";
import { reviewRequestLinks } from "@/lib/review-links";
import {
  REVIEWS_MIN_TO_SHOW,
  isReviewStatus,
  type ReviewStatus,
} from "@/lib/reviews";
import ReviewCard from "./ReviewCard";
import RequestList, { type RequestRow } from "./RequestList";

type Tab = ReviewStatus | "pedir";

const TABS: { value: Tab; label: string }[] = [
  { value: "pendiente", label: "Por aprobar" },
  { value: "publicada", label: "Publicadas" },
  { value: "oculta", label: "Ocultas" },
  { value: "pedir", label: "Pedir reseñas" },
];

const EMPTY: Record<ReviewStatus, string> = {
  pendiente:
    "No hay reseñas esperando. Cuando alguien opine te llega un aviso al teléfono.",
  publicada: "Todavía no hay reseñas publicadas.",
  oculta: "No hay reseñas ocultas.",
};

/**
 * Reseñas: aprobar lo que llega y pedirles a quienes compraron. Si no hay
 * nada por aprobar abre directo en "Pedir reseñas", que es lo que queda por
 * hacer.
 */
export default async function ResenasPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const counts = await countReviewsByStatus();
  const tab: Tab =
    tabParam === "pedir" || isReviewStatus(tabParam)
      ? tabParam
      : counts.pendiente > 0
        ? "pendiente"
        : "pedir";

  return (
    <div className="max-w-3xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold">Reseñas</h1>
        <p className="text-sm text-[#787774] mt-0.5">
          Lo que opinan quienes compraron. Nada sale en la tienda hasta que lo
          publiques, y un producto muestra estrellas desde {REVIEWS_MIN_TO_SHOW}{" "}
          reseñas publicadas.
        </p>
      </div>

      {/* En el teléfono las cuatro pestañas no caben: la fila se corre con el
          dedo en vez de partirse en dos renglones. */}
      <nav
        aria-label="Secciones de reseñas"
        className="-mx-4 px-4 lg:mx-0 lg:px-0 mb-4 flex gap-1.5 overflow-x-auto no-scrollbar"
      >
        {TABS.map(({ value, label }) => {
          const active = value === tab;
          const n = value === "pedir" ? 0 : counts[value];
          return (
            <Link
              key={value}
              href={`/admin/resenas?tab=${value}`}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 h-9 inline-flex items-center gap-1.5 rounded-full border px-3.5 text-sm whitespace-nowrap transition-colors ${
                active
                  ? "border-[#37352f] bg-[#37352f] text-white"
                  : "border-black/15 text-[#5f5e5b] hover:bg-black/5"
              }`}
            >
              {label}
              {n > 0 && (
                <span
                  className={`min-w-5 rounded-full px-1.5 text-center text-[11px] font-medium tabular-nums ${
                    value === "pendiente"
                      ? "bg-[#b4700a] text-white"
                      : active
                        ? "text-white/75"
                        : "text-[#787774]"
                  }`}
                >
                  {n}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {tab === "pedir" ? <RequestTab /> : <ReviewsTab status={tab} />}
    </div>
  );
}

async function RequestTab() {
  const candidates = await getReviewRequestCandidates();
  const rows: RequestRow[] = candidates.map((candidate) => {
    const links = reviewRequestLinks({
      id: candidate.saleId,
      customerName: candidate.customerName,
      customerPhone: candidate.customerPhone,
    });
    return {
      saleId: candidate.saleId,
      saleDate: candidate.saleDate,
      customerName: candidate.customerName,
      customerId: candidate.customerId,
      productNames: candidate.productNames,
      askedLabel: candidate.askedLabel,
      reviewCount: candidate.reviewCount,
      whatsappHref: links.whatsappHref,
      message: links.message,
    };
  });

  return (
    <>
      <p className="text-sm text-[#787774] mb-3">
        El botón abre WhatsApp con el mensaje y el enlace ya escritos: sólo
        tienes que enviarlo. Cada enlace es de esa compra, así que sólo opina
        quien compró.
      </p>
      <RequestList rows={rows} />
    </>
  );
}

async function ReviewsTab({ status }: { status: ReviewStatus }) {
  const reviews = await getAdminReviews(status);

  if (reviews.length === 0) {
    return (
      <div className="border border-black/10 rounded-lg bg-white px-4 py-10 text-center">
        <p className="text-sm text-[#787774]">{EMPTY[status]}</p>
        {status === "pendiente" && (
          <Link
            href="/admin/resenas?tab=pedir"
            className="mt-3 inline-flex h-9 items-center rounded-md bg-[#37352f] px-4 text-sm font-medium text-white hover:opacity-90"
          >
            Pedir reseñas
          </Link>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </ul>
  );
}
