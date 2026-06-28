import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";

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
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const a = t.auth;

  const handleEmail = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(a.errorTitle, a.missingFields);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { needsConfirm } = await signUpWithEmail(email.trim(), password);
        if (needsConfirm) {
          Alert.alert(a.titleSignUp, a.checkEmail);
        }
      } else {
        await signInWithEmail(email.trim(), password);
      }
      onClose();
    } catch (e: unknown) {
      Alert.alert(a.errorTitle, e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [email, password, mode, signInWithEmail, signUpWithEmail, a, onClose]);

  const handleGoogle = useCallback(async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (e: unknown) {
      Alert.alert(a.errorTitle, e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [signInWithGoogle, a, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end"
        style={{ backgroundColor: colors.overlay }}
      >
        <Pressable className="flex-1" onPress={onClose} />
        <View className="rounded-t-3xl px-6 pt-5 pb-8" style={{ backgroundColor: colors.card }}>
          <View className="items-center mb-1">
            <View className="w-10 h-1 rounded-full mb-4" style={{ backgroundColor: colors.border }} />
            <Ionicons name="cloud-outline" size={30} color={colors.tint} />
            <Text className="text-xl font-bold mt-2" style={{ color: colors.text }}>
              {mode === "signin" ? a.titleSignIn : a.titleSignUp}
            </Text>
            <Text
              className="text-xs mt-1 text-center px-4"
              style={{ color: colors.textSecondary }}
            >
              {a.subtitle}
            </Text>
          </View>

          {/* Google */}
          <TouchableOpacity
            className="flex-row items-center justify-center gap-2 py-3.5 rounded-2xl border mt-5"
            style={{ borderColor: colors.border, backgroundColor: colors.settingRow }}
            onPress={handleGoogle}
            disabled={busy}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-google" size={18} color={colors.text} />
            <Text className="text-sm font-semibold" style={{ color: colors.text }}>
              {a.continueGoogle}
            </Text>
          </TouchableOpacity>

          {/* divider */}
          <View className="flex-row items-center gap-3 my-4">
            <View className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
            <Text className="text-xs" style={{ color: colors.textMuted }}>
              {a.or}
            </Text>
            <View className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
          </View>

          {/* email */}
          <TextInput
            className="h-12 rounded-2xl px-4 border mb-3"
            style={{ backgroundColor: colors.countBox, borderColor: colors.border, color: colors.text, textAlign: isRTL ? "right" : "left" }}
            placeholder={a.emailPlaceholder}
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            className="h-12 rounded-2xl px-4 border mb-4"
            style={{ backgroundColor: colors.countBox, borderColor: colors.border, color: colors.text, textAlign: isRTL ? "right" : "left" }}
            placeholder={a.passwordPlaceholder}
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            className="flex-row items-center justify-center py-3.5 rounded-2xl"
            style={{ backgroundColor: colors.tint, opacity: busy ? 0.7 : 1 }}
            onPress={handleEmail}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color={colors.addBtnText} />
            ) : (
              <Text className="text-sm font-bold" style={{ color: colors.addBtnText }}>
                {a.continueEmail}
              </Text>
            )}
          </TouchableOpacity>

          {/* switch mode */}
          <View className="flex-row justify-center items-center gap-1 mt-4">
            <Text className="text-xs" style={{ color: colors.textSecondary }}>
              {mode === "signin" ? a.noAccount : a.haveAccount}
            </Text>
            <TouchableOpacity onPress={() => setMode(mode === "signin" ? "signup" : "signin")}>
              <Text className="text-xs font-bold" style={{ color: colors.tint }}>
                {mode === "signin" ? a.switchSignUp : a.switchSignIn}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
