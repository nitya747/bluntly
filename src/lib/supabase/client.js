import { createBrowserClient } from '@supabase/ssr';

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
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
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

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isUrlValid(url) || !key || key.includes('_here')) {
    return dummyClient;
  }

  return createBrowserClient(url, key);
}
