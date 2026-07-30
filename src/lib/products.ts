export type FlavorKey = string;

export interface SizeOption {
  grams: number;
  price: number;
}

export interface Product {
  key: FlavorKey;
  name: string;
  tagline: string;
  description: string;
  image: string;
  heroImage: string;
  bgClass: string;
  accentHex: string;
  badges: string[];
  sizes: SizeOption[];
}
