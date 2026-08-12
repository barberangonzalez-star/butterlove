"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Search, X, UserRound, ExternalLink } from "lucide-react";
import {
  CARACAS_MUNICIPALITIES,
  CARACAS_ZONES,
  deliveryPriceForZone,
} from "@/lib/config";
import {
  customerLocation,
  formatPhone,
  matchesCustomer,
  type CustomerChoice,
} from "@/lib/customers";

const inputClass =
  "w-full rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#37352f]";
const labelClass = "text-xs font-medium text-[#787774] uppercase tracking-wide";

/** Una lista muy larga no ayuda a elegir: se muestran las primeras coincidencias. */
const MAX_RESULTS = 6;

/**
 * Elegir al cliente de una venta: o se busca en la libreta, o se escribe a
 * mano. Con uno elegido, la venta queda enganchada a su ficha (`customerId`) y
 * el nombre y el contacto se copian igual en la venta, que es lo que se lee
 * después en la tabla aunque la ficha cambie.
 *
 * Escribir a mano no es un caso perdido: al guardar, la venta busca si ese
 * teléfono o nombre ya tiene ficha y, si no, la crea. Así la libreta se llena
 * sola sin obligar a registrar al cliente antes de cobrarle.
 */
export default function CustomerPicker({
  customers,
  initialCustomerId,
  initialName,
  initialEmail,
  initialPhone,
  onPick,
}: {
  customers: CustomerChoice[];
  initialCustomerId: number | null;
  initialName: string;
  initialEmail: string;
  initialPhone: string;
  /** Avisa a la venta quién quedó elegido, para poder prellenar la entrega. */
  onPick: (customer: CustomerChoice | null) => void;
}) {
  const initial = customers.find((c) => c.id === initialCustomerId) ?? null;
  const [picked, setPicked] = useState<CustomerChoice | null>(initial);
  // La zona vive aquí y no sólo en la ficha porque la mayoría de los clientes
  // se conocen vendiéndoles: si no se pudiera anotar mientras se cobra, habría
  // que acordarse de entrar después a la ficha, y nunca pasa.
  const [zone, setZone] = useState(initial?.deliveryZone ?? "");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // El nombre escrito a mano se conserva al elegir una ficha y al soltarla: si
  // fue un error de clic, no hay que volver a escribirlo todo.
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);

  const results = query.trim()
    ? customers.filter((c) => matchesCustomer(c, query)).slice(0, MAX_RESULTS)
    : [];

  function pick(customer: CustomerChoice) {
    setPicked(customer);
    setZone(customer.deliveryZone ?? "");
    setQuery("");
    setOpen(false);
    onPick(customer);
  }

  function clear() {
    setPicked(null);
    // La zona se va con el cliente: dejarla puesta se la pegaría al siguiente.
    setZone("");
    onPick(null);
    // El foco vuelve al buscador: soltar al cliente es siempre para elegir otro.
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  if (picked) {
    // Con la zona del selector y no con la guardada: cambiarla se ve en el acto.
    const location = customerLocation({ ...picked, deliveryZone: zone });
    return (
      <div className="rounded-lg border border-black/10 bg-black/[0.02] p-3">
        <input type="hidden" name="customerId" value={picked.id} />
        <input type="hidden" name="customerName" value={picked.name} />
        <input type="hidden" name="customerEmail" value={picked.email ?? ""} />
        <input type="hidden" name="customerPhone" value={picked.phone ?? ""} />

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm flex items-center gap-1.5">
              <UserRound size={14} className="shrink-0 text-[#787774]" />
              <span className="truncate">{picked.name}</span>
            </p>
            <p className="text-xs text-[#787774] mt-0.5 break-words">
              {[formatPhone(picked.phone), picked.email, location]
                .filter(Boolean)
                .join(" · ") || "Sin datos de contacto"}
            </p>
          </div>
          <button
            type="button"
            onClick={clear}
            title="Elegir otro cliente"
            className="shrink-0 flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#5f5e5b] hover:bg-black/5"
          >
            <X size={13} /> Cambiar
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-[#5f5e5b]">
          <span>
            {picked.orders} compra{picked.orders === 1 ? "" : "s"} · $
            {picked.totalUsd.toFixed(2)}
          </span>
          {picked.favoriteProduct && <span>Favorito: {picked.favoriteProduct}</span>}
          <Link
            href={`/admin/clientes/${picked.id}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-[#37352f] underline underline-offset-2"
          >
            Ver historial <ExternalLink size={11} />
          </Link>
        </div>

        <ZoneField
          zone={zone}
          onChange={setZone}
          hint={
            picked.deliveryZone
              ? "Cambiarla actualiza su ficha."
              : "Todavía no tiene zona: la que elijas queda guardada en su ficha."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="customerId" value="" />

      <div
        className="relative"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setOpen(false);
          }
        }}
      >
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#787774] pointer-events-none"
        />
        <input
          ref={searchRef}
          type="text"
          value={query}
          placeholder="Buscar cliente por nombre, teléfono o zona…"
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          // Sin esto, Enter en el buscador enviaría la venta a medio llenar.
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (results[0]) pick(results[0]);
            }
            if (e.key === "Escape") setOpen(false);
          }}
          className={`${inputClass} pl-8`}
        />

        {open && query.trim() !== "" && (
          <div className="absolute z-20 mt-1 w-full rounded-md border border-black/10 bg-white shadow-lg overflow-hidden">
            {results.map((customer) => {
              const location = customerLocation(customer);
              return (
                <button
                  key={customer.id}
                  type="button"
                  // El clic no le quita el foco al buscador: si lo hiciera, el
                  // menú se cerraría antes de que llegue el `onClick`.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(customer)}
                  className="w-full text-left px-3 py-2 hover:bg-black/[0.04] border-b border-black/5 last:border-0"
                >
                  <p className="text-sm font-medium truncate">{customer.name}</p>
                  <p className="text-xs text-[#787774] truncate">
                    {[formatPhone(customer.phone), location]
                      .filter(Boolean)
                      .join(" · ") || "Sin contacto"}
                  </p>
                  <p className="text-[11px] text-[#5f5e5b] mt-0.5">
                    {customer.orders} compra{customer.orders === 1 ? "" : "s"} · $
                    {customer.totalUsd.toFixed(2)}
                    {customer.favoriteProduct ? ` · ${customer.favoriteProduct}` : ""}
                  </p>
                </button>
              );
            })}
            {results.length === 0 && (
              <p className="px-3 py-3 text-xs text-[#787774]">
                Ningún cliente coincide. Escribe los datos abajo y se guardará
                como cliente nuevo.
              </p>
            )}
          </div>
        )}
      </div>

      <label className="block">
        <span className={labelClass}>Nombre</span>
        <input
          name="customerName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${inputClass} mt-1`}
        />
      </label>

      <label className="block">
        <span className={labelClass}>Correo</span>
        <input
          type="email"
          name="customerEmail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${inputClass} mt-1`}
        />
      </label>

      <label className="block">
        <span className={labelClass}>Teléfono</span>
        <input
          type="tel"
          name="customerPhone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={`${inputClass} mt-1`}
        />
      </label>

      <ZoneField
        zone={zone}
        onChange={setZone}
        hint="Se guarda en la ficha del cliente."
      />
    </div>
  );
}

/**
 * En qué zona de Caracas queda el cliente. El nombre del campo es el mismo en
 * los dos modos del buscador, así que la venta lo lee igual venga de una ficha
 * ya elegida o de un cliente escrito a mano.
 */
function ZoneField({
  zone,
  onChange,
  hint,
}: {
  zone: string;
  onChange: (zone: string) => void;
  hint: string;
}) {
  return (
    <label className="block mt-2">
      <span className={labelClass}>Zona de Caracas</span>
      <select
        name="customerZone"
        value={zone}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} mt-1 bg-white`}
      >
        <option value="">—</option>
        {/* Una zona guardada que ya no esté en la lista se sigue ofreciendo,
            para no borrarla sin querer al registrar una venta. */}
        {zone && !CARACAS_ZONES.some((z) => z.name === zone) && (
          <option value={zone}>{zone}</option>
        )}
        {CARACAS_MUNICIPALITIES.map((municipality) => (
          <optgroup key={municipality} label={municipality}>
            {CARACAS_ZONES.filter((z) => z.municipality === municipality).map(
              (z) => {
                const price = deliveryPriceForZone(z.name);
                return (
                  <option key={z.name} value={z.name}>
                    {z.name}
                    {price !== null ? ` — delivery $${price}` : ""}
                  </option>
                );
              },
            )}
          </optgroup>
        ))}
      </select>
      <p className="text-xs text-[#787774] mt-1">{hint}</p>
    </label>
  );
}
