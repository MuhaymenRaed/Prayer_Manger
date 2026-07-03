import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import { supabase } from "../../services/supabase";

type Phase = "verifying" | "form" | "done" | "invalid";

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    token_hash?: string;
    type?: string;
  }>();
  const url = Linking.useURL();

  const [phase, setPhase] = useState<Phase>("verifying");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const handled = useRef(false);

  const a = t.auth;

  // Establish the recovery session from the deep-link code / token.
  useEffect(() => {
    if (handled.current) return;

    let code = typeof params.code === "string" ? params.code : undefined;
    let tokenHash = typeof params.token_hash === "string" ? params.token_hash : undefined;
    let type = typeof params.type === "string" ? params.type : undefined;

    if (!code && !tokenHash && url) {
      const q = Linking.parse(url).queryParams ?? {};
      code = (q.code as string) ?? code;
      tokenHash = (q.token_hash as string) ?? tokenHash;
      type = (q.type as string) ?? type;
    }

    if (!code && !tokenHash) return; // wait for params/url to arrive

    handled.current = true;
    (async () => {
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: (type as "recovery") ?? "recovery",
          });
          if (error) throw error;
        }
        setPhase("form");
      } catch {
        setPhase("invalid");
      }
    })();
  }, [params, url]);

  // Fallback: if no valid link arrives shortly, show the invalid state.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!handled.current) setPhase("invalid");
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const goHome = useCallback(() => router.replace("/(tabs)"), [router]);

  const handleUpdate = useCallback(async () => {
    if (password.length < 6) {
      Alert.alert(a.errorTitle, a.passwordTooShort);
      return;
    }
    if (password !== confirm) {
      Alert.alert(a.errorTitle, a.passwordMismatch);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPhase("done");
    } catch (e: unknown) {
      Alert.alert(a.errorTitle, e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [password, confirm, a]);

  const inputStyle = {
    backgroundColor: colors.countBox,
    borderColor: colors.border,
    color: colors.text,
    textAlign: (isRTL ? "right" : "left") as "right" | "left",
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-center px-7"
      >
        {/* ── Verifying ─────────────────────────────────────────── */}
        {phase === "verifying" && (
          <View className="items-center gap-4">
            <ActivityIndicator size="large" color={colors.tint} />
            <Text className="text-sm" style={{ color: colors.textSecondary }}>
              {a.verifyingLink}
            </Text>
          </View>
        )}

        {/* ── Invalid / expired ─────────────────────────────────── */}
        {phase === "invalid" && (
          <View className="items-center gap-3">
            <View
              className="w-16 h-16 rounded-3xl items-center justify-center mb-1"
              style={{ backgroundColor: colors.dangerBg }}
            >
              <Ionicons name="alert-circle-outline" size={32} color={colors.dangerText} />
            </View>
            <Text className="text-xl font-bold text-center" style={{ color: colors.text }}>
              {a.invalidLinkTitle}
            </Text>
            <Text className="text-sm text-center leading-6" style={{ color: colors.textSecondary }}>
              {a.invalidLinkMsg}
            </Text>
            <TouchableOpacity
              className="mt-4 px-6 py-3.5 rounded-2xl"
              style={{ backgroundColor: colors.tint }}
              onPress={goHome}
              activeOpacity={0.85}
            >
              <Text className="text-sm font-bold" style={{ color: colors.addBtnText }}>
                {a.continueAction}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── New-password form ─────────────────────────────────── */}
        {phase === "form" && (
          <View>
            <View className="items-center mb-6">
              <View
                className="w-16 h-16 rounded-3xl items-center justify-center mb-3"
                style={{ backgroundColor: colors.totalBadgeBg }}
              >
                <Ionicons name="lock-open-outline" size={30} color={colors.tint} />
              </View>
              <Text className="text-2xl font-bold text-center" style={{ color: colors.text }}>
                {a.resetScreenTitle}
              </Text>
              <Text className="text-sm text-center mt-1.5 leading-6" style={{ color: colors.textSecondary }}>
                {a.resetScreenSubtitle}
              </Text>
            </View>

            <TextInput
              className="h-12 rounded-2xl px-4 border mb-3"
              style={inputStyle}
              placeholder={a.newPasswordPlaceholder}
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoFocus
            />
            <TextInput
              className="h-12 rounded-2xl px-4 border mb-2"
              style={inputStyle}
              placeholder={a.confirmPlaceholder}
              placeholderTextColor={colors.textMuted}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoCapitalize="none"
            />
            <Text
              className="text-[11px] mb-5 px-1"
              style={{ color: colors.textMuted, textAlign: isRTL ? "right" : "left" }}
            >
              {a.passwordHint}
            </Text>

            <TouchableOpacity
              className="flex-row items-center justify-center py-3.5 rounded-2xl"
              style={{ backgroundColor: colors.tint, opacity: busy ? 0.7 : 1 }}
              onPress={handleUpdate}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color={colors.addBtnText} />
              ) : (
                <Text className="text-sm font-bold" style={{ color: colors.addBtnText }}>
                  {a.updatePassword}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Success ───────────────────────────────────────────── */}
        {phase === "done" && (
          <View className="items-center gap-3">
            <View
              className="w-16 h-16 rounded-3xl items-center justify-center mb-1"
              style={{ backgroundColor: colors.successBg }}
            >
              <Ionicons name="checkmark-circle" size={34} color={colors.success} />
            </View>
            <Text className="text-xl font-bold text-center" style={{ color: colors.text }}>
              {a.resetDoneTitle}
            </Text>
            <Text className="text-sm text-center leading-6" style={{ color: colors.textSecondary }}>
              {a.resetDoneMsg}
            </Text>
            <TouchableOpacity
              className="mt-4 px-8 py-3.5 rounded-2xl"
              style={{ backgroundColor: colors.tint }}
              onPress={goHome}
              activeOpacity={0.85}
            >
              <Text className="text-sm font-bold" style={{ color: colors.addBtnText }}>
                {a.continueAction}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
