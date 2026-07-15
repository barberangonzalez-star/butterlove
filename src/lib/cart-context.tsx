"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { FlavorKey, getProduct } from "./products";

export interface CartItem {
  key: FlavorKey;
  grams: 230 | 350;
  price: number;
  qty: number;
}

interface CartContextValue {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (key: FlavorKey, grams: 230 | 350, price: number) => void;
  removeItem: (key: FlavorKey, grams: 230 | 350) => void;
  updateQty: (key: FlavorKey, grams: 230 | 350, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "butterlove-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Reading localStorage after mount avoids SSR/client hydration mismatches.
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage, not a render loop
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem: CartContextValue["addItem"] = (key, grams, price) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.key === key && i.grams === grams);
      if (existing) {
        return prev.map((i) =>
          i.key === key && i.grams === grams ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { key, grams, price, qty: 1 }];
    });
    setIsOpen(true);
  };

  const removeItem: CartContextValue["removeItem"] = (key, grams) => {
    setItems((prev) => prev.filter((i) => !(i.key === key && i.grams === grams)));
  };

  const updateQty: CartContextValue["updateQty"] = (key, grams, qty) => {
    if (qty <= 0) {
      removeItem(key, grams);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.key === key && i.grams === grams ? { ...i, qty } : i))
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = useMemo(
    () => items.reduce((sum, i) => sum + i.qty, 0),
    [items]
  );
  const totalPrice = useMemo(
    () => items.reduce((sum, i) => sum + i.qty * i.price, 0),
    [items]
  );

  const value: CartContextValue = {
    items,
    isOpen,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    addItem,
    removeItem,
    updateQty,
    clearCart,
    totalItems,
    totalPrice,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export function itemLabel(key: FlavorKey) {
  return getProduct(key).name;
}
