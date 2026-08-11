import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to get an admin client (service role) for server-side operations
// Since NextAuth will use this to find users securely, we need an admin client.
export const getAdminClient = () => {
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!adminKey && process.env.NODE_ENV !== 'production') {
    console.warn("SUPABASE_SERVICE_ROLE_KEY is not defined. Falling back to anon key.");
  }
  return createClient(
    supabaseUrl,
    adminKey || supabaseKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};
