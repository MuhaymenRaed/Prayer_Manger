import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** True only when both env vars are present — lets the UI degrade gracefully. */
export const isSupabaseConfigured =
  !!supabaseUrl && !!supabaseAnonKey;

if (!isSupabaseConfigured) {
  // Not throwing: the app still runs fully offline without auth configured.
  console.warn(
    "[supabase] EXPO_PUBLIC_SUPABASE_URL / ANON_KEY missing — auth & sync disabled.",
  );
}

export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
