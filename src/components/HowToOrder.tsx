const steps = [
  {
    title: "Elige tu mantequilla",
    text: "Escoge sabor y tamaño (230g o 350g) y agrégalo al pedido.",
  },
  {
    title: "Confirma por WhatsApp",
    text: "Tu pedido se arma solo en un mensaje. Solo lo envías.",
  },
  {
    title: "Paga como prefieras",
    text: "Pago Móvil, USD en efectivo o Binance — coordinamos contigo.",
  },
  {
    title: "Recibe tu pedido",
    text: "Coordinamos entrega o punto de encuentro contigo por WhatsApp.",
  },
];

export default function HowToOrder() {
  return (
    <section id="pedido" className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-24">
      <div className="text-center max-w-xl mx-auto mb-12">
        <span className="text-xs font-bold uppercase tracking-widest text-merey-accent">
          Cómo pedir
        </span>
        <h2 className="font-display font-700 text-3xl sm:text-4xl mt-3">
          De la web a tu cocina
        </h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {steps.map((s, i) => (
          <div key={s.title} className="rounded-3xl bg-white/60 p-6">
            <span className="font-display font-700 text-3xl text-mani-accent">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="font-display font-700 text-lg mt-3 mb-2">
              {s.title}
            </h3>
            <p className="text-ink-soft text-sm">{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
