import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { GradientBackground } from "../../components/GradientBackground";
import { Glass } from "../../components/Glass";
import { GlassCard } from "../../components/GlassCard";
import { GlassButton } from "../../components/GlassButton";
import { Avatar } from "../../components/Avatar";
import { Badge } from "../../components/Badge";
import { useAuth } from "../../context/AuthContext";
import { colors, radius, spacing } from "../../constants/theme";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const doLogout = () => {
    Alert.alert("Log out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        <GlassCard style={styles.profileCard}>
          <Avatar name={user?.full_name} size={72} />
          <Text style={styles.name}>{user?.full_name ?? "User"}</Text>
          <Badge status="active" label={user?.role ?? "student"} />
        </GlassCard>

        <GlassCard style={styles.infoCard}>
          <InfoRow icon="mail-outline" label="Email" value={user?.email ?? "—"} />
          <InfoRow icon="call-outline" label="Phone" value={user?.phone ?? "—"} />
          <InfoRow icon="people-outline" label="Gender" value={user?.gender ?? "—"} />
          <InfoRow icon="business-outline" label="Library ID" value={user?.library_id?.slice(0, 8) ?? "—"} />
        </GlassCard>

        <GlassCard style={styles.infoCard}>
          <Text style={styles.section}>Membership</Text>
          <Text style={styles.note}>Active · managed by your library admin. Contact the desk for renewals or plan changes.</Text>
        </GlassCard>

        <GlassButton title="Change Password" icon="key-outline" variant="secondary" onPress={promptChangePassword} />
        <GlassButton title="Log Out" icon="log-out-outline" variant="danger" onPress={doLogout} />
      </ScrollView>
    </GradientBackground>
  );
}

function promptChangePassword() {
  // Forced reset flow is handled by the backend flag; students can ask the
  // admin to regenerate their default password which re-triggers the reset
  // screen on next login.
  Alert.alert(
    "Change Password",
    "Password changes are initiated by your library admin. Once regenerated, you'll set a new password on next login.",
    [{ text: "OK" }]
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon === "mail-outline" ? "✉️" : icon === "call-outline" ? "📞" : icon === "people-outline" ? "👥" : "🏢"}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingBottom: 80, gap: spacing.md },
  profileCard: { alignItems: "center", gap: spacing.sm, marginTop: spacing.xxl },
  name: { color: colors.white, fontSize: 22, fontWeight: "900" },
  infoCard: { gap: spacing.md },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  infoIcon: { fontSize: 16, width: 24, textAlign: "center" },
  infoLabel: { color: colors.white70, fontSize: 13, width: 80 },
  infoValue: { color: colors.white, fontSize: 13, fontWeight: "600", flex: 1, textAlign: "right" },
  section: { color: colors.white, fontSize: 15, fontWeight: "800" },
  note: { color: colors.white70, fontSize: 12, lineHeight: 18 },
});
