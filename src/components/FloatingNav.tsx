"use client";

import { usePathname } from "next/navigation";

export default function FloatingNav() {
  const pathname = usePathname();
  // En la ficha de un producto, el borde de abajo del teléfono es de la barra
  // de compra: dos cosas flotando en el mismo sitio se tapan entre ellas, y de
  // las dos la que importa es la que vende. En pantalla ancha no hay barra —la
  // columna de compra va pegada al scroll— así que ahí sigue estando.
  const onProductPage = pathname.startsWith("/productos/");

  const links = [
    { href: "/#productos", label: "Productos" },
    { href: "/#historia", label: "Historia" },
    { href: "/#pedido", label: "Cómo pedir" },
    { href: "/blog", label: "Blog" },
  ];

  return (
    <nav
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-surface/95 backdrop-blur shadow-lg rounded-full px-2 py-2 items-center gap-1 ${
        onProductPage ? "hidden lg:flex" : "flex"
      }`}
      aria-label="Navegación principal"
    >
      {links.map((l) => (
        <a
          key={l.href}
          href={l.href}
          className="px-4 py-2 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wide text-ink-soft hover:bg-ink hover:text-cream transition-colors"
        >
          {l.label}
        </a>
      ))}
    </nav>
  );
}
