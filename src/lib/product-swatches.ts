// Tailwind v4 (CSS-first) only generates a utility class for strings it finds
// in scanned source files. Product bg colors live in the database, so a class
// name saved only in a DB row would never be generated. Keeping the literal
// strings here — a source file Tailwind scans — guarantees these utilities
// exist, and the admin UI only lets you pick from this fixed set.
export interface ProductSwatch {
  bgClass: string;
  label: string;
  hex: string;
}

export const PRODUCT_SWATCHES: ProductSwatch[] = [
  { bgClass: "bg-mani-bg", label: "Maní", hex: "#F3B94D" },
  { bgClass: "bg-pistacho-bg", label: "Pistacho", hex: "#B7D96B" },
  { bgClass: "bg-almendras-bg", label: "Almendras", hex: "#F5A8C4" },
  { bgClass: "bg-merey-bg", label: "Merey", hex: "#A9DCE8" },
  { bgClass: "bg-neutro-a-bg", label: "Neutro A", hex: "#D8C9A8" },
  { bgClass: "bg-neutro-b-bg", label: "Neutro B", hex: "#C9B8D8" },
];

export const PRODUCT_SWATCH_CLASSES = PRODUCT_SWATCHES.map((s) => s.bgClass);
