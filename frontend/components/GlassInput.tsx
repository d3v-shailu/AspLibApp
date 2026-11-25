import { StyleSheet, Text, TextInput, View, ViewStyle, StyleProp, TextInputProps } from "react-native";
import { useState } from "react";
import { Glass } from "./Glass";
import { colors, radius, spacing } from "../constants/theme";

interface Props extends TextInputProps {
  label?: string;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
  secure?: boolean;
}

/** Glass text input with label, focus glow and error state. */
export function GlassInput({ label, error, containerStyle, secure, ...inputProps }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Glass style={[styles.wrap, focused && styles.focused, error ? styles.errorBorder : null]}>
        <TextInput
          {...inputProps}
          secureTextEntry={secure}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          placeholderTextColor={colors.white50}
          style={styles.input}
        />
      </Glass>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.white70,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  wrap: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: spacing.lg,
  },
  focused: {
    borderColor: colors.cyan,
    shadowColor: colors.cyan,
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  errorBorder: {
    borderColor: colors.red,
  },
  input: {
    color: colors.white,
    fontSize: 16,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  error: {
    color: colors.red,
    fontSize: 12,
    marginTop: spacing.xs,
    marginLeft: 4,
  },
});
