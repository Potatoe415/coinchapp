import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** User-scoped client (reads the caller's session from cookies). */
export async function getUserClient() {
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component without a mutable cookie store.
        }
      },
    },
  });
}

/** Service-role client: the game authority. Bypasses RLS. Server-only. */
export function getServiceClient() {
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Current user id from the cookie session, or null. Uses `getClaims()`
 * instead of `getUser()`: both verify the JWT, but `getClaims()` does so
 * locally (no network round trip) whenever the project uses asymmetric
 * signing keys, falling back to the same server call `getUser()` always
 * makes otherwise. This runs on every server action and every `getView`
 * poll/refetch, so the difference is worth the deprecated-elsewhere pattern
 * (see docs/DECISIONS.md for the latency/security tradeoff this accepts).
 *
 * `getClaims()` can throw outright (e.g. a JWKS fetch failure) instead of
 * returning `{ error }` like the rest of the auth API - that would otherwise
 * take down the whole Server Component render. Falls back to the
 * always-safe `getUser()` so a transient verification hiccup degrades to a
 * slower call instead of a hard crash.
 */
export async function getUserId(): Promise<string | null> {
  const supabase = await getUserClient();
  try {
    const { data } = await supabase.auth.getClaims();
    return data?.claims.sub ?? null;
  } catch {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  }
}
