import { createBrowserClient } from "@supabase/ssr";

/** Browser Supabase client. Stores the (anonymous) session in cookies so
 *  Server Actions can read the user id. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
