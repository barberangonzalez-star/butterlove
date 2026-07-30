"use server";

import { timingSafeEqual } from "crypto";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/admin-session";

export interface LoginState {
  error?: string;
}

function passwordsMatch(input: string, expected: string) {
  const inputBuf = Buffer.from(input);
  const expectedBuf = Buffer.from(expected);
  if (inputBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(inputBuf, expectedBuf);
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || !passwordsMatch(password, expected)) {
    return { error: "Contraseña incorrecta." };
  }

  await createSession();
  redirect("/admin");
}
