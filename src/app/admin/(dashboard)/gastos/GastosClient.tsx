"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  deleteExpenseAction,
  saveExpenseAction,
  setExpenseKindAction,
} from "./actions";
import {
  EXPENSE_CATEGORIES,
  expenseKind,
  isExpenseKind,
  type ExpenseKind,
} from "@/lib/config";
import type { Expense } from "@/lib/expenses-data";

const inputClass =
  "w-full rounded-md border border-black/15 bg-white px-2.5 py-2 text-sm outline-none focus:border-[#37352f]";
const labelClass = "block text-xs font-medium text-[#787774] mb-1";

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
const fmtBs = (n: number) =>
  `Bs. ${n.toLocaleString("es-VE", { maximumFractionDigits: 2 })}`;

/** El día sin el año, que es el que se repite en toda la tabla. */
function shortDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function flip(kind: string): ExpenseKind {
  return kind === "inventario" ? "operativo" : "inventario";
}

/**
 * El interruptor de "¿resta de los gastos de Butter?". Es un botón y no un
 * menú porque son dos estados y se corrige de un clic, en la misma fila.
 */
function KindButton({
  kind,
  onClick,
  className = "",
}: {
  kind: string;
  onClick: () => void;
  className?: string;
}) {
  const deducts = kind !== "inventario";
  return (
    <button
      type="button"
      onClick={onClick}
      title={
        deducts
          ? "Resta de la ganancia del mes. Clic para que no reste."
          : "Salió de la caja pero no de la ganancia: es inventario o algo que te queda. Clic para que reste."
      }
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        deducts
          ? "border-black/15 text-[#5f5e5b] hover:bg-black/5"
          : "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
      } ${className}`}
    >
      {deducts ? <Check size={12} /> : <X size={12} />}
      {deducts ? "Sí resta" : "No resta"}
    </button>
  );
}

export default function GastosClient({
  expenses,
  defaultDate,
  bcvRate,
}: {
  expenses: Expense[];
  /** Con qué fecha arranca el formulario: hoy, o el primer día del mes visto. */
  defaultDate: string;
  /** Tasa BCV del día, para mostrar cada monto también en bolívares. */
  bcvRate: number | null;
}) {
  // El interruptor de cada fila responde de una vez y la lista se corrige sola
  // cuando el servidor contesta.
  const [rows, toggleRow] = useOptimistic(
    expenses,
    (state: Expense[], id: number) =>
      state.map((e) => (e.id === id ? { ...e, kind: flip(e.kind) } : e)),
  );
  const [, startTransition] = useTransition();

  const [editing, setEditing] = useState<Expense | null>(null);
  const [date, setDate] = useState(defaultDate);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].name);
  // La categoría propone, pero manda lo que diga el botón.
  const [kind, setKind] = useState<ExpenseKind>(expenseKind(category));
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const startEdit = (expense: Expense) => {
    setEditing(expense);
    setDate(expense.expenseDate);
    setCategory(expense.category);
    setKind(isExpenseKind(expense.kind) ? expense.kind : expenseKind(expense.category));
    setAmount(String(Number(expense.amountUsd)));
    setDescription(expense.description ?? "");
  };

  const cancelEdit = () => {
    setEditing(null);
    setDate(defaultDate);
    setAmount("");
    setDescription("");
  };

  const chooseCategory = (name: string) => {
    setCategory(name);
    setKind(expenseKind(name));
  };

  const submit = async (formData: FormData) => {
    await saveExpenseAction(formData);
    // La fecha y la categoría se quedan: casi siempre se anotan varios gastos
    // seguidos del mismo día. Lo que cambia de uno a otro se limpia.
    setEditing(null);
    setAmount("");
    setDescription("");
  };

  const toggleKind = (expense: Expense) => {
    startTransition(async () => {
      toggleRow(expense.id);
      await setExpenseKindAction(expense.id, flip(expense.kind));
    });
  };

  async function handleDelete(expense: Expense) {
    if (!confirm(`¿Eliminar el gasto de ${fmtUsd(Number(expense.amountUsd))}?`)) {
      return;
    }
    await deleteExpenseAction(expense.id);
  }

  const total = rows.reduce((sum, e) => sum + Number(e.amountUsd), 0);
  const deducted = rows
    .filter((e) => e.kind !== "inventario")
    .reduce((sum, e) => sum + Number(e.amountUsd), 0);

  return (
    <div className="space-y-4">
      <form
        action={submit}
        className="border border-black/10 rounded-lg bg-white p-4"
      >
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <input type="hidden" name="kind" value={kind} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[9rem_1fr_1fr_7rem]">
          <label className="block">
            <span className={labelClass}>Fecha</span>
            <input
              type="date"
              name="expenseDate"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Categoría</span>
            <select
              name="category"
              value={category}
              onChange={(e) => chooseCategory(e.target.value)}
              className={inputClass}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Detalle (opcional)</span>
            <input
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Campaña de agosto, 5 kg de maní…"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Monto ($)</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              name="amountUsd"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className={inputClass}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-3">
          <KindButton kind={kind} onClick={() => setKind(flip(kind))} />
          <span className="text-xs text-[#787774]">
            {kind === "inventario"
              ? "No se resta de la ganancia: es inventario o algo que te queda."
              : "Se resta de la ganancia del mes."}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {editing && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-md border border-black/15 px-3 py-2 text-sm hover:bg-black/5"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md bg-[#37352f] text-white text-sm font-medium px-4 py-2 hover:opacity-90"
            >
              {editing ? (
                "Guardar cambios"
              ) : (
                <>
                  <Plus size={15} /> Agregar gasto
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      <div className="border border-black/10 rounded-lg bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-black/10">
          <p className="text-xs font-medium text-[#787774] uppercase tracking-wide">
            {rows.length} gasto{rows.length === 1 ? "" : "s"} en el mes
          </p>
        </div>

        {/* En pantalla chica la tabla no cabe sin encogerlo todo, así que cada
            gasto va como ficha. */}
        <ul className="lg:hidden divide-y divide-black/5">
          {rows.map((expense) => (
            <li key={expense.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm">{expense.category}</p>
                  <p className="text-xs text-[#787774] break-words">
                    {shortDate(expense.expenseDate)}
                    {expense.description ? ` · ${expense.description}` : ""}
                  </p>
                </div>
                <span className="text-right shrink-0">
                  <span className="block text-sm font-medium tabular-nums">
                    {fmtUsd(Number(expense.amountUsd))}
                  </span>
                  {bcvRate && (
                    <span className="block text-xs text-[#787774] tabular-nums">
                      {fmtBs(Number(expense.amountUsd) * bcvRate)}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <KindButton
                  kind={expense.kind}
                  onClick={() => toggleKind(expense)}
                />
                <button
                  onClick={() => startEdit(expense)}
                  title="Editar gasto"
                  className="ml-auto w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/5 text-[#5f5e5b]"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(expense)}
                  title="Eliminar gasto"
                  className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/5 text-[#5f5e5b]"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs text-[#787774] uppercase tracking-wide">
                <th className="px-4 py-2.5 font-medium w-20">Fecha</th>
                <th className="px-4 py-2.5 font-medium">Categoría</th>
                <th className="px-4 py-2.5 font-medium">Detalle</th>
                <th className="px-4 py-2.5 font-medium w-32">¿Resta?</th>
                <th className="px-4 py-2.5 font-medium text-right w-32">Monto</th>
                <th className="px-4 py-2.5 font-medium w-20"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((expense) => (
                <tr
                  key={expense.id}
                  className="border-b border-black/5 last:border-0 hover:bg-black/[0.02]"
                >
                  <td className="px-4 py-2.5 tabular-nums text-[#5f5e5b] whitespace-nowrap">
                    {shortDate(expense.expenseDate)}
                  </td>
                  <td className="px-4 py-2.5">{expense.category}</td>
                  <td className="px-4 py-2.5 text-[#5f5e5b]">
                    {expense.description ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <KindButton
                      kind={expense.kind}
                      onClick={() => toggleKind(expense)}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    <span className="block font-medium">
                      {fmtUsd(Number(expense.amountUsd))}
                    </span>
                    {bcvRate && (
                      <span className="block text-xs text-[#787774]">
                        {fmtBs(Number(expense.amountUsd) * bcvRate)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(expense)}
                        title="Editar gasto"
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/5 text-[#5f5e5b]"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(expense)}
                        title="Eliminar gasto"
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/5 text-[#5f5e5b]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-[#787774]">
            Sin gastos registrados este mes.
          </p>
        )}

        {rows.length > 0 && (
          <div className="border-t border-black/10 bg-black/[0.015] px-4 py-3">
            <dl className="ml-auto w-full max-w-[15rem] space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-sm text-[#787774]">Total gastado</dt>
                <dd className="text-right">
                  <span className="text-sm font-semibold tabular-nums">
                    {fmtUsd(total)}
                  </span>
                  {bcvRate && (
                    <span className="block text-xs text-[#787774] tabular-nums">
                      {fmtBs(total * bcvRate)}
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-sm text-[#787774]">Resta de la ganancia</dt>
                <dd className="text-sm font-medium tabular-nums">
                  {fmtUsd(deducted)}
                </dd>
              </div>
              {total - deducted > 0 && (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-sm text-[#787774]">No resta</dt>
                  <dd className="text-sm font-medium tabular-nums">
                    {fmtUsd(total - deducted)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
