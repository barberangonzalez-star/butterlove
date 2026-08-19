"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/**
 * El video del maní, arriba de todo.
 *
 * Va en bucle y sin sonido porque no es un video que alguien decide ver: es la
 * foto del producto, moviéndose. Un botón de play de por medio sería una
 * decisión más antes de llegar al precio, y la mayoría no la toma.
 *
 * El póster sale del primer cuadro del propio video, así que si la reproducción
 * automática no arranca —datos ahorrados, batería baja, iOS de mal humor— lo
 * que queda es el frasco bien encuadrado y no un rectángulo negro.
 *
 * Se puede pausar, y con `prefers-reduced-motion` arranca pausado: diez
 * segundos repitiéndose solos son movimiento que nadie pidió.
 */
export default function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  // Arranca en "pausado" y sólo lo cambian los eventos del propio video. Es la
  // verdad: mientras carga todavía no se está reproduciendo nada, y así el
  // botón nunca dice lo contrario de lo que se ve.
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Quitar el atributo además de pausar: si no, el navegador lo vuelve a
      // arrancar en cuanto termine de cargar.
      video.autoplay = false;
      video.pause();
      return;
    }
    // El atributo `autoplay` solo no siempre alcanza —hay navegadores que se
    // quedan con el póster puesto sin llegar a pedir el archivo—, así que se le
    // pide reproducir a mano además. Si el navegador dice que no —ahorro de
    // datos, batería baja, política de reproducción automática—, se queda el
    // póster y el botón sigue ofreciendo reproducir.
    void video.play().catch(() => {});
  }, []);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
  };

  return (
    <div className="relative overflow-hidden torn-card aspect-video bg-ink">
      <video
        ref={ref}
        src="/videos/mani.mp4"
        poster="/hero/mani-video-poster.jpg"
        className="w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
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
