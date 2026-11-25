import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { GradientBackground } from "../../components/GradientBackground";
import { StatCard } from "../../components/StatCard";
import { GlassCard } from "../../components/GlassCard";
import { LoadingScreen } from "../../components/LoadingScreen";
import { libraryService } from "../../services/library.service";
import { colors, spacing } from "../../constants/theme";
import { GlobalStats, Library } from "../../types";

/** Simple animated bar (chart placeholder without a heavy chart dependency). */
function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={[styles.barLabel, { color }]}>{value}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, libs] = await Promise.all([libraryService.globalStats(), libraryService.list()]);
      setStats(s);
      setLibraries(libs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingScreen />;

  const maxBookings = Math.max(1, ...libraries.map((l) => l.today_active_bookings ?? 0));

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Global Analytics</Text>

        <View style={styles.row}>
          <StatCard icon="business" label="Active Libraries" value={stats?.active_libraries ?? 0} color={colors.purple} />
          <StatCard icon="person" label="Admins" value={stats?.admin_count ?? 0} color={colors.cyan} delay={80} />
        </View>
        <View style={styles.row}>
          <StatCard icon="people" label="Students" value={stats?.student_count ?? 0} color={colors.green} delay={160} />
          <StatCard icon="checkmark-done" label="Checked In Now" value={stats?.checked_in_now ?? 0} color={colors.amber} delay={240} />
        </View>

        <GlassCard style={{ marginTop: spacing.md }}>
          <Text style={styles.section}>Today's Active Bookings by Library</Text>
          <View style={{ gap: spacing.lg, marginTop: spacing.md }}>
            {libraries.slice(0, 8).map((l) => (
              <Bar key={l.id} label={l.name} value={l.today_active_bookings ?? 0} max={maxBookings} color={colors.cyan} />
            ))}
          </View>
        </GlassCard>

        <GlassCard style={{ marginTop: spacing.md }}>
          <Text style={styles.section}>No-shows (all time)</Text>
          <Text style={styles.bigNumber}>{stats?.total_no_shows ?? 0}</Text>
          <Text style={styles.note}>Flag repeat offenders in admin reports to apply booking limits.</Text>
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingBottom: 120, gap: spacing.md },
  title: { color: colors.white, fontSize: 26, fontWeight: "900", marginTop: spacing.xl },
  row: { flexDirection: "row", gap: spacing.md },
  section: { color: colors.white, fontSize: 16, fontWeight: "800" },
  barLabel: { color: colors.white70, fontSize: 12, fontWeight: "600" },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
  bigNumber: { color: colors.red, fontSize: 40, fontWeight: "900", marginTop: spacing.sm },
  note: { color: colors.white50, fontSize: 12, marginTop: 4 },
});
