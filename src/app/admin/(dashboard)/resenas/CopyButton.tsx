"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Copia un texto al portapapeles y lo confirma dos segundos. */
export default function CopyButton({
  text,
  label,
  className = "",
}: {
  text: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Sin permiso de portapapeles queda el enlace a la vista para
          // copiarlo a mano.
        }
      }}
      className={`h-9 inline-flex items-center justify-center gap-1.5 rounded-md border border-black/15 px-3 text-sm text-[#37352f] hover:bg-black/5 disabled:opacity-50 ${className}`}
    >
      {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
      {copied ? "Copiado" : label}
    </button>
  );
}
