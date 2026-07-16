import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import type { User } from "@supabase/supabase-js";
import React, { useCallback, useEffect, useState } from "react";
import {
  Linking,
  Modal,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import { useDialog } from "../../components/AppDialog";
import { AuthModal } from "../../components/AuthModal";
import { YaqeenLogoBox } from "../../components/YaqeenLogo";
import {
  ATHAN_SOUNDS,
  AthanSoundOption,
  HAS_ATHAN_AUDIO,
} from "../../constants/athan";
import {
  getLocationById,
  groupedLocations,
} from "../../constants/locations";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useSettings } from "../../contexts/SettingsContext";
import { useTheme } from "../../contexts/ThemeContext";
import { dismissPinnedTimes } from "../../services/notificationService";
import { saveLocation } from "../../services/storageService";
import { SavedLocation } from "../../types/prayer";

const DEFAULT_LAT = 31.9928;
const DEFAULT_LON = 44.3357;

type Colors = ReturnType<typeof useTheme>["colors"];

// â”€â”€â”€ Section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Section({
  icon,
  title,
  children,
  colors,
  isRTL = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  children: React.ReactNode;
  colors: Colors;
  isRTL?: boolean;
}) {
  return (
    <View
      className="rounded-2xl overflow-hidden border mb-4"
      style={{ borderColor: colors.border }}
    >
      <View
        className="flex-row items-center gap-2 px-5 py-3 border-b"
        style={{
          backgroundColor: colors.sectionHeader,
          borderBottomColor: colors.separator,
          flexDirection: isRTL ? "row-reverse" : "row",
        }}
      >
        <Ionicons name={icon} size={16} color={colors.tint} />
        <Text className="text-sm font-semibold" style={{ color: colors.text }}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

// â”€â”€â”€ Toggle Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ToggleRow({
  label,
  description,
  value,
  onToggle,
  colors,
  isRTL = false,
  isLast = false,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  colors: Colors;
  isRTL?: boolean;
  isLast?: boolean;
}) {
  return (
    <View
      className="flex-row items-center justify-between px-5 py-4"
      style={[
        {
          backgroundColor: colors.settingRow,
          flexDirection: isRTL ? "row-reverse" : "row",
        },
        !isLast && {
          borderBottomWidth: 0.5,
          borderBottomColor: colors.separator,
        },
      ]}
    >
      <View
        className="flex-1 mr-3"
        style={{ alignItems: isRTL ? "flex-end" : "flex-start" }}
      >
        <Text
          className="text-sm font-medium mb-0.5"
          style={{ color: colors.text }}
        >
          {label}
        </Text>
        <Text className="text-xs" style={{ color: colors.textSecondary }}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.switchActive + "66" }}
        thumbColor={value ? colors.switchActive : colors.textMuted}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

