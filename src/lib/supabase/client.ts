import { createBrowserClient } from '@supabase/ssr'

// Note: NEXT_PUBLIC_* vars are inlined at build time for client code
// Server-side env validation is in lib/env.ts
export const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
