import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// HYBRID FIX: Storage compartido para auto-refresh coordinado entre tabs
// Cache check en auth-context.tsx previene eventos spurious
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    detectSessionInUrl: false,
    persistSession: true,
    // Storage por defecto (localStorage) para sincronización multi-tab
  },
});
