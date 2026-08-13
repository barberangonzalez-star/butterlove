"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/admin-session";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductInput,
} from "@/lib/products-data";

function parseProductForm(formData: FormData): ProductInput {
  const grams = formData.getAll("grams").map(Number);
  const prices = formData.getAll("price").map(Number);
  const sizes = grams
    .map((g, i) => ({ grams: g, price: prices[i] }))
    .filter((s) => s.grams > 0 && s.price >= 0);

  const badges = String(formData.get("badges") ?? "")
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);

  return {
    key: String(formData.get("key") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    kind: formData.get("kind") === "combo" ? "combo" : "single",
    tagline: String(formData.get("tagline") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    image: String(formData.get("image") ?? "").trim(),
    heroImage: String(formData.get("heroImage") ?? "").trim(),
    bgClass: String(formData.get("bgClass") ?? "").trim(),
    accentHex: String(formData.get("accentHex") ?? "").trim(),
    badges,
    // Un checkbox sin marcar no viaja en el FormData, así que la ausencia del
    // campo es "no va en la tienda".
    inStore: formData.get("inStore") === "on",
    sortOrder: Number(formData.get("sortOrder") ?? 0),
    sizes,
  };
}

function revalidateCatalog() {
  revalidatePath("/", "layout");
  revalidatePath("/admin/productos");
}

export async function saveProductAction(formData: FormData) {
  await verifySession();
  const input = parseProductForm(formData);
  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : null;

  if (id) {
    await updateProduct(id, input);
  } else {
    await createProduct(input);
  }
  revalidateCatalog();
}

export async function deleteProductAction(id: number) {
  await verifySession();
  await deleteProduct(id);
  revalidateCatalog();
}
