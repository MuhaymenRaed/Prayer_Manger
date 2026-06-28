import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthModal } from "../../components/AuthModal";
import {
  getLocationById,
  groupedLocations,
} from "../../constants/locations";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useSettings } from "../../contexts/SettingsContext";
import { useTheme } from "../../contexts/ThemeContext";
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

          <ScrollView showsVerticalScrollIndicator={false}>
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
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

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
        Alert.alert(t.settings.locPermission, t.settings.locPermissionMsg);
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
      Alert.alert(t.settings.locUpdated, t.settings.locUpdatedMsg(name));
    } catch {
      const fallback: SavedLocation = {
        latitude: DEFAULT_LAT,
        longitude: DEFAULT_LON,
        displayName: t.prayerTimes.najaf,
      };
      await saveLocation(fallback);
      Alert.alert(t.settings.locError, t.settings.locErrorMsg);
    } finally {
      setUpdatingLocation(false);
    }
  }, [t, updateSetting]);

  const openAuth = useCallback(
    (mode: "signin" | "signup") => {
      if (!configured) {
        Alert.alert(t.settings.comingSoon, t.settings.comingSoonMsg);
        return;
      }
      setAuthMode(mode);
      setAuthVisible(true);
    },
    [configured, t],
  );

  const handleSignUp = useCallback(() => openAuth("signup"), [openAuth]);
  const handleLogin = useCallback(() => openAuth("signin"), [openAuth]);
  const handleLogout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const handlePrivacyPolicy = useCallback(() => {
    Linking.openURL("https://example.com/privacy").catch(() => {});
  }, []);

  const handleSupport = useCallback(() => {
    Linking.openURL("mailto:support@prayermanager.app").catch(() => {});
  }, []);

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
      <ScrollView
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
            <ActionRow
              label={t.settings.signedInAs(user.email ?? "")}
              description={t.settings.createAccountDesc}
              actionLabel={t.settings.logout}
              onPress={handleLogout}
              colors={colors}
              isRTL={isRTL}
              isLast
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
            <View className="flex-row gap-3 mt-2">
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

