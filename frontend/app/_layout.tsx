import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { LoadingScreen } from "../components/LoadingScreen";
import { GradientBackground } from "../components/GradientBackground";
import { colors } from "../constants/theme";

function RootNav() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen message="Starting DLMS…" />;

  const active = !!user && !user.must_reset_password;

  return (
    <GradientBackground style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
          animation: "fade",
        }}
      >
        {/* Auth group: only when logged out OR password reset still pending */}
        <Stack.Protected guard={!active}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        {/* Role groups: only when fully authenticated with matching role */}
        <Stack.Protected guard={active && user?.role === "developer"}>
          <Stack.Screen name="(developer)" />
        </Stack.Protected>
        <Stack.Protected guard={active && user?.role === "admin"}>
          <Stack.Screen name="(admin)" />
        </Stack.Protected>
        <Stack.Protected guard={active && user?.role === "student"}>
          <Stack.Screen name="(student)" />
        </Stack.Protected>
      </Stack>
    </GradientBackground>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bgDeep }}>
      <AuthProvider>
        <RootNav />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
