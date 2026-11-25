import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { GradientBackground } from "../../components/GradientBackground";
import { GlassCard } from "../../components/GlassCard";
import { StatCard } from "../../components/StatCard";
import { LoadingScreen } from "../../components/LoadingScreen";
import { useAuth } from "../../context/AuthContext";
import { libraryService } from "../../services/library.service";
import { apiError } from "../../services/api";
import { colors, radius, spacing } from "../../constants/theme";
import { GlobalStats, Library } from "../../types";
import { Badge } from "../../components/Badge";

export default function DeveloperDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, libs] = await Promise.all([libraryService.globalStats(), libraryService.list()]);
      setStats(s);
      setLibraries(libs);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(apiError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingScreen />;

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#fff" />}
      >
        <Text style={styles.greeting}>Platform Overview</Text>
        <Text style={styles.sub}>Welcome back, {user?.full_name ?? "Developer"} 👋</Text>

        <View style={styles.statsRow}>
          <StatCard icon="business" label="Libraries" value={stats?.active_libraries ?? 0} suffix="/50" color={colors.purple} />
          <StatCard icon="people" label="Students" value={stats?.student_count ?? 0} color={colors.cyan} delay={80} />
        </View>
        <View style={styles.statsRow}>
          <StatCard icon="calendar" label="Bookings Today" value={stats?.bookings_today ?? 0} color={colors.green} delay={160} />
          <StatCard icon="close-circle" label="No-shows" value={stats?.total_no_shows ?? 0} color={colors.red} delay={240} />
        </View>

        <Text style={styles.section}>Recent Libraries</Text>
        {libraries.slice(0, 4).map((lib, i) => (
          <GlassCard
            key={lib.id}
            delay={i * 80}
            style={styles.libCard}
            onPress={() => router.push({ pathname: "/(developer)/create-admin", params: { libraryId: lib.id, libraryName: lib.name } })}
          >
            <View style={styles.libRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.libName}>{lib.name}</Text>
                <Text style={styles.libMeta}>
                  {lib.student_count ?? 0} students · {lib.seat_count ?? 0} seats · {lib.today_active_bookings ?? 0} active today
                </Text>
              </View>
              <Badge status={lib.status} />
            </View>
          </GlassCard>
        ))}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingBottom: 120, gap: spacing.md },
  greeting: { color: colors.white, fontSize: 26, fontWeight: "900", marginTop: spacing.xl },
  sub: { color: colors.white70, fontSize: 14, marginBottom: spacing.md },
  statsRow: { flexDirection: "row", gap: spacing.md },
  section: { color: colors.white, fontSize: 18, fontWeight: "800", marginTop: spacing.lg },
  libCard: { padding: spacing.lg },
  libRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  libName: { color: colors.white, fontSize: 16, fontWeight: "700" },
  libMeta: { color: colors.white70, fontSize: 12, marginTop: 2 },
});
