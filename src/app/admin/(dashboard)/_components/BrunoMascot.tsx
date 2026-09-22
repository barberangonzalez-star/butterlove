"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { ASSISTANT_NAME } from "./assistant-identity";

/**
 * Bruno, el bulldog inglés que vive en la esquina del panel.
 *
 * No es un adorno: es la puerta al asistente. Antes había un botón redondo con
 * un emoji en el teléfono y una pestañita en el borde en PC; los dos hacían lo
 * mismo —abrir el chat— y ninguno tenía cara. Bruno los reemplaza: un solo
 * personaje, igual en teléfono y en PC, que además saluda con una frase distinta
 * según la pantalla en la que estás, para que el asistente se sienta presente
 * sin tener que abrirlo para acordarse de que existe.
 *
 * El globo aparece solo, se puede cerrar, y si lo cierras se calla un rato
 * (guardado en el navegador) para no volverse pesado. Bruno mismo se puede
 * esconder; queda una patita para traerlo de vuelta.
 */

const OCULTO_KEY = "butterlove:bruno-oculto";
const GLOBO_CERRADO_KEY = "butterlove:bruno-globo-cerrado";

/** El globo callado se reactiva después de un rato: no lo silencia para siempre. */
const SILENCIO_MS = 1000 * 60 * 30; // media hora

/**
 * Qué dice Bruno en cada pantalla. La clave es el inicio de la ruta; se elige la
 * coincidencia más larga, así `/admin/clientes/123` cae en `/admin/clientes` y
 * sólo `/admin` exacto usa el saludo del tablero.
 */
const FRASES: { ruta: string; exacta?: boolean; texto: string }[] = [
  { ruta: "/admin", exacta: true, texto: "¿Te armo el resumen del día?" },
  { ruta: "/admin/ventas", texto: "¿Miramos cómo van las ventas?" },
  { ruta: "/admin/cotizador", texto: "¿Cotizamos algo?" },
  { ruta: "/admin/mayoreo", texto: "¿Un pedido de mayoreo?" },
  { ruta: "/admin/inventario", texto: "¿Reviso de qué te queda poco?" },
  { ruta: "/admin/productos", texto: "¿Ajustamos un producto?" },
  { ruta: "/admin/clientes", texto: "¿Buscamos un cliente?" },
  { ruta: "/admin/resenas", texto: "¿Leemos las reseñas nuevas?" },
  { ruta: "/admin/gastos", texto: "¿Anotamos un gasto?" },
  { ruta: "/admin/finanzas", texto: "¿Vemos los números del mes?" },
  { ruta: "/admin/promociones", texto: "¿Alguna promo nueva?" },
];

function fraseDe(pathname: string): string {
  let mejor: { texto: string; largo: number } | null = null;
  for (const { ruta, exacta, texto } of FRASES) {
    const coincide = exacta ? pathname === ruta : pathname.startsWith(ruta);
    if (coincide && (!mejor || ruta.length > mejor.largo)) {
      mejor = { texto, largo: ruta.length };
    }
  }
  return mejor?.texto ?? "¿En qué te ayudo?";
}

/**
 * Si Bruno está escondido, guardado en el navegador.
 *
 * Va en un almacén de fuera de React —leído con `useSyncExternalStore`, igual
 * que el asistente— y no en un `useState` con efecto: así el servidor renderiza
 * "visible" y el navegador corrige al hidratar, sin un `setState` dentro de un
 * efecto (que aquí es un error de lint, porque encadena renders).
 */
let listeners: (() => void)[] = [];

