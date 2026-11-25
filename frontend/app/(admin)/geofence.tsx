import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";
import { useRouter } from "expo-router";
import { GradientBackground } from "../../components/GradientBackground";
import { Glass } from "../../components/Glass";
import { GlassButton } from "../../components/GlassButton";
import { LoadingScreen } from "../../components/LoadingScreen";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { apiError } from "../../services/api";
import { colors, spacing } from "../../constants/theme";
import * as Location from "expo-location";

interface GeofenceState {
  latitude: number;
  longitude: number;
  radius_meters: number;
}

export default function GeofenceScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<GeofenceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<{ libraries: Array<{ id: string; latitude: string | null; longitude: string | null; radius_meters: number; name: string }> }>(
          "/developer/libraries"
        );
        const mine = data.libraries.find((l) => l.id === user?.library_id);
        if (mine?.latitude && mine?.longitude) {
          setState({ latitude: Number(mine.latitude), longitude: Number(mine.longitude), radius_meters: mine.radius_meters ?? 100 });
        } else {
          // fall back to current device location
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const pos = await Location.getCurrentPositionAsync({});
            setState({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, radius_meters: 100 });
          }
        }
      } catch (e) {
        // still allow manual setup
        setState({ latitude: 20.5937, longitude: 78.9629, radius_meters: 100 });
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.library_id]);

  const save = async () => {
    if (!state) return;
    setSaving(true);
    try {
      await api.patch("/admin/libraries/geofence", state);
      setSaved(true);
      setTimeout(() => router.back(), 900);
    } catch (e) {
      Alert.alert("Error", apiError(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !state) return <LoadingScreen message="Loading map…" />;

  return (
    <GradientBackground>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{ latitude: state.latitude, longitude: state.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
        onPress={(e) => setState({ ...state, latitude: e.nativeEvent.coordinate.latitude, longitude: e.nativeEvent.coordinate.longitude })}
      >
        <Marker
          coordinate={{ latitude: state.latitude, longitude: state.longitude }}
          draggable
          onDragEnd={(e) => setState({ ...state, latitude: e.nativeEvent.coordinate.latitude, longitude: e.nativeEvent.coordinate.longitude })}
          title="Library center"
        />
        <Circle
          center={{ latitude: state.latitude, longitude: state.longitude }}
          radius={state.radius_meters}
          strokeColor={`${colors.cyan}88`}
          fillColor={`${colors.cyan}22`}
        />
      </MapView>

      {/* Glass overlay card */}
      <Glass style={styles.overlay}>
        <Text style={styles.title}>Set Geofence</Text>
        <Text style={styles.coords}>
          {state.latitude.toFixed(5)}, {state.longitude.toFixed(5)}
        </Text>
        <View style={styles.radiusRow}>
          {[50, 100, 150].map((r) => (
            <Glass key={r} isInteractive style={[styles.radiusChip, state.radius_meters === r && styles.radiusActive]}>
              <Text style={[styles.radiusText, state.radius_meters === r && { color: colors.cyan }]} onPress={() => setState({ ...state, radius_meters: r })}>
                {r}m
              </Text>
            </Glass>
          ))}
        </View>
        <GlassButton
          title={saved ? "Saved ✓" : "Save Geofence"}
          icon="location-outline"
          onPress={save}
          loading={saving}
          variant={saved ? "secondary" : "primary"}
        />
        <Text style={styles.hint}>Tap map or drag pin to move the center</Text>
      </Glass>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    bottom: 40,
    left: spacing.xl,
    right: spacing.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { color: colors.white, fontSize: 18, fontWeight: "800" },
  coords: { color: colors.white70, fontSize: 13 },
  radiusRow: { flexDirection: "row", gap: spacing.sm },
  radiusChip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 999 },
  radiusActive: { borderWidth: 1, borderColor: colors.cyan },
  radiusText: { color: colors.white70, fontWeight: "700", fontSize: 13 },
  hint: { color: colors.white50, fontSize: 11, textAlign: "center" },
});
