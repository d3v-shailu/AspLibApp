import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { GradientBackground } from "../../components/GradientBackground";
import { Glass } from "../../components/Glass";
import { GlassInput } from "../../components/GlassInput";
import { GlassButton } from "../../components/GlassButton";
import { LoadingScreen } from "../../components/LoadingScreen";
import { libraryService } from "../../services/library.service";
import { apiError } from "../../services/api";
import { colors, radius, spacing } from "../../constants/theme";
import { Library } from "../../types";
import { generateDefaultPassword, isValidEmail, isValidPhone } from "../../utils/validators";

export default function CreateAdminScreen() {
  const params = useLocalSearchParams<{ libraryId?: string; libraryName?: string }>();
  const router = useRouter();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [libraryId, setLibraryId] = useState(params.libraryId ?? "");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [loading, setLoading] = useState(!params.libraryId);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  useEffect(() => {
    if (!params.libraryId) {
      libraryService
        .list()
        .then(setLibraries)
        .catch((e) => Alert.alert("Error", apiError(e)))
        .finally(() => setLoading(false));
    }
  }, [params.libraryId]);

  const create = async () => {
    if (!libraryId) return setError("Select a library");
    if (!fullName.trim()) return setError("Full name is required");
    if (email && !isValidEmail(email)) return setError("Invalid email");
    if (phone && !isValidPhone(phone)) return setError("Invalid phone");
    if (!email && !phone) return setError("Email or phone is required");

    setCreating(true);
    setError(null);
    try {
      const res = await libraryService.createAdmin(libraryId, {
        full_name: fullName.trim(),
        email: email || undefined,
        phone: phone || undefined,
        gender,
      });
      setCreatedPassword(res.default_password);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Admin</Text>
        <Text style={styles.sub}>{params.libraryName ?? "Assign an admin to a library"}</Text>

        {!params.libraryId && (
          <View style={styles.chips}>
            {libraries.map((l) => (
              <Glass key={l.id} isInteractive style={[styles.chip, libraryId === l.id && styles.chipActive]} >
                <Text style={[styles.chipText, libraryId === l.id && { color: colors.cyan }]} onPress={() => setLibraryId(l.id)}>
                  {l.name}
                </Text>
              </Glass>
            ))}
          </View>
        )}

        <Glass style={styles.card}>
          <GlassInput label="Full Name" placeholder="Jane Doe" value={fullName} onChangeText={setFullName} />
          <GlassInput label="Email" placeholder="admin@library.com" value={email} onChangeText={setEmail} autoCapitalize="none" />
          <GlassInput label="Phone" placeholder="+91…" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Text style={styles.label}>Gender</Text>
          <View style={styles.chips}>
            {(["male", "female", "other"] as const).map((g) => (
              <Glass key={g} isInteractive style={[styles.chip, gender === g && styles.chipActive]}>
                <Text style={[styles.chipText, gender === g && { color: colors.cyan }]} onPress={() => setGender(g)}>
                  {g}
                </Text>
              </Glass>
            ))}
          </View>
          <Glass style={styles.preview}>
            <Text style={styles.previewLabel}>Password preview (server generates the real one)</Text>
            <Text style={styles.previewValue}>{generateDefaultPassword()}</Text>
          </Glass>
          <GlassButton title="Create Admin" icon="person-add-outline" onPress={create} loading={creating} />
          {error && !createdPassword ? <Text style={styles.error}>{error}</Text> : null}
        </Glass>
      </ScrollView>

      {/* Generated password modal */}
      {createdPassword && (
        <View style={styles.modalOverlay}>
          <Glass style={styles.modal}>
            <Text style={styles.modalTitle}>✅ Admin Created</Text>
            <Text style={styles.modalSub}>Share these credentials securely. The admin must reset the password on first login.</Text>
            <Glass style={styles.passwordBox}>
              <Text style={styles.passwordText}>{createdPassword}</Text>
            </Glass>
            <GlassButton title="Done" onPress={() => router.back()} />
          </Glass>
        </View>
      )}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingBottom: 80, gap: spacing.md },
  title: { color: colors.white, fontSize: 26, fontWeight: "900", marginTop: spacing.xl },
  sub: { color: colors.white70, fontSize: 13, marginBottom: spacing.sm },
  card: { padding: spacing.xl, gap: spacing.md },
  label: { color: colors.white70, fontSize: 13, fontWeight: "600", marginLeft: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 999 },
  chipActive: { borderWidth: 1, borderColor: colors.cyan },
  chipText: { color: colors.white70, fontSize: 13, fontWeight: "700" },
  preview: { padding: spacing.lg, borderRadius: radius.md },
  previewLabel: { color: colors.white50, fontSize: 11 },
  previewValue: { color: colors.cyan, fontSize: 18, fontWeight: "800", marginTop: 4 },
  error: { color: colors.red, fontSize: 13 },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  modal: { width: "100%", padding: spacing.xl, gap: spacing.md },
  modalTitle: { color: colors.white, fontSize: 22, fontWeight: "800" },
  modalSub: { color: colors.white70, fontSize: 13, lineHeight: 19 },
  passwordBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg, borderRadius: radius.md },
  passwordText: { color: colors.cyan, fontSize: 22, fontWeight: "900", letterSpacing: 1 },
  copy: { fontSize: 20 },
});
