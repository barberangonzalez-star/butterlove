"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";

export default function Navbar() {
  const { totalItems, openCart } = useCart();

  return (
    <header className="relative z-40">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 h-16 flex items-center justify-between">
        <a
          href="https://www.instagram.com/butterlove.ag/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram de Butter Love"
          className="w-9 h-9 rounded-full border border-ink/30 flex items-center justify-center text-ink hover:bg-ink hover:text-cream transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
          </svg>
        </a>

        <Link href="/" aria-label="Ir al inicio">
          <Image
            src="/logo-navbar.png"
            alt="Butter's Love"
            width={1808}
            height={500}
            priority
            className="h-9 sm:h-12 w-auto"
          />
        </Link>

        <button
          onClick={openCart}
          className="relative rounded-full bg-white border border-ink/20 px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold uppercase tracking-wide text-ink hover:bg-ink hover:text-cream transition-colors"
        >
          Mi pedido
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full bg-almendras-bg text-ink text-[11px] font-bold flex items-center justify-center border border-ink/10">
              {totalItems}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
