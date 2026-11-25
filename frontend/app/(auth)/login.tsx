import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GradientBackground } from "../../components/GradientBackground";
import { Glass } from "../../components/Glass";
import { GlassInput } from "../../components/GlassInput";
import { GlassButton } from "../../components/GlassButton";
import { useAuth } from "../../context/AuthContext";
import { colors, radius, spacing } from "../../constants/theme";
import { apiError } from "../../services/api";

export default function LoginScreen() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // logged-in but must reset → force to reset screen
  useEffect(() => {
    if (user?.must_reset_password) router.replace("/reset-password");
  }, [user, router]);

  const submit = async () => {
    if (!identifier.trim() || !password) {
      setError("Enter your email/phone and password");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const u = await login(identifier.trim(), password);
      if (u.must_reset_password) {
        router.replace("/reset-password");
      } else {
        router.replace(u.role === "developer" ? "/(developer)" : u.role === "admin" ? "/(admin)" : "/(student)");
      }
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
          <View style={styles.logoRow}>
            <Ionicons name="library-outline" size={44} color={colors.cyan} />
          </View>
          <Text style={styles.title}>DLMS</Text>
          <Text style={styles.subtitle}>Digital Library Management System</Text>

          <Glass style={styles.card}>
            <GlassInput
              label="Email or Phone"
              placeholder="you@library.com"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <GlassInput
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secure
              error={error}
            />
            <GlassButton title="Sign In" icon="log-in-outline" onPress={submit} loading={loading} />
            <Text style={styles.hint}>No public signup — accounts are created by your library admin.</Text>
          </Glass>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", padding: spacing.xl },
  logoRow: { alignItems: "center", marginBottom: spacing.md },
  title: { color: colors.white, fontSize: 34, fontWeight: "900", textAlign: "center", letterSpacing: 2 },
  subtitle: { color: colors.white70, fontSize: 13, textAlign: "center", marginBottom: spacing.xxl },
  card: { padding: spacing.xl, gap: spacing.lg, borderRadius: radius.lg },
  hint: { color: colors.white50, fontSize: 12, textAlign: "center", marginTop: spacing.sm },
});