// â”€â”€â”€ Action Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ActionRow({
  label,
  description,
  actionLabel,
  onPress,
  colors,
  isRTL = false,
  isLast = false,
}: {
  label: string;
  description: string;
  actionLabel: string;
  onPress: () => void;
  colors: Colors;
  isRTL?: boolean;
  isLast?: boolean;
}) {
  return (
    <View
      className="flex-row items-center justify-between px-5 py-4"
      style={[
        {
          backgroundColor: colors.settingRow,
          flexDirection: isRTL ? "row-reverse" : "row",
        },
        !isLast && {
          borderBottomWidth: 0.5,
          borderBottomColor: colors.separator,
        },
      ]}
    >
      <View
        className="flex-1 mr-3"
        style={{ alignItems: isRTL ? "flex-end" : "flex-start" }}
      >
        <Text
          className="text-sm font-medium mb-0.5"
          style={{ color: colors.text }}
        >
          {label}
        </Text>
        <Text className="text-xs" style={{ color: colors.textSecondary }}>
          {description}
        </Text>
      </View>
      <TouchableOpacity
        className="border rounded-lg px-3 py-1.5"
        style={{ borderColor: colors.tint }}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <Text className="text-xs font-semibold" style={{ color: colors.tint }}>
          {actionLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// â”€â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ─── Account Card (signed-in state) ──────────────────────────────────────────
function AccountCard({
  user,
  onLogout,
  colors,
  t,
  isRTL,
}: {
  user: User;
  onLogout: () => void;
  colors: Colors;
  t: ReturnType<typeof useLanguage>["t"];
  isRTL: boolean;
}) {
  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  const name =
    meta.display_name || meta.full_name || meta.name || user.email?.split("@")[0] || "";
  const avatar = meta.avatar_url || meta.picture;
  const provider = user.app_metadata?.provider;
  const providerLabel = provider === "google" ? t.settings.viaGoogle : t.settings.viaEmail;
  const initial = (name || user.email || "?").trim().charAt(0).toUpperCase();

  return (
    <View className="p-5" style={{ backgroundColor: colors.settingRow }}>
      {/* identity */}
      <View
        className="flex-row items-center gap-3.5"
        style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
      >
        {avatar ? (
          <Image
            source={{ uri: avatar }}
            style={{ width: 56, height: 56, borderRadius: 28 }}
            contentFit="cover"
          />
        ) : (
          <View
            className="w-14 h-14 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.tint }}
          >
            <Text className="text-2xl font-bold" style={{ color: colors.addBtnText }}>
              {initial}
            </Text>
          </View>
        )}

        <View className="flex-1" style={{ alignItems: isRTL ? "flex-end" : "flex-start" }}>
          {!!name && (
            <Text className="text-base font-bold" style={{ color: colors.text }} numberOfLines={1}>
              {name}
            </Text>
          )}
          <Text className="text-xs" style={{ color: colors.textSecondary }} numberOfLines={1}>
            {user.email}
          </Text>
          <View
            className="flex-row items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full"
            style={{ backgroundColor: colors.countBox, flexDirection: isRTL ? "row-reverse" : "row" }}
          >
            <Ionicons
              name={provider === "google" ? "logo-google" : "mail-outline"}
              size={11}
              color={colors.textSecondary}
            />
            <Text className="text-[11px] font-medium" style={{ color: colors.textSecondary }}>
              {providerLabel}
            </Text>
          </View>
        </View>
      </View>

      {/* synced status */}
      <View
        className="flex-row items-center gap-1.5 mt-4 px-3 py-2 rounded-xl"
        style={{ backgroundColor: colors.successBg, flexDirection: isRTL ? "row-reverse" : "row" }}
      >
        <Ionicons name="cloud-done-outline" size={15} color={colors.successText} />
        <Text className="text-xs font-medium" style={{ color: colors.successText }}>
          {t.settings.accountSynced}
        </Text>
      </View>

      {/* sign out */}
      <TouchableOpacity
        className="flex-row items-center justify-center gap-2 mt-3 py-3 rounded-2xl border"
        style={{ borderColor: colors.border }}
        onPress={onLogout}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={17} color={colors.dangerText} />
        <Text className="text-sm font-semibold" style={{ color: colors.dangerText }}>
          {t.settings.logout}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Location Picker Modal ───────────────────────────────────────────────────
function LocationPicker({
  visible,
  selectedId,
  onClose,
  onSelect,
  colors,
  t,
  lang,
  isRTL,
}: {
  visible: boolean;
  selectedId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
  colors: Colors;
  t: ReturnType<typeof useLanguage>["t"];
  lang: "en" | "ar";
  isRTL: boolean;
}) {
  const groups = groupedLocations();

  const Row = ({
    id,
    name,
    selected,
  }: {
    id: string;
    name: string;
    selected: boolean;
  }) => (
    <TouchableOpacity
      className="flex-row items-center justify-between px-5 py-3.5"
      style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
      onPress={() => onSelect(id)}
      activeOpacity={0.7}
    >
      <Text
        className="text-sm"
        style={{ color: selected ? colors.tint : colors.text, fontWeight: selected ? "700" : "400" }}
      >
        {name}
      </Text>
      {selected && <Ionicons name="checkmark-circle" size={18} color={colors.tint} />}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: colors.overlay }}>
        <View
          className="rounded-t-3xl overflow-hidden"
          style={{ backgroundColor: colors.background, maxHeight: "85%" }}
        >
          <View
            className="flex-row items-center justify-between px-5 py-4 border-b"
            style={{ borderBottomColor: colors.separator, flexDirection: isRTL ? "row-reverse" : "row" }}
          >
            <Text className="text-base font-bold" style={{ color: colors.text }}>
              {t.settings.locationCity}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView overScrollMode="never" bounces={false} showsVerticalScrollIndicator={false}>
            {/* GPS option */}
            <View style={{ backgroundColor: colors.settingRow }}>
              <Row id="auto" name={t.settings.autoOption} selected={selectedId === "auto"} />
            </View>

            {groups.map((g) => (
              <View key={g.country}>
                <Text
                  className="text-xs font-bold uppercase tracking-wider px-5 pt-4 pb-1.5"
                  style={{ color: colors.textMuted, backgroundColor: colors.sectionHeader, textAlign: isRTL ? "right" : "left" }}
                >
                  {lang === "ar" ? g.countryAr : g.countryEn}
                </Text>
                <View style={{ backgroundColor: colors.settingRow }}>
                  {g.items.map((loc) => (
                    <Row
                      key={loc.id}
                      id={loc.id}
                      name={lang === "ar" ? loc.nameAr : loc.nameEn}
                      selected={selectedId === loc.id}
                    />
                  ))}
                </View>
              </View>
            ))}
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function SettingsScreen() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const {
    settings,
    toggleNotifications,
    toggleSound,
    toggleVibration,
    updateSetting,
  } = useSettings();
  const { t, isRTL, lang, toggleLanguage } = useLanguage();
  const { user, signOut, configured } = useAuth();
  const dialog = useDialog();
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);

  const SUPPORT_EMAIL = "yaqeenal3lm@gmail.com";
  const SUPPORT_PHONE = "9647778742041";
  const INSTAGRAM_URL = "https://www.instagram.com/theyaqeen.iq";

  // ── athan sound preview ────────────────────────────────────────
  const player = useAudioPlayer();
  const playerStatus = useAudioPlayerStatus(player);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    if (playerStatus.didJustFinish) setPreviewId(null);
  }, [playerStatus.didJustFinish]);

  const handlePreview = useCallback(
    (s: AthanSoundOption) => {
      if (previewId === s.id) {
        player.pause();
        setPreviewId(null);
        return;
      }
      player.replace(s.module);
      player.seekTo(0);
      player.play();
      setPreviewId(s.id);
    },
    [player, previewId],
  );

  const selectedCityName =
    settings.locationId === "auto"
      ? t.settings.autoOption
      : (() => {
          const loc = getLocationById(settings.locationId);
          if (!loc) return t.settings.autoOption;
          return lang === "ar" ? `${loc.nameAr}، ${loc.countryAr}` : `${loc.nameEn}, ${loc.countryEn}`;
        })();

  const handleSelectCity = useCallback(
    async (id: string) => {
      setPickerVisible(false);
      await updateSetting("locationId", id);
      const loc = getLocationById(id);
      if (loc) {
        const name = lang === "ar" ? `${loc.nameAr}، ${loc.countryAr}` : `${loc.nameEn}, ${loc.countryEn}`;
        await saveLocation({ latitude: loc.latitude, longitude: loc.longitude, displayName: name });
      }
    },
    [updateSetting, lang],
  );

  const handleToggleMotivation = useCallback(() => {
    updateSetting("motivation", !settings.motivation);
  }, [settings.motivation, updateSetting]);

  const handleToggleQuran = useCallback(() => {
    updateSetting("quranDaily", !settings.quranDaily);
  }, [settings.quranDaily, updateSetting]);

  const handleTogglePinned = useCallback(async () => {
    const next = !settings.pinnedTimes;
    await updateSetting("pinnedTimes", next);
    if (!next) dismissPinnedTimes().catch(() => {});
  }, [settings.pinnedTimes, updateSetting]);

  const handleThemeToggle = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleTheme();
  }, [toggleTheme]);

  const handleLanguageToggle = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleLanguage();
  }, [toggleLanguage]);

  const handleUpdateLocation = useCallback(async () => {
    setUpdatingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        dialog.show({
          title: t.settings.locPermission,
          message: t.settings.locPermissionMsg,
          icon: "location-outline",
        });
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;
      const geocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      const place = geocode[0];
      const name =
        [place?.city, place?.region, place?.country]
          .filter(Boolean)
          .join(", ") || t.prayerTimes.location;

      const loc: SavedLocation = { latitude, longitude, displayName: name };
      await saveLocation(loc);
      await updateSetting("locationId", "auto");
      dialog.show({
        title: t.settings.locUpdated,
        message: t.settings.locUpdatedMsg(name),
        icon: "location",
      });
    } catch {
      const fallback: SavedLocation = {
        latitude: DEFAULT_LAT,
        longitude: DEFAULT_LON,
        displayName: t.prayerTimes.najaf,
      };
      await saveLocation(fallback);
      dialog.show({
        title: t.settings.locError,
        message: t.settings.locErrorMsg,
        icon: "location-outline",
      });
    } finally {
      setUpdatingLocation(false);
    }
  }, [t, updateSetting, dialog]);

  const openAuth = useCallback(
    (mode: "signin" | "signup") => {
      if (!configured) {
        dialog.show({
          title: t.settings.comingSoon,
          message: t.settings.comingSoonMsg,
          icon: "time-outline",
        });
        return;
      }
      setAuthMode(mode);
      setAuthVisible(true);
    },
    [configured, t, dialog],
  );

  const handleSignUp = useCallback(() => openAuth("signup"), [openAuth]);
  const handleLogin = useCallback(() => openAuth("signin"), [openAuth]);
  const handleLogout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const handlePrivacyPolicy = useCallback(() => {
    setPrivacyVisible(true);
  }, []);

  const handleAboutUs = useCallback(() => {
    setAboutVisible(true);
  }, []);

  const openInstagram = useCallback(() => {
    // Try the Instagram app first, fall back to the browser.
    Linking.openURL("instagram://user?username=theyaqeen.iq").catch(() =>
      Linking.openURL(INSTAGRAM_URL).catch(() => {}),
    );
  }, [INSTAGRAM_URL]);

  const openPhone = useCallback(() => {
    dialog.show({
      title: t.settings.contactUs,
      message: `+${SUPPORT_PHONE}`,
      icon: "chatbubbles-outline",
      buttons: [
        {
          text: t.settings.contactWhatsApp,
          onPress: () =>
            Linking.openURL(`https://wa.me/${SUPPORT_PHONE}`).catch(() => {}),
        },
        {
          text: t.settings.contactTelegram,
          onPress: () =>
            Linking.openURL(`https://t.me/+${SUPPORT_PHONE}`).catch(() => {}),
        },
        { text: t.tracker.cancel, style: "cancel" },
      ],
    });
  }, [dialog, t, SUPPORT_PHONE]);

  const handleSupport = useCallback(() => {
    dialog.show({
      title: t.settings.supportTitle,
      message: t.settings.supportMsg,
      icon: "help-buoy-outline",
      buttons: [
        {
          text: t.settings.contactEmail,
          onPress: () =>
            Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {}),
        },
        {
          text: t.settings.contactWhatsApp,
          onPress: () =>
            Linking.openURL(`https://wa.me/${SUPPORT_PHONE}`).catch(() => {}),
        },
        { text: t.tracker.cancel, style: "cancel" },
      ],
    });
  }, [dialog, t, SUPPORT_EMAIL, SUPPORT_PHONE]);

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top", "left", "right"]}
      style={{ backgroundColor: colors.background }}
    >
      <LocationPicker
        visible={pickerVisible}
        selectedId={settings.locationId}
        onClose={() => setPickerVisible(false)}
        onSelect={handleSelectCity}
        colors={colors}
        t={t}
        lang={lang}
        isRTL={isRTL}
      />
      <AuthModal
        visible={authVisible}
        initialMode={authMode}
        onClose={() => setAuthVisible(false)}
      />
      {/* About Us modal */}
      <Modal
        visible={aboutVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAboutVisible(false)}
      >
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: colors.overlay }}
        >
          <View
            className="w-full rounded-3xl p-6"
            style={{ backgroundColor: colors.card, maxHeight: "85%" }}
          >
            <ScrollView overScrollMode="never" bounces={false} showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
              <View className="items-center mb-4">
                <YaqeenLogoBox size={64} />
                <Text className="text-xl font-bold mt-3" style={{ color: colors.text }}>
                  {t.settings.aboutUsTitle}
                </Text>
              </View>

              <Text
                className="text-sm leading-6 mb-5"
                style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}
              >
                {t.settings.aboutUsBody}
              </Text>

              {/* Instagram */}
              <TouchableOpacity
                className="flex-row items-center gap-3 px-4 py-3.5 rounded-2xl border mb-2.5"
                style={{ borderColor: colors.border, backgroundColor: colors.settingRow, flexDirection: isRTL ? "row-reverse" : "row" }}
                onPress={openInstagram}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-instagram" size={20} color="#E1306C" />
                <View className="flex-1" style={{ alignItems: isRTL ? "flex-end" : "flex-start" }}>
                  <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                    {t.settings.followInstagram}
                  </Text>
                  <Text className="text-xs" style={{ color: colors.textSecondary }}>
                    {t.settings.instagramHandle}
                  </Text>
                </View>
                <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Phone (WhatsApp / Telegram) */}
              <TouchableOpacity
                className="flex-row items-center gap-3 px-4 py-3.5 rounded-2xl border mb-2.5"
                style={{ borderColor: colors.border, backgroundColor: colors.settingRow, flexDirection: isRTL ? "row-reverse" : "row" }}
                onPress={openPhone}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubbles-outline" size={20} color={colors.tint} />
                <View className="flex-1" style={{ alignItems: isRTL ? "flex-end" : "flex-start" }}>
                  <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                    {t.settings.contactUs}
                  </Text>
                  <Text className="text-xs" style={{ color: colors.textSecondary }}>
                    +964 777 874 2041
                  </Text>
                </View>
                <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Email */}
              <TouchableOpacity
                className="flex-row items-center gap-3 px-4 py-3.5 rounded-2xl border"
                style={{ borderColor: colors.border, backgroundColor: colors.settingRow, flexDirection: isRTL ? "row-reverse" : "row" }}
                onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})}
                activeOpacity={0.8}
              >
                <Ionicons name="mail-outline" size={20} color={colors.tint} />
                <View className="flex-1" style={{ alignItems: isRTL ? "flex-end" : "flex-start" }}>
                  <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                    {t.settings.contactEmail}
                  </Text>
                  <Text className="text-xs" style={{ color: colors.textSecondary }}>
                    {SUPPORT_EMAIL}
                  </Text>
                </View>
                <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <Text className="text-xs text-center mt-5" style={{ color: colors.textMuted }}>
                {t.settings.developedBy}
              </Text>
            </ScrollView>

            <TouchableOpacity
              className="mt-4 py-3 rounded-2xl items-center"
              style={{ backgroundColor: colors.tint }}
              onPress={() => setAboutVisible(false)}
              activeOpacity={0.85}
            >
              <Text className="text-sm font-bold" style={{ color: colors.addBtnText }}>
                {t.settings.ok}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy policy modal */}
      <Modal
        visible={privacyVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPrivacyVisible(false)}
      >
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: colors.overlay }}
        >
          <View
            className="w-full rounded-3xl p-6"
            style={{ backgroundColor: colors.card, maxHeight: "80%" }}
          >
            <View
              className="flex-row items-center gap-2 mb-3"
              style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.tint} />
              <Text className="text-lg font-bold" style={{ color: colors.text }}>
                {t.settings.privacyTitle}
              </Text>
            </View>
            <ScrollView overScrollMode="never" bounces={false} showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
              <Text
                className="text-sm leading-6"
                style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}
              >
                {t.settings.privacyBody}
              </Text>
            </ScrollView>
            <TouchableOpacity
              className="mt-5 py-3 rounded-2xl items-center"
              style={{ backgroundColor: colors.tint }}
              onPress={() => setPrivacyVisible(false)}
              activeOpacity={0.85}
            >
              <Text className="text-sm font-bold" style={{ color: colors.addBtnText }}>
                {t.settings.ok}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <ScrollView
        overScrollMode="never"
        bounces={false}
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 40,
          paddingTop: 8,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center py-5 gap-1">
          <Ionicons
            name="settings-outline"
            size={28}
            color={colors.headerTitle}
          />
          <Text
            className="text-2xl font-bold tracking-wide mt-1"
            style={{ color: colors.headerTitle, textAlign: "center" }}
          >
            {t.settings.title}
          </Text>
          <Text
            className="text-xs mt-1"
            style={{ color: colors.textSecondary, textAlign: "center" }}
          >
            {t.settings.subtitle}
          </Text>
        </View>

        {/* Appearance */}
        <Section
          icon="moon-outline"
          title={t.settings.appearance}
          colors={colors}
          isRTL={isRTL}
        >
          <ToggleRow
            label={t.settings.darkMode}
            description={t.settings.darkModeDesc}
            value={isDarkMode}
            onToggle={handleThemeToggle}
            colors={colors}
            isRTL={isRTL}
            isLast
          />
        </Section>

        {/* Language */}
        <Section
          icon="language-outline"
          title={t.settings.language}
          colors={colors}
          isRTL={isRTL}
        >
          <View
            className="px-5 py-4 flex-row items-center justify-between"
            style={{
              backgroundColor: colors.settingRow,
              flexDirection: isRTL ? "row-reverse" : "row",
            }}
          >
            <View style={{ alignItems: isRTL ? "flex-end" : "flex-start" }}>
              <Text
                className="text-sm font-medium mb-0.5"
                style={{ color: colors.text }}
              >
                {t.settings.language}
              </Text>
              <Text className="text-xs" style={{ color: colors.textSecondary }}>
                {t.settings.languageDesc}
              </Text>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity
                className="px-4 py-1.5 rounded-lg border"
                style={{
                  backgroundColor: lang === "en" ? colors.tint : "transparent",
                  borderColor: colors.tint,
                }}
                onPress={lang === "ar" ? handleLanguageToggle : undefined}
                activeOpacity={0.75}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{
                    color: lang === "en" ? "#fff" : colors.tint,
                  }}
                >
                  {t.settings.englishLabel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-4 py-1.5 rounded-lg border"
                style={{
                  backgroundColor: lang === "ar" ? colors.tint : "transparent",
                  borderColor: colors.tint,
                }}
                onPress={lang === "en" ? handleLanguageToggle : undefined}
                activeOpacity={0.75}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{
                    color: lang === "ar" ? "#fff" : colors.tint,
                  }}
                >
                  {t.settings.arabicLabel}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Section>

        {/* Notifications */}
        <Section
          icon="notifications-outline"
          title={t.settings.notifications}
          colors={colors}
          isRTL={isRTL}
        >
          <ToggleRow
            label={t.settings.prayerNotif}
            description={t.settings.prayerNotifDesc}
            value={settings.prayerNotifications}
            onToggle={toggleNotifications}
            colors={colors}
            isRTL={isRTL}
          />
          <ToggleRow
            label={t.settings.sound}
            description={t.settings.soundDesc}
            value={settings.sound}
            onToggle={toggleSound}
            colors={colors}
            isRTL={isRTL}
          />
          <ToggleRow
            label={t.settings.vibration}
            description={t.settings.vibrationDesc}
            value={settings.vibration}
            onToggle={toggleVibration}
            colors={colors}
            isRTL={isRTL}
          />
          <ToggleRow
            label={t.settings.motivation}
            description={t.settings.motivationDesc}
            value={settings.motivation}
            onToggle={handleToggleMotivation}
            colors={colors}
            isRTL={isRTL}
          />
          <ToggleRow
            label={t.settings.quranDaily}
            description={t.settings.quranDailyDesc}
            value={settings.quranDaily}
            onToggle={handleToggleQuran}
            colors={colors}
            isRTL={isRTL}
          />
          <ToggleRow
            label={t.settings.pinnedTimes}
            description={t.settings.pinnedTimesDesc}
            value={settings.pinnedTimes}
            onToggle={handleTogglePinned}
            colors={colors}
            isRTL={isRTL}
            isLast
          />
        </Section>

        {/* Athan sound */}
        {HAS_ATHAN_AUDIO && (
          <Section
            icon="musical-notes-outline"
            title={t.settings.athan}
            colors={colors}
            isRTL={isRTL}
          >
            <ToggleRow
              label={t.settings.athanEnable}
              description={t.settings.athanEnableDesc}
              value={settings.athanMode === "takbir"}
              onToggle={() =>
                updateSetting(
                  "athanMode",
                  settings.athanMode === "takbir" ? "notification" : "takbir",
                )
              }
              colors={colors}
              isRTL={isRTL}
              isLast={settings.athanMode !== "takbir"}
            />
            {settings.athanMode === "takbir" && (
              <View
                className="px-4 pt-3 pb-4 border-t"
                style={{
                  backgroundColor: colors.settingRow,
                  borderTopColor: colors.separator,
                }}
              >
                <Text
                  className="text-xs mb-3"
                  style={{
                    color: colors.textSecondary,
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {t.settings.athanPick}
                </Text>
                <View
                  className="flex-row flex-wrap gap-2"
                  style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
                >
                  {ATHAN_SOUNDS.map((s) => {
                    const selected = settings.athanSoundId === s.id;
                    const playing = previewId === s.id;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        className="flex-row items-center gap-1.5 pl-1.5 pr-3 py-1.5 rounded-full border"
                        style={{
                          borderColor: selected ? colors.tint : colors.border,
                          backgroundColor: selected
                            ? colors.totalBadgeBg
                            : "transparent",
                          flexDirection: isRTL ? "row-reverse" : "row",
                        }}
                        onPress={() => updateSetting("athanSoundId", s.id)}
                        activeOpacity={0.75}
                      >
                        <TouchableOpacity
                          className="w-7 h-7 rounded-full items-center justify-center"
                          style={{
                            backgroundColor: playing ? colors.tint : colors.countBox,
                          }}
                          onPress={() => handlePreview(s)}
                          hitSlop={6}
                        >
                          <Ionicons
                            name={playing ? "stop" : "play"}
                            size={12}
                            color={playing ? colors.addBtnText : colors.tint}
                          />
                        </TouchableOpacity>
                        <Text
                          className="text-xs font-semibold"
                          style={{ color: selected ? colors.tint : colors.textSecondary }}
                        >
                          {t.settings.soundOption} {s.n}
                        </Text>
                        {selected && (
                          <Ionicons name="checkmark-circle" size={14} color={colors.tint} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </Section>
        )}

        {/* Prayer-times display */}
        <Section
          icon="eye-outline"
          title={t.settings.display}
          colors={colors}
          isRTL={isRTL}
        >
          <ToggleRow
            label={t.settings.showAsrIsha}
            description={t.settings.showAsrIshaDesc}
            value={settings.showAsrIsha}
            onToggle={() => updateSetting("showAsrIsha", !settings.showAsrIsha)}
            colors={colors}
            isRTL={isRTL}
          />
          <ToggleRow
            label={t.settings.showSunEvents}
            description={t.settings.showSunEventsDesc}
            value={settings.showSunEvents}
            onToggle={() => updateSetting("showSunEvents", !settings.showSunEvents)}
            colors={colors}
            isRTL={isRTL}
            isLast
          />
        </Section>

        {/* Account */}
        <Section
          icon="person-outline"
          title={t.settings.account}
          colors={colors}
          isRTL={isRTL}
        >
          {user ? (
            <AccountCard
              user={user}
              onLogout={handleLogout}
              colors={colors}
              t={t}
              isRTL={isRTL}
            />
          ) : (
            <>
              <ActionRow
                label={t.settings.createAccount}
                description={t.settings.createAccountDesc}
                actionLabel={t.settings.signUp}
                onPress={handleSignUp}
                colors={colors}
                isRTL={isRTL}
              />
              <ActionRow
                label={t.settings.login}
                description={t.settings.loginDesc}
                actionLabel={t.settings.login}
                onPress={handleLogin}
                colors={colors}
                isRTL={isRTL}
                isLast
              />
            </>
          )}
        </Section>

        {/* Location */}
        <Section
          icon="location-outline"
          title={t.settings.location}
          colors={colors}
          isRTL={isRTL}
        >
          <ActionRow
            label={t.settings.locationCity}
            description={selectedCityName}
            actionLabel={t.settings.selectAction}
            onPress={() => setPickerVisible(true)}
            colors={colors}
            isRTL={isRTL}
          />
          <ActionRow
            label={t.settings.autoDetect}
            description={t.settings.autoDetectDesc}
            actionLabel={
              updatingLocation ? t.settings.updating : t.settings.update
            }
            onPress={handleUpdateLocation}
            colors={colors}
            isRTL={isRTL}
            isLast
          />
        </Section>

        {/* About */}
        <Section
          icon="information-circle-outline"
          title={t.settings.about}
          colors={colors}
          isRTL={isRTL}
        >
          <View
            className="items-center p-5 gap-1.5"
            style={{ backgroundColor: colors.settingRow }}
          >
            <Text className="text-sm font-bold" style={{ color: colors.text }}>
              {t.settings.appVersion}
            </Text>
            <Text
              className="text-xs text-center leading-5"
              style={{ color: colors.textSecondary }}
            >
              {t.settings.tagline}
            </Text>
            <View className="flex-row flex-wrap justify-center gap-3 mt-2">
              <TouchableOpacity
                className="border rounded-lg px-4 py-2"
                style={{ borderColor: colors.tint }}
                onPress={handleAboutUs}
                activeOpacity={0.75}
              >
                <Text className="text-xs font-semibold" style={{ color: colors.tint }}>
                  {t.settings.aboutUs}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="border rounded-lg px-4 py-2"
                style={{ borderColor: colors.border }}
                onPress={handlePrivacyPolicy}
                activeOpacity={0.75}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: colors.textSecondary }}
                >
                  {t.settings.privacy}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="border rounded-lg px-4 py-2"
                style={{ borderColor: colors.border }}
                onPress={handleSupport}
                activeOpacity={0.75}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: colors.textSecondary }}
                >
                  {t.settings.support}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

