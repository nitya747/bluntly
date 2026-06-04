import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const isUrlValid = (url) => {
  return url && (url.startsWith('http://') || url.startsWith('https://'));
};

const dummyClient = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: async () => ({ data: {}, error: new Error('Supabase URL/Key not configured. Please update .env.local') }),
    signUp: async () => ({ data: {}, error: new Error('Supabase URL/Key not configured. Please update .env.local') }),
    signOut: async () => ({ error: null }),
    exchangeCodeForSession: async () => ({ data: {}, error: null }),
  },
  from: () => ({
    select: () => ({
      order: () => Promise.resolve({ data: [], error: null }),
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
    insert: () => ({
      select: () => ({
        single: () => Promise.resolve({ data: { id: 'dummy-id', created_at: new Date().toISOString() }, error: null }),
      }),
    }),
    delete: () => Promise.resolve({ error: null }),
  }),
};

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isUrlValid(url) || !key || key.includes('_here')) {
    return dummyClient;
  }

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // The `setAll` method can be called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
