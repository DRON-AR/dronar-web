import { LogoutButton } from "./LogoutButton";

export function Navbar({ userName }: { userName: string }) {
  return (
    <header className="border-b border-aero-700/40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="font-display text-lg tracking-wide text-mist">DRONAR</span>
        <nav className="flex items-center gap-6 text-sm">
          <span className="cursor-not-allowed text-mist/40" title="Próximamente">
            Cursos
          </span>
          <span className="cursor-not-allowed text-mist/40" title="Próximamente">
            Misiones
          </span>
          <span className="font-mono text-mist/60">{userName}</span>
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
