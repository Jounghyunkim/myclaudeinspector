// Client-safe connection values. The publishable key may ship to the browser:
// tables are guarded by RLS and only intended RPCs are callable.
// NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY override these defaults.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://earzkbjauzdcanicadlf.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_3f7sT4lRCJmHFbBdQjP9JQ_NkmseWZD";
