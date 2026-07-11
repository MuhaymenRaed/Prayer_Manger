import { Ionicons } from "@expo/vector-icons";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";

import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";

export interface DialogButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

interface DialogOptions {
  title: string;
  message?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  buttons?: DialogButton[];
}

interface DialogContextValue {
  /** Themed, cross-platform replacement for Alert.alert. */
  show: (options: DialogOptions) => void;
}

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const { isRTL } = useLanguage();
  const [dialog, setDialog] = useState<DialogOptions | null>(null);

  const show = useCallback((options: DialogOptions) => {
    setDialog(options);
  }, []);

  const close = useCallback(() => setDialog(null), []);

  const handlePress = useCallback(
    (btn: DialogButton) => {
      close();
      // Run after the modal starts dismissing so chained dialogs work.
      setTimeout(() => btn.onPress?.(), 80);
    },
    [close],
  );

  const value = useMemo(() => ({ show }), [show]);

  const buttons: DialogButton[] = dialog?.buttons?.length
    ? dialog.buttons
    : [{ text: "OK", style: "default" }];

  const buttonColor = (style?: DialogButton["style"]) =>
    style === "destructive"
      ? colors.dangerText
      : style === "cancel"
        ? colors.textSecondary
        : colors.tint;

  return (
    <DialogContext.Provider value={value}>
      {children}
      <Modal
        visible={dialog !== null}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable
          className="flex-1 items-center justify-center px-9"
          style={{ backgroundColor: colors.overlay }}
          onPress={close}
        >
          <Pressable
            className="w-full rounded-3xl p-6"
            style={{ backgroundColor: colors.card }}
            onPress={(e) => e.stopPropagation()}
          >
            {dialog?.icon && (
              <View
                className="w-12 h-12 rounded-2xl items-center justify-center self-center mb-3"
                style={{ backgroundColor: colors.totalBadgeBg }}
              >
                <Ionicons name={dialog.icon} size={24} color={colors.tint} />
              </View>
            )}
            <Text
              className="text-lg font-bold mb-1.5"
              style={{
                color: colors.text,
                textAlign: dialog?.icon ? "center" : isRTL ? "right" : "left",
              }}
            >
              {dialog?.title}
            </Text>
            {!!dialog?.message && (
              <Text
                className="text-sm leading-6"
                style={{
                  color: colors.textSecondary,
                  textAlign: dialog?.icon ? "center" : isRTL ? "right" : "left",
                }}
              >
                {dialog.message}
              </Text>
            )}

            <View
              className={buttons.length > 2 ? "mt-5 gap-2" : "flex-row mt-5 gap-3"}
              style={
                buttons.length > 2
                  ? undefined
                  : { flexDirection: isRTL ? "row-reverse" : "row" }
              }
            >
              {buttons.map((btn, i) => {
                const primary = btn.style !== "cancel";
                return (
                  <TouchableOpacity
                    key={i}
                    className={`${buttons.length > 2 ? "" : "flex-1"} py-3 rounded-2xl items-center border`}
                    style={{
                      backgroundColor:
                        btn.style === "default" || btn.style === undefined
                          ? colors.tint
                          : btn.style === "destructive"
                            ? colors.dangerBg
                            : "transparent",
                      borderColor:
                        btn.style === "destructive" ? colors.danger : colors.border,
                    }}
                    onPress={() => handlePress(btn)}
                    activeOpacity={0.85}
                  >
                    <Text
                      className="text-sm font-bold"
                      style={{
                        color:
                          btn.style === "default" || btn.style === undefined
                            ? colors.addBtnText
                            : buttonColor(btn.style),
                        opacity: primary ? 1 : 0.9,
                      }}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used inside DialogProvider");
  return ctx;
}
