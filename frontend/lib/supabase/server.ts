import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

/**
 * Cliente de Supabase para Server Components / Server Actions / Route
 * Handlers. Lee/escribe la sesión vía cookies de Next.js. El intento de
 * `set` puede fallar si se llama desde un Server Component puro (las
 * cookies son de solo lectura ahí) — se ignora a propósito, porque
 * `middleware.ts` ya se encarga de refrescar la sesión en cada request.
 *
 * `cookies()` es async desde Next.js 15+ (dejó de serlo en Next 14) —
 * por eso esta función también es async; todos los callers deben usar
 * `await createClient()`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ver comentario arriba: esperado desde un Server Component puro.
          }
        },
      },
    }
  );
}
