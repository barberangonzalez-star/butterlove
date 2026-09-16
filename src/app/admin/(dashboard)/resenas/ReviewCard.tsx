"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Eye, EyeOff, Reply, Trash2 } from "lucide-react";
import StarRating from "@/components/StarRating";
import {
  deleteReviewAction,
  saveReviewReplyAction,
  setReviewStatusAction,
} from "./actions";
import { REVIEW_REPLY_MAX, type AdminReview, type ReviewStatus } from "@/lib/reviews";

const buttonClass =
  "h-9 inline-flex items-center justify-center gap-1.5 rounded-md border border-black/15 px-3 text-sm text-[#37352f] hover:bg-black/5 disabled:opacity-50";
const primaryClass =
  "h-9 inline-flex items-center justify-center gap-1.5 rounded-md bg-[#37352f] px-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50";

function fullDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Una reseña en el panel: qué dijo, de qué compra salió y qué hacer con ella.
 * Los botones cambian según el estado —una publicada no ofrece "Publicar"— y
 * borrar sólo se ofrece desde Ocultas, para que no quede a un toque de
 * "Ocultar" en una reseña que está en la tienda.
 */
export default function ReviewCard({ review }: { review: AdminReview }) {
  const [isPending, startTransition] = useTransition();
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState(review.reply ?? "");
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<void>, fallback: string, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        after?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : fallback);
      }
    });
  };

  const setStatus = (status: ReviewStatus) =>
    run(() => setReviewStatusAction(review.id, status), "No se pudo cambiar la reseña.");

  const saveReply = () =>
    run(
      () => saveReviewReplyAction(review.id, reply),
      "No se pudo guardar la respuesta.",
      () => setReplying(false),
    );

  const remove = () => {
    if (!confirm("¿Eliminar esta reseña? No se puede deshacer.")) return;
    run(() => deleteReviewAction(review.id), "No se pudo eliminar la reseña.");
  };

  return (
    <li className="border border-black/10 rounded-lg bg-white p-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <StarRating value={review.rating} size={15} />
        <span className="text-sm font-medium break-words">{review.authorName}</span>
        <span className="text-xs text-[#787774]">{review.createdLabel}</span>
      </div>

      <p className="mt-1 text-xs text-[#787774] break-words">
        {review.inStore ? (
          <Link
            href={`/productos/${review.productKey}`}
            target="_blank"
            className="hover:underline underline-offset-2"
          >
            {review.productTitle}
          </Link>
        ) : (
          review.productTitle
        )}
        {review.customerName && (
          <>
            {" · compró "}
            {review.customerId ? (
              <Link
                href={`/admin/clientes/${review.customerId}`}
                className="hover:underline underline-offset-2"
              >
                {review.customerName}
              </Link>
            ) : (
              review.customerName
            )}
            {review.saleDate ? ` el ${fullDate(review.saleDate)}` : ""}
          </>
        )}
        {!review.customerName && review.inviteName && (
          <> · enlace para {review.inviteName}</>
        )}
        {review.source === "general" && <> · enlace general</>}
      </p>

      {review.comment ? (
        <p className="mt-2 text-sm whitespace-pre-line break-words">{review.comment}</p>
      ) : (
        <p className="mt-2 text-sm italic text-[#787774]">Sin comentario, sólo estrellas.</p>
      )}

      {replying ? (
        <div className="mt-3">
          <label className="block">
            <span className="block text-xs font-medium text-[#787774] mb-1">
              Respuesta pública de Butter Love
            </span>
            <textarea
              rows={3}
              maxLength={REVIEW_REPLY_MAX}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="¡Gracias por tu reseña!"
              className="w-full rounded-md border border-black/15 bg-white px-2.5 py-2 text-sm outline-none focus:border-[#37352f]"
            />
          </label>
          <div className="mt-2 flex gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setReply(review.reply ?? "");
                setReplying(false);
              }}
              className={`${buttonClass} flex-1 sm:flex-none`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={saveReply}
              disabled={isPending}
              className={`${primaryClass} flex-1 sm:flex-none`}
            >
              {isPending ? "Guardando…" : "Guardar respuesta"}
            </button>
          </div>
        </div>
      ) : (
        review.reply && (
          <div className="mt-3 rounded-md bg-black/[0.03] px-3 py-2">
            <p className="text-xs font-medium text-[#787774]">Tu respuesta</p>
            <p className="text-sm whitespace-pre-line break-words">{review.reply}</p>
          </div>
        )
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {!replying && (
        <div className="mt-3 pt-3 border-t border-black/5 flex flex-wrap gap-2">
          {review.status !== "publicada" && (
            <button
              type="button"
              onClick={() => setStatus("publicada")}
              disabled={isPending}
              className={`${primaryClass} flex-1 sm:flex-none`}
            >
              <Eye size={14} aria-hidden="true" /> Publicar
            </button>
          )}
          {review.status !== "oculta" && (
            <button
              type="button"
              onClick={() => setStatus("oculta")}
              disabled={isPending}
              className={`${buttonClass} flex-1 sm:flex-none`}
            >
              <EyeOff size={14} aria-hidden="true" /> Ocultar
            </button>
          )}
          <button
            type="button"
            onClick={() => setReplying(true)}
            disabled={isPending}
            className={`${buttonClass} flex-1 sm:flex-none`}
          >
            <Reply size={14} aria-hidden="true" />
            {review.reply ? "Editar respuesta" : "Responder"}
          </button>
          {review.status === "oculta" && (
            <button
              type="button"
              onClick={remove}
              disabled={isPending}
              className={`${buttonClass} flex-1 sm:flex-none sm:ml-auto text-red-700 hover:bg-red-50`}
            >
              <Trash2 size={14} aria-hidden="true" /> Eliminar
            </button>
          )}
        </div>
      )}
    </li>
  );
}
