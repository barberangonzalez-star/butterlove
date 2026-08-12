"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import {
  saveSupplyItemAction,
  setSupplyQuantityAction,
  deleteSupplyItemAction,
} from "./actions";
import { fmtUnitCost, supplyUnitCost } from "@/lib/costs";
import type { SupplyItem } from "@/lib/inventory-data";

const inputClass =
  "w-full rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#37352f]";
const labelClass =
  "text-xs font-medium text-[#787774] uppercase tracking-wide";

function isLow(item: SupplyItem) {
  return item.lowStockThreshold !== null && item.quantity <= item.lowStockThreshold;
}

function QuantityCell({ item }: { item: SupplyItem }) {
  const [value, setValue] = useState(String(item.quantity));

  return (
    <input
      type="number"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const parsed = Number(value);
        if (parsed !== item.quantity) {
          setSupplyQuantityAction(item.id, parsed);
        }
      }}
      className={`w-16 md:w-24 rounded-md border px-2 py-2 md:py-1.5 text-sm text-right outline-none focus:border-[#37352f] ${
        isLow(item) ? "border-red-300 text-red-700 bg-red-50" : "border-black/15"
      }`}
    />
  );
}

/** El costo por unidad, con el precio de compra del que salió. */
function UnitCostCell({ item }: { item: SupplyItem }) {
  const unitCost = supplyUnitCost(item);
  if (unitCost === null) {
    return <span className="text-xs text-amber-700">Sin precio</span>;
  }
  return (
    <>
      <span className="tabular-nums">{fmtUnitCost(unitCost)}</span>
      <span className="block text-xs text-[#787774]">
        ${Number(item.purchasePriceUsd).toFixed(2)} / {item.purchaseQuantity}{" "}
        {item.unit}
      </span>
    </>
  );
}

function SupplyItemForm({
  item,
  onClose,
}: {
  item: SupplyItem | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <form
        action={async (formData) => {
          await saveSupplyItemAction(formData);
          onClose();
        }}
        className="relative w-full max-w-sm max-h-[90dvh] overflow-y-auto bg-white border border-black/10 rounded-lg p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">
            {item ? "Editar insumo" : "Nuevo insumo"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/5"
          >
            <X size={14} />
          </button>
        </div>

        {item && <input type="hidden" name="id" value={item.id} />}

        <label className="block mb-3">
          <span className={labelClass}>Nombre</span>
          <input
            name="name"
            defaultValue={item?.name}
            required
            placeholder="Etiquetas maní, Frascos vacíos 230g..."
            className={`${inputClass} mt-1`}
          />
        </label>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="block">
            <span className={labelClass}>Cantidad</span>
            <input
              type="number"
              name="quantity"
              defaultValue={item?.quantity ?? 0}
              required
              className={`${inputClass} mt-1`}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Unidad</span>
            <input
              name="unit"
              defaultValue={item?.unit ?? "unidades"}
              required
              className={`${inputClass} mt-1`}
            />
          </label>
        </div>

        {/* Se pregunta cómo se compra, no el costo por unidad: nadie sabe de
            memoria cuánto cuesta un gramo de maní, pero todo el mundo sabe qué
            pagó por el kilo. El costo unitario sale de la división. */}
        <div className="rounded-md border border-black/10 bg-black/[0.02] p-3 mb-3">
          <span className={labelClass}>Precio de compra (opcional)</span>
          <div className="grid grid-cols-2 gap-3 mt-1">
            <label className="block">
              <span className="text-xs text-[#787774]">Pagué ($)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                name="purchasePriceUsd"
                defaultValue={item?.purchasePriceUsd ?? ""}
                placeholder="12.00"
                className={`${inputClass} mt-0.5`}
              />
            </label>
            <label className="block">
              <span className="text-xs text-[#787774]">Por (cantidad)</span>
              <input
                type="number"
                step="1"
                min="0"
                name="purchaseQuantity"
                defaultValue={item?.purchaseQuantity ?? ""}
                placeholder="1000"
                className={`${inputClass} mt-0.5`}
              />
            </label>
          </div>
          <p className="text-xs text-[#787774] mt-2">
            Ej: $12 por 1000 g de maní, o $25 por 100 frascos. Sin esto, los
            productos que lo llevan quedan con el costo incompleto.
          </p>
        </div>

        <label className="block mb-3">
          <span className={labelClass}>Alerta de stock bajo (opcional)</span>
          <input
            type="number"
            name="lowStockThreshold"
            defaultValue={item?.lowStockThreshold ?? ""}
            placeholder="Ej. 20"
            className={`${inputClass} mt-1`}
          />
        </label>

        <label className="block mb-4">
          <span className={labelClass}>Notas (opcional)</span>
          <textarea
            name="notes"
            defaultValue={item?.notes ?? ""}
            rows={2}
            className={`${inputClass} resize-none mt-1`}
          />
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

export default function SupplyItemsClient({ items }: { items: SupplyItem[] }) {
  const [editing, setEditing] = useState<SupplyItem | "new" | null>(null);

  async function handleDelete(item: SupplyItem) {
    if (!confirm(`¿Eliminar "${item.name}"?`)) return;
    const result = await deleteSupplyItemAction(item.id);
    if (result.error) alert(result.error);
  }

  return (
    <div>
      <button
        onClick={() => setEditing("new")}
        className="mb-4 flex items-center gap-1.5 rounded-md bg-[#37352f] text-white text-sm font-medium px-3.5 py-2 hover:opacity-90 transition-opacity"
      >
        <Plus size={15} /> Nuevo insumo
      </button>

      <div className="border border-black/10 rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs text-[#787774] uppercase tracking-wide">
              <th className="px-3 md:px-4 py-2.5 font-medium">Insumo</th>
              <th className="px-3 md:px-4 py-2.5 font-medium text-right">Cantidad</th>
              <th className="px-4 py-2.5 font-medium hidden md:table-cell">Unidad</th>
              <th className="px-4 py-2.5 font-medium text-right hidden md:table-cell">
                Costo unitario
              </th>
              <th className="px-3 md:px-4 py-2.5 font-medium w-20"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02]">
                <td className="px-3 md:px-4 py-3">
                  <p className="font-medium">{item.name}</p>
                  {/* En móvil la columna Unidad se oculta y baja aquí. */}
                  <p className="text-xs text-[#787774] md:hidden">{item.unit}</p>
                  {item.notes && <p className="text-xs text-[#787774]">{item.notes}</p>}
                </td>
                <td className="px-3 md:px-4 py-3 text-right">
                  <QuantityCell item={item} />
                </td>
                <td className="px-4 py-3 text-[#787774] hidden md:table-cell">{item.unit}</td>
                <td className="px-4 py-3 text-right hidden md:table-cell">
                  <UnitCostCell item={item} />
                </td>
                <td className="px-3 md:px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => setEditing(item)}
                      className="w-9 h-9 md:w-7 md:h-7 flex items-center justify-center rounded-md hover:bg-black/5 text-[#5f5e5b]"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="w-9 h-9 md:w-7 md:h-7 flex items-center justify-center rounded-md hover:bg-black/5 text-[#5f5e5b]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[#787774]">
                  No hay insumos registrados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {editing && (
        <SupplyItemForm
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
