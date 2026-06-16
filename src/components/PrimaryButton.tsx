import { useMemo, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme/typography";
import { spacing } from "@/theme/tokens";

type Props = Omit<ComponentProps<typeof Pressable>, "style"> & {
  title: string;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
  style?: ViewStyle;
};

export function PrimaryButton({
  title,
  loading,
  variant = "primary",
  disabled,
  style,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const textColor =
    variant === "primary"
      ? colors.accentOn
      : variant === "danger"
        ? colors.danger
        : colors.text;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "danger" && styles.danger,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && { opacity: 0.8 },
        style,
      ]}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    btn: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    primary: {
      backgroundColor: colors.accent,
    },
    secondary: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    danger: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.danger,
    },
    disabled: {
      opacity: 0.45,
    },
    text: {
      fontFamily: fonts.bodyMedium,
      fontSize: 15,
    },
  });
}
