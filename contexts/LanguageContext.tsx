import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Lang, T, Translations } from "../translations";

const LANG_KEY = "@prayer_lang";

interface LanguageContextValue {
  lang: Lang;
  isRTL: boolean;
  t: Translations;
  toggleLanguage: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((saved) => {
      if (saved === "ar" || saved === "en") setLang(saved);
    });
  }, []);

  const toggleLanguage = useCallback(async () => {
    const next: Lang = lang === "en" ? "ar" : "en";
    setLang(next);
    await AsyncStorage.setItem(LANG_KEY, next);
  }, [lang]);

  const isRTL = lang === "ar";
  const t = T[lang] as Translations;

  const value = useMemo(
    () => ({ lang, isRTL, t, toggleLanguage }),
    [lang, isRTL, t, toggleLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
