"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/admin-session";
import {
  createCustomer,
  deleteCustomer,
  updateCustomer,
  type CustomerInput,
} from "@/lib/customers-data";

const text = (formData: FormData, field: string) =>
  String(formData.get(field) ?? "").trim() || null;

function readInput(formData: FormData): CustomerInput {
  const name = text(formData, "name");
  if (!name) throw new Error("El cliente necesita un nombre.");

  return {
    name,
    phone: text(formData, "phone"),
    email: text(formData, "email"),
    instagram: text(formData, "instagram"),
    state: text(formData, "state"),
    city: text(formData, "city"),
    deliveryZone: text(formData, "deliveryZone"),
    address: text(formData, "address"),
    notes: text(formData, "notes"),
    // Un checkbox sin marcar no manda nada, así que su ausencia es un "no".
    isReseller: formData.get("isReseller") !== null,
  };
}

/** Lo que hay que refrescar cuando cambia una ficha: su página, la lista y el
 *  buscador del formulario de ventas. */
function revalidateCustomers() {
  revalidatePath("/admin/clientes", "layout");
  revalidatePath("/admin/ventas");
}

export async function saveCustomerAction(formData: FormData) {
  await verifySession();

  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : null;
  const input = readInput(formData);

  if (id) await updateCustomer(id, input);
  else await createCustomer(input);

  revalidateCustomers();
}

/**
 * Las ventas del cliente no se borran: quedan con su nombre y teléfono
 * anotados, sólo sin ficha a la que apuntar.
 */
export async function deleteCustomerAction(id: number) {
  await verifySession();
  await deleteCustomer(id);
  revalidateCustomers();
}

/** Igual que la anterior, pero desde la ficha: ya no hay página a la que volver. */
export async function deleteCustomerAndReturnAction(id: number) {
  await deleteCustomerAction(id);
  redirect("/admin/clientes");
}
