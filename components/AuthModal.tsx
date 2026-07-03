import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";

type Mode = "signin" | "signup" | "forgot";

export function AuthModal({
  visible,
  initialMode = "signin",
  onClose,
}: {
  visible: boolean;
  initialMode?: "signin" | "signup";
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword } =
    useAuth();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const a = t.auth;

  // Keep the modal in sync with which button opened it.
  useEffect(() => {
    if (visible) setMode(initialMode);
  }, [visible, initialMode]);

  const title =
    mode === "signin" ? a.titleSignIn : mode === "signup" ? a.titleSignUp : a.titleForgot;
  const subtitle =
    mode === "signin"
      ? a.subtitleSignIn
      : mode === "signup"
        ? a.subtitleSignUp
        : a.subtitleForgot;

  const fail = useCallback(
    (msg: string) => Alert.alert(a.errorTitle, msg),
    [a.errorTitle],
  );

  const handleSubmit = useCallback(async () => {
    const mail = email.trim();
    if (mode === "forgot") {
      if (!mail) return fail(a.missingEmail);
      setBusy(true);
      try {
        await resetPassword(mail);
        Alert.alert(a.resetSentTitle, a.resetSentMsg);
        setMode("signin");
      } catch (e: unknown) {
        fail(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!mail || !password.trim()) return fail(a.missingFields);
    if (mode === "signup") {
      if (password.length < 6) return fail(a.passwordTooShort);
      if (password !== confirm) return fail(a.passwordMismatch);
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { needsConfirm, alreadyRegistered } = await signUpWithEmail(
          mail,
          password,
          name.trim() || undefined,
        );
        if (alreadyRegistered) {
          // Existing account — send the user to sign in (email kept filled).
          Alert.alert(a.alreadyRegisteredTitle, a.alreadyRegisteredMsg);
          setPassword("");
          setConfirm("");
          setMode("signin");
          return;
        }
        if (needsConfirm) {
          Alert.alert(a.titleSignUp, a.checkEmail);
        }
      } else {
        await signInWithEmail(mail, password);
      }
      onClose();
    } catch (e: unknown) {
      fail(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [mode, email, password, confirm, name, a, fail, resetPassword, signUpWithEmail, signInWithEmail, onClose]);

  const handleGoogle = useCallback(async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (e: unknown) {
      fail(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [signInWithGoogle, onClose, fail]);

  const inputStyle = {
    backgroundColor: colors.countBox,
    borderColor: colors.border,
    color: colors.text,
    textAlign: (isRTL ? "right" : "left") as "right" | "left",
  };

  const submitLabel =
    mode === "signin" ? a.signInAction : mode === "signup" ? a.signUpAction : a.sendReset;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end"
        style={{ backgroundColor: colors.overlay }}
      >
        <Pressable className="flex-1" onPress={onClose} />
        <View className="rounded-t-3xl px-6 pt-4 pb-8" style={{ backgroundColor: colors.card, maxHeight: "92%" }}>
          <View className="items-center mb-1">
            <View className="w-10 h-1 rounded-full mb-4" style={{ backgroundColor: colors.border }} />
            <View
              className="w-12 h-12 rounded-2xl items-center justify-center mb-2"
              style={{ backgroundColor: colors.totalBadgeBg }}
            >
              <Ionicons
                name={mode === "forgot" ? "lock-closed-outline" : mode === "signup" ? "person-add-outline" : "cloud-outline"}
                size={24}
                color={colors.tint}
              />
            </View>
            <Text className="text-xl font-bold" style={{ color: colors.text }}>
              {title}
            </Text>
            <Text className="text-xs mt-1 text-center px-4" style={{ color: colors.textSecondary }}>
              {subtitle}
            </Text>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Google (not on the forgot screen) */}
            {mode !== "forgot" && (
              <>
                <TouchableOpacity
                  className="flex-row items-center justify-center gap-2 py-3.5 rounded-2xl border mt-4"
                  style={{ borderColor: colors.border, backgroundColor: colors.settingRow, flexDirection: isRTL ? "row-reverse" : "row" }}
                  onPress={handleGoogle}
                  disabled={busy}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-google" size={18} color={colors.text} />
                  <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                    {a.continueGoogle}
                  </Text>
                </TouchableOpacity>

                <View className="flex-row items-center gap-3 my-4">
                  <View className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
                  <Text className="text-xs" style={{ color: colors.textMuted }}>{a.or}</Text>
                  <View className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
                </View>
              </>
            )}

            {/* Name (sign-up only) */}
            {mode === "signup" && (
              <TextInput
                className="h-12 rounded-2xl px-4 border mb-3"
                style={inputStyle}
                placeholder={a.namePlaceholder}
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            )}

            {/* Email */}
            <TextInput
              className="h-12 rounded-2xl px-4 border mb-3"
              style={inputStyle}
              placeholder={a.emailPlaceholder}
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Password (not on forgot) */}
            {mode !== "forgot" && (
              <TextInput
                className="h-12 rounded-2xl px-4 border mb-3"
                style={inputStyle}
                placeholder={a.passwordPlaceholder}
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            )}

            {/* Confirm password (sign-up only) */}
            {mode === "signup" && (
              <>
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
                <Text className="text-[11px] mb-2 px-1" style={{ color: colors.textMuted, textAlign: isRTL ? "right" : "left" }}>
                  {a.passwordHint}
                </Text>
              </>
            )}

            {/* Forgot link (sign-in only) */}
            {mode === "signin" && (
              <TouchableOpacity onPress={() => setMode("forgot")} className="self-end mb-3">
                <Text className="text-xs font-semibold" style={{ color: colors.tint }}>
                  {a.forgotPassword}
                </Text>
              </TouchableOpacity>
            )}

            {/* Submit */}
            <TouchableOpacity
              className="flex-row items-center justify-center py-3.5 rounded-2xl mt-1"
              style={{ backgroundColor: colors.tint, opacity: busy ? 0.7 : 1 }}
              onPress={handleSubmit}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color={colors.addBtnText} />
              ) : (
                <Text className="text-sm font-bold" style={{ color: colors.addBtnText }}>
                  {submitLabel}
                </Text>
              )}
            </TouchableOpacity>

            {/* Footer switchers */}
            {mode === "forgot" ? (
              <TouchableOpacity onPress={() => setMode("signin")} className="items-center mt-4">
                <Text className="text-xs font-bold" style={{ color: colors.tint }}>
                  {a.backToSignIn}
                </Text>
              </TouchableOpacity>
            ) : (
              <View
                className="flex-row justify-center items-center gap-1 mt-4"
                style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
              >
                <Text className="text-xs" style={{ color: colors.textSecondary }}>
                  {mode === "signin" ? a.noAccount : a.haveAccount}
                </Text>
                <TouchableOpacity onPress={() => setMode(mode === "signin" ? "signup" : "signin")}>
                  <Text className="text-xs font-bold" style={{ color: colors.tint }}>
                    {mode === "signin" ? a.switchSignUp : a.switchSignIn}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
