export default function Footer() {
  return (
    <footer className="bg-ink text-cream/80 mt-auto">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-12 grid sm:grid-cols-3 gap-8">
        <div>
          <p className="font-display font-700 text-2xl text-cream mb-2">
            Butter<span className="text-mani-bg">Love</span>
          </p>
          <p className="text-sm max-w-xs">
            Mantequillas artesanales de maní y frutos secos, hechas a mano en
            Venezuela. 100% naturales, sin azúcar agregada.
          </p>
        </div>
        <div>
          <p className="text-cream font-semibold mb-3 text-sm">Navegación</p>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="#productos" className="hover:text-cream">
                Productos
              </a>
            </li>
            <li>
              <a href="#historia" className="hover:text-cream">
                Nuestra historia
              </a>
            </li>
            <li>
              <a href="#pedido" className="hover:text-cream">
                Cómo pedir
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-cream font-semibold mb-3 text-sm">
            Métodos de pago
          </p>
          <p className="text-sm">Pago Móvil · USD · Binance</p>
        </div>
      </div>
      <div className="border-t border-cream/10 px-5 sm:px-8 py-5 text-xs text-cream/50">
        © {new Date().getFullYear()} Butter Love. Hecho con amor en Venezuela.
      </div>
    </footer>
  );
}
