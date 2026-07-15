"use client";

import { useCart } from "@/lib/cart-context";

export default function Navbar() {
  const { totalItems, openCart } = useCart();

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-cream/80 border-b border-ink/5">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 h-16 flex items-center justify-between">
        <a href="#top" className="font-display font-700 text-2xl tracking-tight">
          Butter<span className="text-mani-accent">Love</span>
        </a>
        <nav className="hidden md:flex items-center gap-8 font-body text-sm font-medium text-ink-soft">
          <a href="#productos" className="hover:text-ink transition-colors">
            Productos
          </a>
          <a href="#historia" className="hover:text-ink transition-colors">
            Nuestra historia
          </a>
          <a href="#pedido" className="hover:text-ink transition-colors">
            Cómo pedir
          </a>
        </nav>
        <button
          onClick={openCart}
          aria-label="Abrir carrito"
          className="relative flex items-center justify-center w-11 h-11 rounded-full bg-ink text-cream hover:bg-mani-accent transition-colors"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-mani-accent text-cream text-[11px] font-bold flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
