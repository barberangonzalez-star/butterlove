import { productVideo, SHOW_VIDEO_PLACEHOLDER } from "@/lib/product-videos";

/**
 * El video del producto. Si todavía no existe, se dibuja el hueco con la misma
 * proporción que va a tener el video: es un espacio reservado a propósito, no
 * un error de carga.
 */
export default function ProductVideo({
  productKey,
  title,
  poster,
}: {
  productKey: string;
  title: string;
  poster: string;
}) {
  const src = productVideo(productKey);
  if (!src && !SHOW_VIDEO_PLACEHOLDER) return null;

  return (
    <section className="mx-auto max-w-7xl px-5 sm:px-8 pb-12 sm:pb-16">
      <h2 className="font-display font-700 text-2xl text-ink mb-5">
        {title} en video
      </h2>

      <div className="max-w-3xl">
        {src ? (
          <video
            className="torn-card w-full aspect-video bg-ink object-cover"
            controls
            playsInline
            preload="metadata"
            poster={poster}
            src={src}
          />
        ) : (
          <div className="torn-card w-full aspect-video border-2 border-dashed border-ink/20 bg-surface flex flex-col items-center justify-center gap-4 px-6 text-center">
            <span
              aria-hidden="true"
              className="w-14 h-14 rounded-full bg-ink/10 flex items-center justify-center"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6 translate-x-0.5 fill-ink/50"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <p className="text-base text-ink-soft max-w-sm leading-relaxed">
              Aquí va el video de {title}. Lo estamos grabando.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
