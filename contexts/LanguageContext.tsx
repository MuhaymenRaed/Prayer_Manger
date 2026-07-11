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

export type LangPref = Lang | "system";

function deviceLang(): Lang {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? "en";
    return locale.toLowerCase().startsWith("ar") ? "ar" : "en";
  } catch {
    return "en";
  }
}

interface LanguageContextValue {
  lang: Lang;
  langPref: LangPref;
  isRTL: boolean;
  t: Translations;
  toggleLanguage: () => Promise<void>;
  setLanguage: (pref: LangPref) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [langPref, setLangPref] = useState<LangPref>("en");

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((saved) => {
      if (saved === "ar" || saved === "en" || saved === "system") {
        setLangPref(saved);
      }
    });
  }, []);

  const setLanguage = useCallback(async (pref: LangPref) => {
    setLangPref(pref);
    await AsyncStorage.setItem(LANG_KEY, pref);
  }, []);

  const lang: Lang = langPref === "system" ? deviceLang() : langPref;

  const toggleLanguage = useCallback(async () => {
    await setLanguage(lang === "en" ? "ar" : "en");
  }, [lang, setLanguage]);

  const isRTL = lang === "ar";
  const t = T[lang] as Translations;

  const value = useMemo(
    () => ({ lang, langPref, isRTL, t, toggleLanguage, setLanguage }),
    [lang, langPref, isRTL, t, toggleLanguage, setLanguage],
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
