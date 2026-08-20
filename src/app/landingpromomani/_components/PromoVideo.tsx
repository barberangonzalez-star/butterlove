"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/**
 * El video del maní, a media página.
 *
 * Va en bucle y sin sonido porque no es un video que alguien decide ver: es la
 * foto del producto, moviéndose. Un botón de play de por medio sería una
 * decisión más antes de llegar al precio, y la mayoría no la toma.
 *
 * Arranca cuando entra en pantalla, no cuando carga la página. Cuando el video
 * estaba arriba del todo daba igual —se veía apenas abrir—, pero ahora hay que
 * bajar hasta él: reproducirlo desde el principio sería descargar un mega y
 * medio que nadie está mirando, y llegar a mitad del bucle en vez de al primer
 * cuadro. Al salir de pantalla se pausa por lo mismo.
 *
 * El póster sale del primer cuadro del propio video, así que si la
 * reproducción automática no arranca lo que queda es el frasco bien
 * encuadrado y no un rectángulo negro.
 */
export default function PromoVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  // Arranca en "pausado" y sólo lo cambian los eventos del propio video. Es la
  // verdad: mientras carga todavía no se está reproduciendo nada, y así el
  // botón nunca dice lo contrario de lo que se ve.
  const [playing, setPlaying] = useState(false);
  // Si el visitante pausa a mano, el observador deja de mandar: volver a
  // arrancarlo al pasar por delante sería desobedecer el único botón que tiene.
  const pausedByUser = useRef(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    // Con `prefers-reduced-motion` no se reproduce solo: diez segundos
    // repitiéndose son movimiento que nadie pidió. El botón sigue ahí para
    // quien lo quiera ver.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!pausedByUser.current) void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      // Medio video a la vista antes de arrancar: asomando por el borde
      // todavía no se ve nada que valga la pena reproducir.
      { threshold: 0.5 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

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

  return (
    <div className="relative overflow-hidden torn-card aspect-video bg-ink">
      <video
        ref={ref}
        src="/videos/mani.mp4"
        poster="/hero/mani-video-poster.jpg"
        className="w-full h-full object-cover"
        muted
        loop
        playsInline
        // Sin `preload`: el archivo se pide cuando el observador manda a
        // reproducir, no antes. Quien no baja hasta acá no lo descarga.
        preload="none"
        aria-label="Mantequilla de maní Butter Love, servida con cuchara"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausar el video" : "Reproducir el video"}
        className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-ink/50 text-cream backdrop-blur-sm flex items-center justify-center hover:bg-ink/75 transition-colors"
      >
        {playing ? (
          <Pause className="w-4 h-4" aria-hidden="true" />
        ) : (
          <Play className="w-4 h-4 translate-x-px" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
