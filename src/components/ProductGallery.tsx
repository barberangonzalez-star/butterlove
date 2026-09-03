"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { ProductShot } from "@/lib/product-media";

/**
 * La galería de la ficha: una sola ventana cuadrada por la que pasan todas las
 * fotos y el video, y las miniaturas al lado para saltar a cualquiera.
 *
 * En el teléfono se arrastra con el dedo, que es como se mira cualquier tienda
 * desde el teléfono: nada de botones para cambiar de foto. Lo que hace el
 * trabajo es `scroll-snap` del navegador, no una animación nuestra —arranca
 * con el dedo, sigue la inercia y no se pelea con el scroll de la página—; lo
 * único que ponemos nosotros es leer en qué diapositiva quedó para marcar la
 * miniatura, y empujar el carrete cuando alguien toca una.
 *
 * El marco es cuadrado en todas las pantallas, como las fotos (1080x1080), y
 * el video se muestra apaisado dentro de él, con su banda arriba y abajo. Se
 * probó recortándolo para que llenara el cuadrado y no: el encuadre es del
 * video —el frasco entra justo— y recortarle los lados le comía media
 * etiqueta.
 */
export default function ProductGallery({
  shots,
  title,
}: {
  shots: ProductShot[];
  title: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  if (shots.length === 0) return null;

  const current = shots[Math.min(active, shots.length - 1)];
  const many = shots.length > 1;

  const goTo = (i: number) => {
    const track = trackRef.current;
    const next = Math.max(0, Math.min(shots.length - 1, i));
    setActive(next);
    track?.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
  };

  // La verdad de qué se está viendo la tiene el carrete, no el estado: se
  // puede llegar a una diapositiva arrastrando, sin que nadie toque un botón.
  const syncActive = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setActive(Math.round(track.scrollLeft / track.clientWidth));
  };

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
      {many && (
        <div
          className="flex sm:flex-col gap-2 sm:gap-3 overflow-x-auto sm:overflow-visible -mx-5 px-5 sm:mx-0 sm:px-0 no-scrollbar"
          role="tablist"
          aria-label={`Fotos y video de ${title}`}
        >
          {shots.map((shot, i) => (
            <button
              key={`${shot.kind}-${shot.src}`}
              role="tab"
              aria-selected={i === active}
              aria-label={
                shot.kind === "video"
                  ? `Ver el video de ${title}`
                  : `Ver la foto ${i + 1} de ${title}`
              }
              onClick={() => goTo(i)}
              className={`relative w-16 h-16 sm:w-[72px] sm:h-[72px] shrink-0 rounded-2xl overflow-hidden transition-shadow ${
                shot.kind === "photo" && shot.cutout ? shot.bgClass : "bg-surface"
              } ${
                i === active
                  ? "ring-2 ring-ink ring-offset-2 ring-offset-page"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={shot.kind === "video" ? shot.poster : shot.src}
                alt=""
                fill
                sizes="72px"
                className={
                  shot.kind === "photo" && shot.cutout
                    ? "object-contain p-1.5"
                    : "object-cover object-[55%_center]"
                }
              />
              {shot.kind === "video" && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center justify-center bg-ink/30"
                >
                  <Play className="w-4 h-4 translate-x-px fill-cream text-cream" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="relative flex-1 min-w-0">
        <div
          ref={trackRef}
          onScroll={syncActive}
          className="torn-card flex overflow-x-auto snap-x snap-mandatory overscroll-x-contain aspect-square no-scrollbar"
        >
          {shots.map((shot, i) =>
            shot.kind === "video" ? (
              <div
                key={`${shot.kind}-${shot.src}`}
                className="relative w-full h-full shrink-0 snap-center bg-ink"
              >
                <GalleryVideo shot={shot} active={i === active} />
              </div>
            ) : (
              <div
                key={`${shot.kind}-${shot.src}`}
                className={`relative w-full h-full shrink-0 snap-center ${
                  shot.cutout ? shot.bgClass : "bg-surface"
                }`}
              >
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  fill
                  // La primera es lo más grande que se ve al abrir la ficha:
                  // se pide desde el <head> en vez de esperar a que el
                  // navegador la descubra. Las demás esperan a que alguien
                  // llegue a ellas arrastrando.
                  preload={i === 0}
                  sizes="(max-width: 640px) 92vw, 400px"
                  className={
                    shot.cutout
                      ? "object-contain p-8 drop-shadow-xl"
                      : "object-cover"
                  }
                />
              </div>
            ),
          )}
        </div>

        {/* De qué frasco es esta foto. Sólo lo llevan las que se piden
            prestadas a un sabor suelto para la galería de un combo. */}
        {current.caption && (
          <span className="absolute bottom-3 left-3 rounded-full bg-ink/70 text-cream text-xs font-semibold px-3 py-1.5 backdrop-blur-sm">
            {current.caption}
          </span>
        )}

        {many && (
          <>
            <span
              aria-hidden="true"
              // Arriba y no abajo: abajo a la derecha están los botones del
              // video, y el contador les caía encima.
              className="sm:hidden absolute top-3 right-3 rounded-full bg-ink/70 text-cream text-xs font-semibold tabular-nums px-2.5 py-1.5 backdrop-blur-sm"
            >
              {active + 1} / {shots.length}
            </span>

            {/* En pantalla grande no hay dedo que arrastre. */}
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              aria-label="Foto anterior"
              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-page/80 text-ink backdrop-blur-sm items-center justify-center shadow-sm hover:bg-page disabled:opacity-0 transition-opacity"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              disabled={active === shots.length - 1}
              aria-label="Foto siguiente"
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-page/80 text-ink backdrop-blur-sm items-center justify-center shadow-sm hover:bg-page disabled:opacity-0 transition-opacity"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * El video, dentro de la galería.
 *
 * Se reproduce solo, en silencio y en bucle cuando es la diapositiva que se
 * está mirando: no es un video que alguien decide ver, es la foto del producto
 * moviéndose. Y sólo entonces: hasta que no le toca, no se descarga (`preload
 * none`), así que quien nunca arrastra hasta acá no paga el megabyte.
 *
 * Los dos botones son para deshacer eso: pausar, y subir el volumen de quien
 * quiera oírlo. Si alguien pausa a mano, no se vuelve a arrancar solo.
 */
function GalleryVideo({
  shot,
  active,
}: {
  shot: Extract<ProductShot, { kind: "video" }>;
  active: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const pausedByUser = useRef(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    // Con `prefers-reduced-motion` no arranca solo: el botón sigue estando.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const shouldPlay =
          active && entry.isIntersecting && !reduce && !pausedByUser.current;
        if (shouldPlay) {
          // El navegador sólo deja reproducir sin permiso lo que está en
          // silencio, y React no siempre deja puesto el atributo antes de que
          // corra esto.
          video.muted = true;
          setMuted(true);
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.6 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [active]);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      pausedByUser.current = false;
      void video.play().catch(() => {});
    } else {
      pausedByUser.current = true;
      video.pause();
    }
  };

  const toggleSound = () => {
    const video = ref.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  return (
    <>
      <video
        ref={ref}
        src={shot.src}
        poster={shot.poster}
        aria-label={shot.alt}
        // Entero, con su forma apaisada: el marco es cuadrado y lo que sobra
        // arriba y abajo queda del color de la diapositiva.
        className="w-full h-full object-contain"
        muted
        loop
        playsInline
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      <div className="absolute bottom-3 right-3 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted ? "Activar el sonido" : "Silenciar"}
          className="w-9 h-9 rounded-full bg-ink/50 text-cream backdrop-blur-sm flex items-center justify-center hover:bg-ink/75 transition-colors"
        >
          {muted ? (
            <VolumeX className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Volume2 className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pausar el video" : "Reproducir el video"}
          className="w-9 h-9 rounded-full bg-ink/50 text-cream backdrop-blur-sm flex items-center justify-center hover:bg-ink/75 transition-colors"
        >
          {playing ? (
            <Pause className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Play className="w-4 h-4 translate-x-px" aria-hidden="true" />
          )}
        </button>
      </div>
    </>
  );
}
