"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { saveCustomerAction } from "./actions";
import {
  CARACAS_MUNICIPALITIES,
  CARACAS_MUNICIPALITY_STATE,
  CARACAS_ZONES,
  deliveryPriceForZone,
  VENEZUELA_STATES,
} from "@/lib/config";
import type { Customer } from "@/lib/customers-data";

const inputClass =
  "w-full rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#37352f]";
const labelClass = "text-xs font-medium text-[#787774] uppercase tracking-wide";

export default function CustomerForm({
  customer,
  onClose,
}: {
  customer: Customer | null;
  onClose: () => void;
}) {
  const [zone, setZone] = useState(customer?.deliveryZone ?? "");
  const [state, setState] = useState(customer?.state ?? "");
  const [city, setCity] = useState(customer?.city ?? "");

  /**
   * Una zona de Caracas ya dice en qué estado y ciudad queda, así que los
   * rellena si están vacíos. No pisa lo que ya esté escrito: si alguien anotó
   * otra ciudad a propósito, manda lo escrito a mano.
   */
  function pickZone(value: string) {
    setZone(value);
    const municipality = CARACAS_ZONES.find(
      (z) => z.name === value,
    )?.municipality;
    if (!municipality) return;
    if (!state) setState(CARACAS_MUNICIPALITY_STATE[municipality]);
    if (!city) setCity("Caracas");
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <form
        action={async (formData) => {
          await saveCustomerAction(formData);
          onClose();
        }}
        className="relative w-full max-w-md h-dvh bg-white border-l border-black/10 overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 h-16 border-b border-black/10 sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-sm">
            {customer ? "Editar cliente" : "Nuevo cliente"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/5"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {customer && <input type="hidden" name="id" value={customer.id} />}

          <label className="block">
            <span className={labelClass}>Nombre</span>
            <input
              name="name"
              defaultValue={customer?.name ?? ""}
              required
              autoFocus
              className={`${inputClass} mt-1`}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Teléfono</span>
            <input
              type="tel"
              name="phone"
              defaultValue={customer?.phone ?? ""}
              placeholder="0414-2856600"
              className={`${inputClass} mt-1`}
            />
            <p className="text-xs text-[#787774] mt-1">
              Es lo que reconoce al cliente al registrarle una venta.
            </p>
          </label>

          <label className="block">
            <span className={labelClass}>Correo</span>
            <input
              type="email"
              name="email"
              defaultValue={customer?.email ?? ""}
              className={`${inputClass} mt-1`}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Instagram</span>
            <input
              name="instagram"
              defaultValue={customer?.instagram ?? ""}
              placeholder="butterlove.ve"
              className={`${inputClass} mt-1`}
            />
          </label>

          <div className="pt-2 border-t border-black/5">
            <span className={labelClass}>Ubicación</span>
          </div>

          <label className="block">
            <span className={labelClass}>Zona de Caracas</span>
            <select
              name="deliveryZone"
              value={zone}
              onChange={(e) => pickZone(e.target.value)}
              className={`${inputClass} mt-1`}
            >
              <option value="">—</option>
              {/* Una zona guardada que ya no esté en la lista se sigue
                  ofreciendo, para no perderla al editar la ficha. */}
              {zone && !CARACAS_ZONES.some((z) => z.name === zone) && (
                <option value={zone}>{zone}</option>
              )}
              {CARACAS_MUNICIPALITIES.map((municipality) => (
                <optgroup key={municipality} label={municipality}>
                  {CARACAS_ZONES.filter(
                    (z) => z.municipality === municipality,
                  ).map((z) => {
                    const price = deliveryPriceForZone(z.name);
                    return (
                      <option key={z.name} value={z.name}>
                        {z.name}
                        {price !== null ? ` — delivery $${price}` : ""}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
            <p className="text-xs text-[#787774] mt-1">
              Sólo Caracas. Fuera de la ciudad basta con el estado y la ciudad.
            </p>
          </label>

          <label className="block">
            <span className={labelClass}>Estado</span>
            <select
              name="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className={`${inputClass} mt-1`}
            >
              <option value="">—</option>
              {VENEZUELA_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>Ciudad</span>
            <input
              name="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Dirección</span>
            <textarea
              name="address"
              rows={3}
              defaultValue={customer?.address ?? ""}
              placeholder="Calle, edificio, piso, punto de referencia…"
              className={`${inputClass} resize-none mt-1`}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Notas</span>
            <textarea
              name="notes"
              rows={2}
              defaultValue={customer?.notes ?? ""}
              placeholder="Alergias, preferencias, horarios de entrega…"
              className={`${inputClass} resize-none mt-1`}
            />
          </label>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-black/10 px-6 py-4">
          <button
            type="submit"
            className="w-full rounded-md bg-[#37352f] text-white text-sm font-medium py-2.5 hover:opacity-90 transition-opacity"
          >
            {customer ? "Guardar cambios" : "Crear cliente"}
          </button>
        </div>
      </form>
    </div>
  );
}
