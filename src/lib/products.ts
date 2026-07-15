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
    accentHex: "#F3B94D",
    badges: ["100% natural", "Hecho a mano", "Sin azúcar agregada"],
    sizes: [
      { grams: 230, price: 6 },
      { grams: 350, price: 8 },
    ],
  },
  {
    key: "pistacho",
    name: "Pistacho",
    tagline: "Para repostería con carácter",
    description:
      "Pistachos seleccionados, molidos hasta lograr un verde intenso y un sabor delicado. Ideal para untar o para tus postres favoritos.",
    image: "/products/pistacho.png",
    bgClass: "bg-pistacho-bg",
    accentHex: "#B7D96B",
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
    accentHex: "#F5A8C4",
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
    accentHex: "#A9DCE8",
    badges: ["100% natural", "Hecho a mano", "Sin azúcar agregada"],
    sizes: [
      { grams: 230, price: 10 },
      { grams: 350, price: 15 },
    ],
  },
];

export const getProduct = (key: FlavorKey) =>
  products.find((p) => p.key === key)!;
