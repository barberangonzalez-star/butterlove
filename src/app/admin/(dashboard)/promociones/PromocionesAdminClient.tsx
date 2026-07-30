"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import {
  savePromotionAction,
  deletePromotionAction,
  togglePromotionAction,
} from "./actions";
import type { Promotion } from "@/lib/promotions-data";

const inputClass =
  "w-full rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#37352f]";
const labelClass =
  "text-xs font-medium text-[#787774] uppercase tracking-wide";

function PromotionForm({
  promotion,
  onClose,
}: {
  promotion: Promotion | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <form
        action={async (formData) => {
          await savePromotionAction(formData);
          onClose();
        }}
        className="relative w-full max-w-sm bg-white border border-black/10 rounded-lg p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">
            {promotion ? "Editar promoción" : "Nueva promoción"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/5"
          >
            <X size={14} />
          </button>
        </div>

        {promotion && <input type="hidden" name="id" value={promotion.id} />}

        <label className="block mb-3">
          <span className={labelClass}>Título</span>
          <input
            name="title"
            defaultValue={promotion?.title}
            required
            className={`${inputClass} mt-1`}
          />
        </label>

        <label className="block mb-3">
          <span className={labelClass}>Descripción</span>
          <textarea
            name="description"
            defaultValue={promotion?.description}
            required
            rows={3}
            className={`${inputClass} resize-none mt-1`}
          />
        </label>

        <label className="block mb-4">
          <span className={labelClass}>Cantidad del combo</span>
          <input
            type="number"
            name="bundleQuantity"
            min={1}
            defaultValue={promotion?.bundleQuantity ?? 1}
            required
            className={`${inputClass} mt-1`}
          />
          <p className="text-xs text-[#787774] mt-1">
            Envases que incluye este combo (ej. 2 para &quot;Combo 2 maní&quot;). Al elegir
            esta promo en Ventas, la cantidad se autocompleta con este número.
          </p>
        </label>

        <label className="flex items-center gap-2 mb-4 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={promotion?.active ?? true}
          />
          Activa
        </label>

        <button
          type="submit"
          className="w-full rounded-md bg-[#37352f] text-white text-sm font-medium py-2.5 hover:opacity-90 transition-opacity"
        >
          Guardar
        </button>
      </form>
    </div>
  );
}

export default function PromocionesAdminClient({
  promotions,
}: {
  promotions: Promotion[];
}) {
  const [editing, setEditing] = useState<Promotion | "new" | null>(null);

  async function handleDelete(promo: Promotion) {
    if (!confirm(`¿Eliminar "${promo.title}"?`)) return;
    await deletePromotionAction(promo.id);
  }

  return (
    <div>
      <button
        onClick={() => setEditing("new")}
        className="mb-4 flex items-center gap-1.5 rounded-md bg-[#37352f] text-white text-sm font-medium px-3.5 py-2 hover:opacity-90 transition-opacity"
      >
        <Plus size={15} /> Nueva promoción
      </button>

      <div className="border border-black/10 rounded-lg overflow-hidden bg-white divide-y divide-black/5">
        {promotions.map((p) => (
          <div key={p.id} className="flex items-start gap-3 px-4 py-3">
            <label className="flex items-center pt-0.5">
              <input
                type="checkbox"
                checked={p.active}
                onChange={(e) => togglePromotionAction(p.id, e.target.checked)}
              />
            </label>
            <div className="flex-1">
              <p className={`font-medium text-sm flex items-center gap-2 ${!p.active ? "text-[#a8a29e] line-through" : ""}`}>
                {p.title}
                {p.bundleQuantity > 1 && (
                  <span className="text-[11px] font-normal bg-black/5 text-[#5f5e5b] px-1.5 py-0.5 rounded-full">
                    ×{p.bundleQuantity}
                  </span>
                )}
              </p>
              <p className="text-sm text-[#787774]">{p.description}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditing(p)}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/5 text-[#5f5e5b]"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => handleDelete(p)}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/5 text-[#5f5e5b]"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {promotions.length === 0 && (
          <p className="px-4 py-10 text-center text-[#787774] text-sm">
            No hay promociones todavía.
          </p>
        )}
      </div>

      {editing && (
        <PromotionForm
          promotion={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