function leerOculto() {
  try {
    return window.localStorage.getItem(OCULTO_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  listeners.push(onChange);
  return () => {
    listeners = listeners.filter((listener) => listener !== onChange);
  };
}

function escribirOculto(oculto: boolean) {
  try {
    if (oculto) window.localStorage.setItem(OCULTO_KEY, "1");
    else window.localStorage.removeItem(OCULTO_KEY);
  } catch {
    // Que no se recuerde no es razón para no aplicarlo ahora.
  }
  for (const listener of listeners) listener();
}

export default function BrunoMascot({ onOpen }: { onOpen: () => void }) {
  const pathname = usePathname();
  const frase = useMemo(() => fraseDe(pathname), [pathname]);

  // En el servidor, visible: allá no hay dónde haberlo escondido.
  const oculto = useSyncExternalStore(subscribe, leerOculto, () => false);
  const [globoVisible, setGloboVisible] = useState(false);

  // El globo aparece un momento después de llegar a cada pantalla, salvo que lo
  // hayas callado hace poco. El pequeño retraso evita que salte encima de la
  // transición de página y se sienta brusco. Los `setState` van dentro de los
  // temporizadores, no en el cuerpo del efecto, así que no encadenan renders.
  useEffect(() => {
    if (oculto) return;

    let calladoHasta = 0;
    try {
      calladoHasta = Number(window.localStorage.getItem(GLOBO_CERRADO_KEY)) || 0;
    } catch {
      calladoHasta = 0;
    }
    if (Date.now() < calladoHasta) return;

    const aparece = window.setTimeout(() => setGloboVisible(true), 900);
    // Y se retira solo: un globo que se queda para siempre es un cartel, no un
    // saludo.
    const desaparece = window.setTimeout(() => setGloboVisible(false), 8000);
    return () => {
      window.clearTimeout(aparece);
      window.clearTimeout(desaparece);
    };
  }, [oculto, pathname]);

  const callarGlobo = () => {
    setGloboVisible(false);
    try {
      window.localStorage.setItem(GLOBO_CERRADO_KEY, String(Date.now() + SILENCIO_MS));
    } catch {
      // Que no se recuerde el silencio no es motivo para no callarlo ahora.
    }
  };

  const esconder = () => {
    setGloboVisible(false);
    escribirOculto(true);
  };

  const traer = () => escribirOculto(false);

  if (oculto) {
    return (
      <button
        type="button"
        onClick={traer}
        aria-label={`Traer a ${ASSISTANT_NAME}`}
        className="fixed bottom-4 right-4 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/90 text-sm shadow-sm backdrop-blur transition-transform hover:scale-105 active:scale-95"
      >
        <span aria-hidden="true">🐾</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {globoVisible && (
        <div className="animate-[bruno-globo_240ms_ease-out] relative mr-1 max-w-[15rem] rounded-2xl rounded-br-md border border-black/10 bg-white px-3.5 py-2.5 text-sm text-[#37352f] shadow-lg">
          <p className="pr-4 leading-snug">{frase}</p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              callarGlobo();
            }}
            aria-label="Ahora no"
            className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[#9a9895] hover:bg-black/5 hover:text-[#37352f]"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          {/* La colita del globo, apuntando a Bruno. */}
          <span className="absolute -bottom-[7px] right-6 h-3 w-3 rotate-45 border-b border-r border-black/10 bg-white" />
        </div>
      )}

      <div className="bruno-anda group relative">
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Abrir a ${ASSISTANT_NAME}`}
          title={`Hablar con ${ASSISTANT_NAME}`}
          className="block rounded-full transition-transform duration-200 hover:-translate-y-0.5 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#37352f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbfaf8]"
        >
          <BulldogIngles />
        </button>

        {/* Esconderlo queda a mano pero discreto: sólo asoma al pasar el cursor
            o al enfocar con teclado, para no competir con el propio Bruno. */}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            esconder();
          }}
          aria-label={`Esconder a ${ASSISTANT_NAME}`}
          className="bruno-esconder absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-black/10 bg-white text-[#9a9895] opacity-0 shadow-sm transition-opacity hover:text-[#37352f] focus:opacity-100 group-hover:opacity-100"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes bruno-globo {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        /* El paseo: se aleja despacio hacia la izquierda y vuelve, sin salirse
           de la esquina. Como es un bulldog, camina poco y sin prisa. */
        @keyframes bruno-paseo {
          0%   { transform: translateX(0); }
          40%  { transform: translateX(-40px); }
          55%  { transform: translateX(-40px); }
          95%  { transform: translateX(0); }
          100% { transform: translateX(0); }
        }
        /* El contoneo: se mece de lado a lado con un rebotecito, el andar
           bamboleante del bulldog. Va al mismo compás que los pasos. */
        @keyframes bruno-contoneo {
          0%, 100% { transform: translateY(0) rotate(-2.2deg); }
          25%      { transform: translateY(-1.6px) rotate(0deg); }
          50%      { transform: translateY(0) rotate(2.2deg); }
          75%      { transform: translateY(-1.6px) rotate(0deg); }
        }
        /* Las patitas, alternadas: cuando una sube la otra baja. */
        @keyframes bruno-paso-a {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }
        @keyframes bruno-paso-b {
          0%, 100% { transform: translateY(-3px); }
          50%      { transform: translateY(0); }
        }
        @keyframes bruno-parpadeo {
          0%, 92%, 100% { transform: scaleY(1); }
          96%           { transform: scaleY(0.1); }
        }
        @keyframes bruno-oreja {
          0%, 88%, 100% { transform: rotate(0deg); }
          94%           { transform: rotate(6deg); }
        }
        .bruno-anda    { animation: bruno-paseo 11s ease-in-out infinite; }
        .bruno-cuerpo  { animation: bruno-contoneo 0.9s ease-in-out infinite; transform-origin: 50% 100%; }
        .bruno-pata-i  { animation: bruno-paso-a 0.9s ease-in-out infinite; }
        .bruno-pata-d  { animation: bruno-paso-b 0.9s ease-in-out infinite; }
        .bruno-ojos    { animation: bruno-parpadeo 5.5s ease-in-out infinite; transform-origin: 50% 46%; }
        .bruno-oreja-i { animation: bruno-oreja 6.3s ease-in-out infinite; transform-origin: 34% 24%; }
        .bruno-oreja-d { animation: bruno-oreja 7.1s ease-in-out infinite; transform-origin: 66% 24%; }
        @media (prefers-reduced-motion: reduce) {
          .bruno-anda, .bruno-cuerpo, .bruno-pata-i, .bruno-pata-d,
          .bruno-ojos, .bruno-oreja-i, .bruno-oreja-d { animation: none; }
        }
        /* En pantallas táctiles no hay cursor que revele la ✕ de esconder, así
           que ahí se queda siempre a la vista (discreta) para poder ocultar a
           Bruno con el dedo. En PC sigue apareciendo sólo al pasar el cursor. */
        @media (hover: none) {
          .bruno-esconder { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/**
 * El bulldog inglés, dibujado a mano. Fawn con la trufa achatada, el hocico
 * blanco, las arruguitas de la frente y la mordida de abajo —la cara que lo hace
 * inconfundible— más un collarín oscuro con la placa, guiño a Butter Love.
 */
function BulldogIngles() {
  return (
    <svg
      width="88"
      height="88"
      viewBox="0 0 100 100"
      fill="none"
      className="drop-shadow-[0_6px_10px_rgba(55,53,47,0.28)]"
      aria-hidden="true"
    >
      <g className="bruno-cuerpo">
        {/* Sombra de contacto en el piso */}
        <ellipse cx="50" cy="95" rx="27" ry="4.5" fill="#37352f" opacity="0.12" />

        {/* Cuerpo sentado, con el pecho y las patitas más claros */}
        <path d="M25 94c-3-15 2-28 8-33 6-5 28-5 34 0 6 5 11 18 8 33z" fill="#d9a86c" />
        <path d="M39 94c-1-10 0-17 3-21 3-3 13-3 16 0 3 4 4 11 3 21z" fill="#f3ead9" />
        <g className="bruno-pata-i">
          <ellipse cx="37" cy="92" rx="7" ry="4.6" fill="#f3ead9" />
          <path d="M33.5 92h7" stroke="#c8955a" strokeWidth="1.1" strokeLinecap="round" />
        </g>
        <g className="bruno-pata-d">
          <ellipse cx="63" cy="92" rx="7" ry="4.6" fill="#f3ead9" />
          <path d="M59 92h7" stroke="#c8955a" strokeWidth="1.1" strokeLinecap="round" />
        </g>

        {/* Collar oscuro con la placa: guiño a Butter Love */}
        <path d="M33 64c6 6 28 6 34 0l-2 6c-7 4-23 4-30 0z" fill="#37352f" />
        <circle cx="50" cy="69.5" r="3.4" fill="#e6bd86" stroke="#37352f" strokeWidth="1" />

        {/* Orejas de rosa, caídas a los lados (la interna más oscura) */}
        <g className="bruno-oreja-i">
          <path d="M28 25C18 20 10 25 11 34c1 8 10 10 16 6z" fill="#c8955a" />
          <path d="M27 28c-5-2-9 0-9 5 0 4 5 6 9 4z" fill="#b07d43" />
        </g>
        <g className="bruno-oreja-d">
          <path d="M72 25c10-5 18 0 17 9-1 8-10 10-16 6z" fill="#c8955a" />
          <path d="M73 28c5-2 9 0 9 5 0 4-5 6-9 4z" fill="#b07d43" />
        </g>

        {/* Cabeza: ancha y baja, la marca del bulldog */}
        <path d="M50 14C31 14 19 25 19 40c0 17 14 27 31 27s31-10 31-27C81 25 69 14 50 14Z" fill="#e6bd86" />

        {/* Arrugas de la frente */}
        <path
          d="M39 28c6-3 16-3 22 0M42 34c5-2 11-2 16 0M50 24v7"
          stroke="#c8955a"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        {/* Cejas pesadas, ceño de bulldog */}
        <path d="M33 39c3-3 8-3 11-1M56 38c3-2 8-2 11 1" stroke="#c8955a" strokeWidth="2" strokeLinecap="round" />

        {/* Ojos (parpadean) */}
        <g className="bruno-ojos">
          <ellipse cx="38" cy="44" rx="5.4" ry="5.8" fill="#f3ead9" />
          <ellipse cx="62" cy="44" rx="5.4" ry="5.8" fill="#f3ead9" />
          <circle cx="39" cy="45" r="3.2" fill="#37352f" />
          <circle cx="61" cy="45" r="3.2" fill="#37352f" />
          <circle cx="40.3" cy="43.8" r="1" fill="#fff" />
          <circle cx="62.3" cy="43.8" r="1" fill="#fff" />
        </g>

        {/* Cachetes colgantes (jowls) y hocico achatado, en blanco */}
        <path d="M34 50c-3 9-1 18 6 18 3-3 4-9 3-15z" fill="#f7f1e6" />
        <path d="M66 50c3 9 1 18-6 18-3-3-4-9-3-15z" fill="#f7f1e6" />
        <path d="M37 49c0-6 6-9 13-9s13 3 13 9c0 9-6 15-13 15s-13-6-13-15z" fill="#f7f1e6" />

        {/* Trufa grande y achatada */}
        <path d="M43 49c0-2.4 2.6-4 7-4s7 1.6 7 4-3 4-7 4-7-1.6-7-4z" fill="#37352f" />
        <ellipse cx="46.5" cy="48.5" rx="1" ry="1.4" fill="#5b564e" />
        <ellipse cx="53.5" cy="48.5" rx="1" ry="1.4" fill="#5b564e" />

        {/* Boca y mordida de abajo con dos colmillitos */}
        <path d="M50 53v4" stroke="#37352f" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M41 58c3 4 6 5 9 5s6-1 9-5" stroke="#37352f" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <path d="M46 59.5v2.6M54 59.5v2.6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}
