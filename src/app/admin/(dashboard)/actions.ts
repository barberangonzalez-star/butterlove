"use server";

import { redirect } from "next/navigation";
import { deleteSession } from "@/lib/admin-session";

export async function logout() {
  await deleteSession();
  redirect("/admin/login");
}
