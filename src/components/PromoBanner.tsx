import Image from "next/image";

export default function PromoBanner() {
  return (
    <section className="px-3 sm:px-5 pt-6">
      <div className="torn-card bg-mani-bg px-6 sm:px-10 py-8 sm:py-10 grid sm:grid-cols-[1fr_auto] gap-6 items-center relative overflow-hidden">
        {/* decorative bubbles, echoing the product cards' droplet motifs */}
        <span className="absolute left-6 top-6 w-2.5 h-2.5 rounded-full bg-white/40" />
        <span className="absolute left-12 top-10 w-1.5 h-1.5 rounded-full bg-white/30" />

        <div className="relative z-10 text-center sm:text-left">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-ink/70 mb-2">
            Oferta por tiempo limitado
          </p>
          <h2 className="font-display font-700 text-2xl sm:text-4xl text-ink leading-tight mb-4">
            2 mantequillas de Maní 230g
            <br />
            por{" "}
            <span className="line-through text-ink/45 font-normal text-lg sm:text-xl mr-1">
              $12
            </span>
            <span className="text-3xl sm:text-5xl">$10</span>
          </h2>
          <a
            href="#productos"
            className="inline-block rounded-full bg-ink text-cream px-6 py-3 font-bold text-sm uppercase tracking-wide hover:opacity-85 transition-opacity"
          >
            Aprovechar oferta
          </a>
        </div>

        <div className="relative z-10 w-36 h-36 sm:w-52 sm:h-52 shrink-0 mx-auto">
          <Image
            src="/products/mani.png"
            alt="Oferta 2 mantequillas de maní 230g Butter Love"
            fill
            sizes="(max-width: 640px) 144px, 208px"
            className="object-contain drop-shadow-xl"
          />
        </div>
      </div>
    </section>
  );
}
