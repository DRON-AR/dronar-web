import { LogOut } from "lucide-react";
import { logout } from "@/app/dashboard/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="flex items-center gap-1.5 text-sm text-mist/70 transition hover:text-signal"
      >
        <LogOut size={14} />
        Salir
      </button>
    </form>
  );
}
