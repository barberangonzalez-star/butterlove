import Image from "next/image";

export default function Footer() {
  return (
    <footer className="px-3 sm:px-5 pb-28 sm:pb-24 pt-2">
      <div className="torn-card bg-dark-panel text-cream px-6 sm:px-10 py-10 sm:py-14">
        <div className="grid sm:grid-cols-2 gap-8 mb-10">
          <p className="max-w-xs text-cream/85">
            Disfruta el sabor real de Butter Love — sin azúcar agregada, sin
            nada raro, solo frutos secos untados como deben ser.
          </p>
          <p className="font-display font-700 text-2xl sm:text-3xl italic text-right">
            ¡Untemos
            <br />
            sin límites!
          </p>
        </div>

        <div className="flex justify-center">
          <Image
            src="/logo-wordmark.png"
            alt="Butter Love"
            width={920}
            height={500}
            className="h-24 sm:h-32 w-auto opacity-90"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 mt-6 border-t border-cream/15 text-xs text-cream/60">
          <span>© {new Date().getFullYear()} Butter Love</span>
          <span>Pago Móvil · USD · Binance</span>
          <span>Hecho con amor en Venezuela</span>
        </div>
      </div>
    </footer>
  );
}
