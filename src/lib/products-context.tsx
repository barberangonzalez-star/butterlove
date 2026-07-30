"use client";

import { createContext, useContext, ReactNode } from "react";
import type { Product } from "./products";

const ProductsContext = createContext<Product[] | null>(null);

export function ProductsProvider({
  products,
  children,
}: {
  products: Product[];
  children: ReactNode;
}) {
  return (
    <ProductsContext.Provider value={products}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used within ProductsProvider");
  return ctx;
}

export function useProductByKey(key: string) {
  const products = useProducts();
  return products.find((p) => p.key === key);
}
