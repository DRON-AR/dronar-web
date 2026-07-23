import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/dashboard/Navbar";
import { HeroWelcome } from "@/components/dashboard/HeroWelcome";
import { ShellCard } from "@/components/dashboard/ShellCard";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  JEFE_PILOTOS: "Jefe de Pilotos",
  INSTRUCTOR: "Instructor",
  PILOTO: "Piloto",
  ALUMNO: "Alumno",
};

interface ProfileRow {
  full_name: string;
  license_number: string | null;
  roles: { name: string } | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, license_number, roles ( name )")
    .eq("id", user.id)
    .single<ProfileRow>();

  const fullName = profile?.full_name ?? user.email ?? "Piloto";
  const roleLabel = profile?.roles?.name
    ? (ROLE_LABELS[profile.roles.name] ?? profile.roles.name)
    : "Rol no asignado — contacta a un administrador";

  return (
    <div className="min-h-screen bg-aero-950">
      <Navbar userName={fullName} />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <HeroWelcome fullName={fullName} roleLabel={roleLabel} />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <ShellCard label="Cursos" value="Próximamente" pending />
          <ShellCard label="Misiones" value="Próximamente" pending />
          <ShellCard label="Licencia" value={profile?.license_number ?? "No registrada"} />
        </div>
      </main>
    </div>
  );
}
