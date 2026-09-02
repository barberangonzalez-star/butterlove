"use client";

import { useTransition } from "react";
import { Check, Trash2 } from "lucide-react";
import {
  confirmPendingOrderAction,
  deletePendingOrderAction,
} from "./pending-actions";

/**
 * Los dos botones de un pedido pendiente: confirmarlo o descartarlo.
 *
 * Van en su propio componente para que la ficha siga siendo servidor: lo único
 * que necesita el navegador acá son estos dos clicks.
 */
export default function PendingOrderActions({
  id,
  amount,
}: {
  id: number;
  amount: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await confirmPendingOrderAction(id);
          })
        }
        className="flex items-center gap-1.5 rounded-md bg-[#37352f] text-white text-sm font-medium px-3.5 py-2 hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        <Check size={15} /> Confirmar
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          // El monto en la pregunta: es lo que distingue un pedido de otro
          // cuando hay tres esperando y todos se ven parecidos.
          if (
            !confirm(
              `¿Borrar el pedido de ${amount}? No se registra como venta y no queda rastro.`,
            )
          ) {
            return;
          }
          startTransition(async () => {
            await deletePendingOrderAction(id);
          });
        }}
        className="flex items-center gap-1.5 rounded-md border border-black/10 text-[#a8281f] text-sm font-medium px-3 py-2 hover:bg-[#a8281f]/5 transition-colors disabled:opacity-40"
      >
        <Trash2 size={15} /> Borrar
      </button>
    </div>
  );
}
