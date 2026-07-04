import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { supabase } from "../../services/supabase";

/**
 * OAuth landing route (yaqeen://auth/callback?code=…).
 * The in-app browser flow usually completes the code exchange already;
 * this route makes sure the session exists either way, then drops the
 * user straight back into the app — no "Unmatched Route" screen.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { colors } = useTheme();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    (async () => {
      if (typeof code === "string" && code.length > 0) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          // Exchanging an already-used code just errors — safe to ignore.
          await supabase.auth.exchangeCodeForSession(code).catch(() => {});
        }
      }
      router.replace("/(tabs)");
    })();
  }, [code, router]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator size="large" color={colors.tint} />
    </View>
  );
}
