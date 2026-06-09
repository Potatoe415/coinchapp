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

/** Current user id from the cookie session, or null. */
export async function getUserId(): Promise<string | null> {
  const supabase = await getUserClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
