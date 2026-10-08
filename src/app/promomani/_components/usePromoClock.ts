"use client";

import { useEffect, useState } from "react";

/** Cuánto dura la promo para cada visitante, desde que entra por primera vez. */
export const PROMO_DURATION_MS = 60 * 60 * 1000;

/** Desde aquí el contador cambia de color: quedan los últimos minutos. */
export const PROMO_WARNING_MS = 5 * 60 * 1000;

const START_KEY = "butterlove-promo-mani-inicio";

/**
 * Cuánto le queda de promo a quien está viendo la landing.
 *
 * La hora corre desde su primera visita y se guarda en el navegador, así que
 * recargar o volver más tarde no la reinicia: cuando llega a cero, la promo
 * termina de verdad para esa persona y la página deja de ofrecer los combos.
 * Un contador que vuelve a empezar es una urgencia inventada, y el cliente que
 * regresa al día siguiente lo descubre.
 *
 * Mientras no se haya leído el navegador devuelve `null`: en el servidor no se
 * sabe cuándo llegó nadie, y la página se dibuja con la promo abierta.
 */
export function usePromoClock(): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    let start = Date.now();
    try {
      const saved = Number(window.localStorage.getItem(START_KEY));
      if (saved > 0 && saved <= start) start = saved;
      else window.localStorage.setItem(START_KEY, String(start));
    } catch {
      // Sin almacenamiento (modo privado estricto) la hora corre desde que
      // abrió esta pestaña.
    }

    const tick = () =>
      setRemaining(Math.max(0, start + PROMO_DURATION_MS - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return remaining;
}

/** 59:07, o 1:00:00 si todavía queda la hora entera. */
export function formatClock(ms: number) {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
