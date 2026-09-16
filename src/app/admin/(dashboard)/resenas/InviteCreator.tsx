"use client";

import { useState, useTransition } from "react";
import { Check, Link2, MessageCircle, Plus, X } from "lucide-react";
import CopyButton from "./CopyButton";
import { createReviewInviteAction, type CreatedInvite } from "./actions";

const inputClass =
  "w-full rounded-md border border-black/15 bg-white px-2.5 py-2 text-sm outline-none focus:border-[#37352f]";
const labelClass = "block text-xs font-medium text-[#787774] mb-1";
const buttonClass =
  "h-9 inline-flex items-center justify-center gap-1.5 rounded-md border border-black/15 px-3 text-sm text-[#37352f] hover:bg-black/5 disabled:opacity-50";
const primaryClass =
  "h-9 inline-flex items-center justify-center gap-1.5 rounded-md bg-[#37352f] px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50";

/**
 * Crear un enlace para opinar a mano, para alguien que compró pero no está en
 * Ventas. Cerrado ocupa un renglón; abierto pide nombre y apellido, y el
 * teléfono y los productos son opcionales. Al crearlo muestra el enlace listo
 * para mandar.
 */
export default function InviteCreator({
  products,
}: {
  products: { id: number; title: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [productIds, setProductIds] = useState<Set<number>>(() => new Set());
  const [created, setCreated] = useState<CreatedInvite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setFirstName("");
    setLastName("");
    setPhone("");
    setProductIds(new Set());
    setCreated(null);
    setError(null);
  };

  const close = () => {
    reset();
    setOpen(false);
  };

  const toggleProduct = (id: number) =>
    setProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!firstName.trim()) {
      setError("Escribe el nombre de la persona.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await createReviewInviteAction({
          firstName,
          lastName,
          phone,
          productIds: [...productIds],
        });
        setCreated(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo crear el enlace.");
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 w-full flex items-center gap-3 rounded-lg border border-black/10 bg-white px-4 py-3 text-left hover:bg-black/[0.02]"
      >
        <span className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-[#37352f] text-white">
          <Link2 size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Crear enlace personalizado</span>
          <span className="block text-xs text-[#787774]">
            Para alguien que compró pero no está en Ventas.
          </span>
        </span>
        <Plus size={16} className="shrink-0 text-[#787774]" aria-hidden="true" />
      </button>
    );
  }

  if (created) {
    return (
      <div className="mb-4 rounded-lg border border-black/10 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Check size={15} className="text-green-700" aria-hidden="true" />
            Enlace listo para {created.customerName}
          </p>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar"
            className="w-8 h-8 -mt-1 -mr-1 shrink-0 flex items-center justify-center rounded-md text-[#5f5e5b] hover:bg-black/5"
          >
            <X size={16} />
          </button>
        </div>

        <input
          readOnly
          value={created.url}
          onFocus={(e) => e.target.select()}
          aria-label="Enlace personalizado"
          className={`${inputClass} mt-3 bg-black/[0.02] text-[#5f5e5b]`}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {created.whatsappHref && (
            <a
              href={created.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 inline-flex items-center gap-1.5 rounded-md bg-[#1f7a4d] px-3 text-sm font-medium text-white hover:opacity-90"
            >
              <MessageCircle size={15} aria-hidden="true" />
              Enviar por WhatsApp
            </a>
          )}
          <CopyButton text={created.message} label="Copiar mensaje" />
          <CopyButton text={created.url} label="Copiar enlace" />
          <button type="button" onClick={reset} className={`${buttonClass} sm:ml-auto`}>
            <Plus size={15} aria-hidden="true" /> Crear otro
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="mb-4 rounded-lg border border-black/10 bg-white p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Crear enlace personalizado</p>
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar"
          className="w-8 h-8 -mr-1 shrink-0 flex items-center justify-center rounded-md text-[#5f5e5b] hover:bg-black/5"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <label className="block min-w-0">
          <span className={labelClass}>Nombre</span>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="off"
            autoCapitalize="words"
            placeholder="María"
            className={inputClass}
          />
        </label>
        <label className="block min-w-0">
          <span className={labelClass}>Apellido</span>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="off"
            autoCapitalize="words"
            placeholder="González"
            className={inputClass}
          />
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>Teléfono (opcional)</span>
        <input
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="off"
          placeholder="0414-1234567"
          className={inputClass}
        />
        <span className="mt-1 block text-xs text-[#787774]">
          Con teléfono te queda el botón para mandarlo por WhatsApp.
        </span>
      </label>

      <div>
        <span className={labelClass}>Qué compró (opcional)</span>
        <div className="flex flex-wrap gap-1.5">
          {products.map((product) => {
            const on = productIds.has(product.id);
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => toggleProduct(product.id)}
                aria-pressed={on}
                className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  on
                    ? "border-[#37352f] bg-[#37352f] text-white"
                    : "border-black/15 text-[#5f5e5b] hover:bg-black/5"
                }`}
              >
                {product.title}
              </button>
            );
          })}
        </div>
        <span className="mt-1.5 block text-xs text-[#787774]">
          {productIds.size === 0
            ? "Si no eliges ninguno, la persona marca los que probó al abrir el enlace."
            : `Sólo podrá reseñar ${productIds.size === 1 ? "ese producto" : `esos ${productIds.size} productos`}.`}
        </span>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 sm:justify-end">
        <button type="button" onClick={close} className={`${buttonClass} flex-1 sm:flex-none`}>
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className={`${primaryClass} flex-1 sm:flex-none`}
        >
          {isPending ? "Creando…" : "Crear enlace"}
        </button>
      </div>
    </form>
  );
}
