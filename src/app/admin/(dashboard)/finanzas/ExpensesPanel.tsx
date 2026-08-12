"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { saveExpenseAction, deleteExpenseAction } from "./actions";
import { EXPENSE_CATEGORIES, expenseKind } from "@/lib/config";
import type { Expense } from "@/lib/expenses-data";

const inputClass =
  "w-full rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#37352f]";
const labelClass = "text-xs font-medium text-[#787774] uppercase tracking-wide";

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;

function ExpenseForm({
  expense,
  defaultDate,
  onClose,
}: {
  expense: Expense | null;
  /** El primer día del mes que se está viendo: casi siempre el gasto es de ahí. */
  defaultDate: string;
  onClose: () => void;
}) {
  const [category, setCategory] = useState(
    expense?.category ?? EXPENSE_CATEGORIES[0].name,
  );
  const isInventory = expenseKind(category) === "inventario";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <form
        action={async (formData) => {
          await saveExpenseAction(formData);
          onClose();
        }}
        className="relative w-full max-w-sm max-h-[90dvh] overflow-y-auto bg-white border border-black/10 rounded-lg p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">
            {expense ? "Editar gasto" : "Registrar gasto"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/5"
          >
            <X size={14} />
          </button>
        </div>

        {expense && <input type="hidden" name="id" value={expense.id} />}

        <label className="block mb-3">
          <span className={labelClass}>Categoría</span>
          <select
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`${inputClass} mt-1`}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        {/* La distinción no es un detalle contable: es la diferencia entre una
            ganancia real y una que resta el maní dos veces. */}
        <p
          className={`text-xs rounded-md px-3 py-2 mb-3 ${
            isInventory
              ? "bg-amber-50 text-amber-900"
              : "bg-black/[0.03] text-[#5f5e5b]"
          }`}
        >
          {isInventory
            ? "No se resta de la ganancia: ese costo ya se cuenta frasco a frasco cuando vendes. Sí aparece en la caja del mes."
            : "Se resta de la ganancia del mes."}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="block">
            <span className={labelClass}>Fecha</span>
            <input
              type="date"
              name="expenseDate"
              defaultValue={expense?.expenseDate ?? defaultDate}
              required
              className={`${inputClass} mt-1`}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Monto ($)</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              name="amountUsd"
              defaultValue={expense ? String(Number(expense.amountUsd)) : ""}
              required
              className={`${inputClass} mt-1`}
            />
          </label>
        </div>

        <label className="block mb-4">
          <span className={labelClass}>Detalle (opcional)</span>
          <input
            name="description"
            defaultValue={expense?.description ?? ""}
            placeholder="Campaña de agosto, 5 kg de maní…"
            className={`${inputClass} mt-1`}
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

export default function ExpensesPanel({
  expenses,
  monthStart,
}: {
  expenses: Expense[];
  monthStart: string;
}) {
  const [editing, setEditing] = useState<Expense | "new" | null>(null);

  async function handleDelete(expense: Expense) {
    if (!confirm(`¿Eliminar el gasto de ${fmtUsd(Number(expense.amountUsd))}?`)) {
      return;
    }
    await deleteExpenseAction(expense.id);
  }

  return (
    <div className="border border-black/10 rounded-lg bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-black/10">
        <p className="text-xs font-medium text-[#787774] uppercase tracking-wide">
          Gastos del mes
        </p>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 rounded-md bg-[#37352f] text-white text-xs font-medium px-2.5 py-1.5 hover:opacity-90"
        >
          <Plus size={13} /> Registrar
        </button>
      </div>

      <ul className="divide-y divide-black/5">
        {expenses.map((expense) => (
          <li
            key={expense.id}
            className="flex items-start justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm">
                {expense.category}
                {expense.kind === "inventario" && (
                  <span className="ml-1.5 text-[11px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded-full">
                    inventario
                  </span>
                )}
              </p>
              <p className="text-xs text-[#787774] break-words">
                {expense.expenseDate}
                {expense.description ? ` · ${expense.description}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-sm font-medium tabular-nums mr-1">
                {fmtUsd(Number(expense.amountUsd))}
              </span>
              <button
                onClick={() => setEditing(expense)}
                title="Editar gasto"
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/5 text-[#5f5e5b]"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => handleDelete(expense)}
                title="Eliminar gasto"
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/5 text-[#5f5e5b]"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </li>
        ))}
        {expenses.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-[#787774]">
            Sin gastos registrados este mes.
          </li>
        )}
      </ul>

      {editing && (
        <ExpenseForm
          expense={editing === "new" ? null : editing}
          defaultDate={monthStart}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
