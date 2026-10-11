type AuthResponse = {
  data: { session: null; user: null };
  error: null;
};

export function createMockSupabaseClient() {
  return {
    auth: {
      getSession: async () =>
        ({ data: { session: null }, error: null }) as AuthResponse,
      getUser: async () =>
        ({ data: { user: null }, error: null }) as AuthResponse,
      signInWithPassword: async () =>
        ({ data: { session: null, user: null }, error: null }) as AuthResponse,
      signInAnonymously: async () =>
        ({ data: { session: null, user: null }, error: null }) as AuthResponse,
      signOut: async () => ({ error: null }),
    },
  };
}
