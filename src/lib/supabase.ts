import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

let _supabase: SupabaseClient | null = null;

if (isValidUrl(supabaseUrl) && supabaseAnonKey.length > 20) {
  _supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = _supabase;
