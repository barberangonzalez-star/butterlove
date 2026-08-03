"use client";

import { useActionState } from "react";
import { login, LoginState } from "./actions";
import InstallPrompt from "../_pwa/InstallPrompt";

const initialState: LoginState = {};

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fbfaf8] px-4">
      <div className="w-full max-w-sm">
        <form
          action={formAction}
          className="bg-white border border-black/10 rounded-lg p-8 shadow-sm"
        >
          <h1 className="text-lg font-semibold text-[#37352f] mb-1">
            Butter Love Admin
          </h1>
          <p className="text-sm text-[#787774] mb-6">
            Ingresa la contraseña para continuar.
          </p>

          <label className="block mb-4">
            <span className="text-xs font-medium text-[#787774] uppercase tracking-wide">
              Contraseña
            </span>
            <input
              type="password"
              name="password"
              required
              autoFocus
              className="mt-1 w-full rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#37352f]"
            />
          </label>

          {state?.error && (
            <p className="text-sm text-red-600 mb-4">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-[#37352f] text-white text-sm font-medium py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {pending ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <InstallPrompt className="mt-3" />
      </div>
    </div>
  );
}
