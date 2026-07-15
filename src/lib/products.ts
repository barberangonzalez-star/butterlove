export type FlavorKey = "mani" | "pistacho" | "almendras" | "merey";

export interface SizeOption {
  grams: 230 | 350;
  price: number;
}

export interface Product {
  key: FlavorKey;
  name: string;
  tagline: string;
  description: string;
  image: string;
  bgClass: string;
  accentClass: string;
  accentHex: string;
  badges: string[];
  sizes: SizeOption[];
}

export const products: Product[] = [
  {
    key: "mani",
    name: "Maní",
    tagline: "La clásica que no falla",
    description:
      "Maní tostado y molido despacio hasta lograr una textura cremosa. La receta original de Butter Love: solo maní, nada más.",
    image: "/products/mani.png",
    bgClass: "bg-mani-bg",
    accentClass: "text-mani-accent",
    accentHex: "#C2542C",
    badges: ["100% natural", "Hecho a mano", "Sin azúcar agregada"],
    sizes: [
      { grams: 230, price: 6 },
      { grams: 350, price: 8 },
    ],
  },
  {
    key: "pistacho",
    name: "Pistacho",
    tagline: "Para reposteria con carácter",
    description:
      "Pistachos seleccionados, molidos hasta lograr un verde intenso y un sabor delicado. Ideal para untar o para tus postres favoritos.",
    image: "/products/pistacho.png",
    bgClass: "bg-pistacho-bg",
    accentClass: "text-pistacho-accent",
    accentHex: "#6B8E3D",
    badges: ["100% natural", "Hecho a mano", "Sin azúcar agregada"],
    sizes: [
      { grams: 230, price: 20 },
      { grams: 350, price: 32 },
    ],
  },
  {
    key: "almendras",
    name: "Almendras",
    tagline: "Bienestar en cada cucharada",
    description:
      "Almendras molidas lentamente para conservar sus nutrientes. Aliada de tu piel y tu energía diaria.",
    image: "/products/almendras.png",
    bgClass: "bg-almendras-bg",
    accentClass: "text-almendras-accent",
    accentHex: "#7E5AA8",
    badges: ["100% natural", "Hecho a mano", "Sin azúcar agregada"],
    sizes: [
      { grams: 230, price: 10 },
      { grams: 350, price: 15 },
    ],
  },
  {
    key: "merey",
    name: "Merey",
    tagline: "Cremosidad venezolana",
    description:
      "Merey (cashew) 100% venezolano, molido hasta una crema suave y ligeramente dulce de forma natural.",
    image: "/products/merey.png",
    bgClass: "bg-merey-bg",
    accentClass: "text-merey-accent",
    accentHex: "#1F8FA3",
    badges: ["100% natural", "Hecho a mano", "Sin azúcar agregada"],
    sizes: [
      { grams: 230, price: 10 },
      { grams: 350, price: 15 },
    ],
  },
];

export const getProduct = (key: FlavorKey) =>
  products.find((p) => p.key === key)!;
