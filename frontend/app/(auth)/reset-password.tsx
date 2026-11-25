import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { GradientBackground } from "../../components/GradientBackground";
import { Glass } from "../../components/Glass";
import { GlassInput } from "../../components/GlassInput";
import { GlassButton } from "../../components/GlassButton";
import { useAuth } from "../../context/AuthContext";
import { colors, radius, spacing } from "../../constants/theme";
import { apiError } from "../../services/api";
import { passwordStrength } from "../../utils/validators";
import { roleHome } from "../../utils/roleHome";

export default function ResetPasswordScreen() {
  const { user, resetPassword } = useAuth();
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // cannot be skipped: if somehow reached without a pending reset, go home
  useEffect(() => {
    if (!user) router.replace("/login");
    else if (!user.must_reset_password) router.replace(roleHome(user.role));
  }, [user, router]);

  const strength = passwordStrength(pw);
  const match = pw === confirm;

  const submit = async () => {
    if (pw.length < 8) return setError("Password must be at least 8 characters");
    if (!match) return setError("Passwords do not match");
    setLoading(true);
    setError(null);
    try {
      await resetPassword(pw);
      router.replace(roleHome(user?.role));
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Glass style={styles.card}>
            <Text style={styles.title}>Set New Password</Text>
            <Text style={styles.subtitle}>
              Your account uses a system-generated password. Set your own to continue.
            </Text>

            <GlassInput label="New Password" placeholder="At least 8 characters" value={pw} onChangeText={setPw} secure />

            {pw.length > 0 && (
              <View style={styles.strengthRow}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[styles.strengthBar, { backgroundColor: i < strength.score ? strength.color : "rgba(255,255,255,0.15)" }]} />
                ))}
                <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              </View>
            )}

            <GlassInput
              label="Confirm Password"
              placeholder="Repeat password"
              value={confirm}
              onChangeText={setConfirm}
              secure
              error={confirm.length > 0 && !match ? "Passwords do not match" : error}
            />

            <GlassButton title="Save & Continue" icon="checkmark-circle-outline" onPress={submit} loading={loading} />
          </Glass>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", padding: spacing.xl },
  card: { padding: spacing.xl, gap: spacing.lg, borderRadius: radius.lg },
  title: { color: colors.white, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colors.white70, fontSize: 13, lineHeight: 19 },
  strengthRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: 4 },
  strengthBar: { width: 36, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: "700", marginLeft: "auto" },
});
