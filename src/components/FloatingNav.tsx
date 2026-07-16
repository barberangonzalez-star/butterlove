export default function FloatingNav() {
  const links = [
    { href: "/#productos", label: "Productos" },
    { href: "/#historia", label: "Historia" },
    { href: "/#pedido", label: "Cómo pedir" },
    { href: "/blog", label: "Blog" },
  ];

  return (
    <nav
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur shadow-lg rounded-full px-2 py-2 flex items-center gap-1"
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
