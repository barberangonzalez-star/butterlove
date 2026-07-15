export default function Story() {
  return (
    <section id="historia" className="px-3 sm:px-5 py-6 space-y-4">
      {/* dark "warning" panel — mirrors Charlie's Positively Addictive block */}
      <div className="torn-card bg-dark-panel text-cream px-6 sm:px-10 py-10 sm:py-14 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="font-display font-700 text-3xl sm:text-4xl mb-1">
            Positivamente
          </h2>
          <h2 className="font-display font-700 text-3xl sm:text-4xl mb-4">
            adictiva.
          </h2>
          <p className="text-xs font-bold uppercase tracking-[0.3em] mb-4 text-cream/70">
            — Advertencia —
          </p>
          <p className="text-cream/85 leading-relaxed max-w-md">
            Una vez que abres un Butter Love, el pan solo ya no alcanza.
            Frutos reales, molienda lenta, sin azúcar — suena simple porque lo
            es. Por eso cuesta tanto parar. Así sabe untar bien hecho: sin
            atajos, sin rellenos, sin vuelta atrás.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-mani-bg aspect-square" />
          <div className="rounded-2xl bg-pistacho-bg aspect-square mt-6" />
          <div className="rounded-2xl bg-merey-bg aspect-square -mt-6" />
          <div className="rounded-2xl bg-almendras-bg aspect-square" />
        </div>
      </div>

      {/* "Only the best is good enough" — sourcing story panel */}
      <div className="torn-card bg-mani-bg px-6 sm:px-10 py-10 sm:py-14 grid md:grid-cols-2 gap-8 items-center">
        <div className="bg-white/90 rounded-3xl p-6 sm:p-8">
          <h2 className="font-display font-700 text-2xl sm:text-3xl mb-4 text-ink">
            Solo lo mejor
            <br />
            es suficiente
          </h2>
          <p className="text-ink-soft text-sm leading-relaxed mb-3">
            Antes de llegar a tu mesa, cada frasco de Butter Love empieza en
            manos de productores venezolanos de maní, pistacho, almendras y
            merey. Sin rellenos, sin aceites raros, sin azúcar agregada.
          </p>
          <p className="text-ink-soft text-sm leading-relaxed">
            Tostamos y molemos en tandas pequeñas, despacio, hasta lograr la
            cremosidad justa. Lo que dice el frasco es lo que hay dentro.
          </p>
        </div>
        <p className="font-display font-700 text-2xl sm:text-3xl text-ink text-center md:text-right leading-tight">
          &quot;De la finca
          <br />
          al frasco,
          <br />
          sin atajos.&quot;
        </p>
      </div>
    </section>
  );
}
