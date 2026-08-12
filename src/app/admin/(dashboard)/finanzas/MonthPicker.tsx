"use client";

export interface MonthOption {
  value: string;
  label: string;
}

/**
 * Elegir el mes del reporte. Va como formulario GET para que el mes quede en
 * la URL: así se puede compartir o recargar sin perderlo.
 */
export default function MonthPicker({
  month,
  months,
}: {
  month: string;
  months: MonthOption[];
}) {
  return (
    <form method="get">
      <select
        name="month"
        defaultValue={month}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        aria-label="Mes del reporte"
        className="rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#37352f] capitalize"
      >
        {months.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {/* Sin JS el select no envía solo: el botón queda de respaldo. */}
      <noscript>
        <button type="submit" className="ml-2 text-sm underline">
          Ver
        </button>
      </noscript>
    </form>
  );
}
