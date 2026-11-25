import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GradientBackground } from "../../components/GradientBackground";
import { Glass } from "../../components/Glass";
import { GlassCard } from "../../components/GlassCard";
import { GlassInput } from "../../components/GlassInput";
import { GlassButton } from "../../components/GlassButton";
import { Badge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { LoadingScreen } from "../../components/LoadingScreen";
import { studentAdminService } from "../../services/library.service";
import { apiError } from "../../services/api";
import { colors, spacing } from "../../constants/theme";
import { Student } from "../../types";

export default function StudentsScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStudents(await studentAdminService.list());
    } catch (e) {
      Alert.alert("Error", apiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!fullName.trim()) return setError("Full name required");
    setAdding(true);
    setError(null);
    try {
      const res = await studentAdminService.create({
        full_name: fullName.trim(),
        email: email || undefined,
        phone: phone || undefined,
        gender,
      });
      setShowAdd(false);
      setFullName("");
      setEmail("");
      setPhone("");
      setCreatedPassword(res.default_password);
      await load();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setAdding(false);
    }
  };

  const toggleBlock = async (s: Student) => {
    try {
      await studentAdminService.setBlocked(s.id, s.status !== "blocked");
      await load();
    } catch (e) {
      Alert.alert("Error", apiError(e));
    }
  };

  const filtered = students.filter(
    (s) =>
      (s.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.phone ?? "").includes(search)
  );

  if (loading) return <LoadingScreen />;

  return (
    <GradientBackground>
      <FlatList
        contentContainerStyle={styles.scroll}
        data={filtered}
        keyExtractor={(s) => s.id}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
            <Text style={styles.title}>Students</Text>
            <Glass style={styles.searchWrap}>
              <Ionicons name="search" size={18} color={colors.white50} />
              <TextInput placeholder="Search name or phone…" placeholderTextColor={colors.white50} value={search} onChangeText={setSearch} style={styles.searchInput} />
            </Glass>
          </View>
        }
        renderItem={({ item, index }) => (
          <GlassCard delay={index * 50} style={styles.card}>
            <View style={styles.row}>
              <Avatar name={item.full_name} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.name}>{item.full_name}</Text>
                <Text style={styles.meta}>{item.phone ?? item.email ?? "—"}</Text>
                <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: 4 }}>
                  {item.gender && <Badge status="active" label={item.gender} />}
                  <Badge status={item.status} />
                </View>
              </View>
              <Text style={styles.action} onPress={() => toggleBlock(item)}>
                {item.status === "blocked" ? "Unblock" : "Block"}
              </Text>
            </View>
          </GlassCard>
        )}
      />

      <GlassButton title="Add Student" icon="person-add" onPress={() => setShowAdd(true)} style={styles.fab} />

      <Modal visible={showAdd} transparent animationType="fade" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalOverlay}>
          <Glass style={styles.modal}>
            <Text style={styles.modalTitle}>Add Student</Text>
            <GlassInput label="Full Name" placeholder="Rahul Kumar" value={fullName} onChangeText={setFullName} error={error} />
            <GlassInput label="Email (optional)" placeholder="student@mail.com" value={email} onChangeText={setEmail} autoCapitalize="none" />
            <GlassInput label="Phone" placeholder="+91…" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <View style={styles.chips}>
              {(["male", "female", "other"] as const).map((g) => (
                <Glass key={g} isInteractive style={[styles.chip, gender === g && styles.chipActive]}>
                  <Text style={[styles.chipText, gender === g && { color: colors.cyan }]} onPress={() => setGender(g)}>
                    {g}
                  </Text>
                </Glass>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <GlassButton title="Cancel" variant="ghost" onPress={() => setShowAdd(false)} style={{ flex: 1 }} />
              <GlassButton title="Create" onPress={create} loading={adding} style={{ flex: 1 }} />
            </View>
          </Glass>
        </View>
      </Modal>

      <Modal visible={!!createdPassword} transparent animationType="fade" onRequestClose={() => setCreatedPassword(null)}>
        <View style={styles.modalOverlay}>
          <Glass style={styles.modal}>
            <Text style={styles.modalTitle}>✅ Student Created</Text>
            <Text style={styles.modalSub}>Share the default password — the student must reset it on first login.</Text>
            <Glass style={styles.passwordBox}>
              <Text style={styles.passwordText}>{createdPassword}</Text>
            </Glass>
            <GlassButton title="Done" onPress={() => setCreatedPassword(null)} />
          </Glass>
        </View>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingBottom: 160, gap: spacing.md },
  title: { color: colors.white, fontSize: 26, fontWeight: "900", marginTop: spacing.xl },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, minHeight: 48 },
  searchInput: { flex: 1, color: colors.white, fontSize: 15 },
  card: { padding: spacing.lg },
  row: { flexDirection: "row", alignItems: "center" },
  name: { color: colors.white, fontSize: 15, fontWeight: "700" },
  meta: { color: colors.white70, fontSize: 12, marginTop: 2 },
  action: { color: colors.red, fontSize: 13, fontWeight: "700" },
  chips: { flexDirection: "row", gap: spacing.sm },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 999 },
  chipActive: { borderWidth: 1, borderColor: colors.cyan },
  chipText: { color: colors.white70, fontSize: 13, fontWeight: "700" },
  fab: { position: "absolute", bottom: 40, left: spacing.xl, right: spacing.xl },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  modal: { width: "100%", padding: spacing.xl, gap: spacing.md },
  modalTitle: { color: colors.white, fontSize: 20, fontWeight: "800" },
  modalSub: { color: colors.white70, fontSize: 13, lineHeight: 19 },
  passwordBox: { padding: spacing.lg, alignItems: "center" },
  passwordText: { color: colors.cyan, fontSize: 22, fontWeight: "900", letterSpacing: 1 },
  modalButtons: { flexDirection: "row", gap: spacing.md },
});
