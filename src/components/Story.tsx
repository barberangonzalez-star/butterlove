export default function Story() {
  return (
    <section id="historia" className="bg-white/50">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-almendras-accent">
            De la tierra al frasco
          </span>
          <h2 className="font-display font-700 text-3xl sm:text-4xl mt-3 mb-5 leading-tight">
            Sin atajos, sin nada raro.
          </h2>
          <p className="text-ink-soft mb-4">
            Cada frasco de Butter Love empieza con maní, pistacho, almendras o
            merey de verdad — nunca de un polvo, nunca de un saborizante.
            Tostamos y molemos despacio, en tandas pequeñas, hasta lograr la
            cremosidad justa.
          </p>
          <p className="text-ink-soft mb-8">
            No le agregamos azúcar. No le agregamos aceites raros. Lo que ves
            en la etiqueta es exactamente lo que hay dentro.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              ["100%", "natural"],
              ["0g", "azúcar añadida"],
              ["100%", "hecho a mano"],
            ].map(([big, small]) => (
              <div key={small}>
                <p className="font-display font-700 text-2xl text-mani-accent">
                  {big}
                </p>
                <p className="text-xs text-ink-soft uppercase tracking-wide mt-1">
                  {small}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-3xl bg-mani-bg aspect-square" />
            <div className="rounded-3xl bg-pistacho-bg aspect-square mt-8" />
            <div className="rounded-3xl bg-merey-bg aspect-square -mt-8" />
            <div className="rounded-3xl bg-almendras-bg aspect-square" />
          </div>
        </div>
      </div>
    </section>
  );
}
