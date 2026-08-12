"use client";

import { X } from "lucide-react";
import { saveCustomerAction } from "./actions";
import { DELIVERY_ZONES, VENEZUELA_STATES } from "@/lib/config";
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
            <span className={labelClass}>Estado</span>
            <select
              name="state"
              defaultValue={customer?.state ?? ""}
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
              defaultValue={customer?.city ?? ""}
              className={`${inputClass} mt-1`}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Zona de delivery</span>
            <select
              name="deliveryZone"
              defaultValue={customer?.deliveryZone ?? ""}
              className={`${inputClass} mt-1`}
            >
              <option value="">—</option>
              {/* Una zona guardada que después salió de la lista de precios se
                  sigue ofreciendo, para no perderla al editar la ficha. */}
              {customer?.deliveryZone &&
                !DELIVERY_ZONES.some((z) => z.name === customer.deliveryZone) && (
                  <option value={customer.deliveryZone}>
                    {customer.deliveryZone}
                  </option>
                )}
              {DELIVERY_ZONES.map((zone) => (
                <option key={zone.name} value={zone.name}>
                  {zone.name} — ${zone.price}
                </option>
              ))}
            </select>
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
