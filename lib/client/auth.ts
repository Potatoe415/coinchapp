"use client";

import { createClient } from "@/lib/supabase/client";

/** Ensure the browser has an (anonymous) Supabase session before acting. */
export async function ensureAnonAuth() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  }
}
