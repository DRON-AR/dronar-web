"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login, type LoginState } from "@/app/login/actions";

const initialState: LoginState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 w-full rounded-xl bg-signal px-4 py-2.5 font-medium text-aero-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Verificando…" : "Ingresar"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(login, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="block text-xs uppercase tracking-widest text-mist/50">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-aero-700/60 bg-aero-950/60 px-3 py-2 font-mono text-sm text-mist outline-none transition focus:border-signal"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-xs uppercase tracking-widest text-mist/50">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-aero-700/60 bg-aero-950/60 px-3 py-2 font-mono text-sm text-mist outline-none transition focus:border-signal"
        />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-nogo">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
