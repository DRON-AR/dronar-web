import { LoginForm } from "@/components/auth/LoginForm";
import { AttitudeHorizon } from "@/components/dashboard/AttitudeHorizon";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-aero-950 px-6">
      <div className="absolute inset-0 opacity-30">
        <AttitudeHorizon />
      </div>

      <div className="relative w-full max-w-sm rounded-3xl border border-aero-700/40 bg-aero-900/60 p-8 backdrop-blur-xl">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-signal">
          Camper Aeronautical
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-mist">DRONAR</h1>
        <p className="mt-1 text-sm text-mist/60">Ingresa con tu cuenta para continuar.</p>
        <LoginForm />
      </div>
    </div>
  );
}
