"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import CustomerForm from "./CustomerForm";
import { deleteCustomerAndReturnAction } from "./actions";
import type { Customer } from "@/lib/customers-data";

/** Editar y eliminar desde la ficha del cliente. */
export default function CustomerActions({
  customer,
  orders,
}: {
  customer: Customer;
  orders: number;
}) {
  const [editing, setEditing] = useState(false);

  async function handleDelete() {
    const warning =
      orders > 0
        ? `¿Eliminar a ${customer.name}? Sus ${orders} venta${
            orders === 1 ? "" : "s"
          } no se borran, pero pierden la ficha y su historial.`
        : `¿Eliminar a ${customer.name}?`;
    if (!confirm(warning)) return;
    await deleteCustomerAndReturnAction(customer.id);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 rounded-md border border-black/15 bg-white px-3 py-2 text-sm font-medium hover:bg-black/5"
      >
        <Pencil size={14} /> Editar
      </button>
      <button
        onClick={handleDelete}
        title="Eliminar cliente"
        aria-label="Eliminar cliente"
        className="w-9 h-9 flex items-center justify-center rounded-md border border-black/15 bg-white text-[#5f5e5b] hover:bg-red-50 hover:text-red-700"
      >
        <Trash2 size={14} />
      </button>

      {editing && (
        <CustomerForm customer={customer} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}
