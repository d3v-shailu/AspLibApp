import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { Glass } from "../../components/Glass";
import { colors } from "../../constants/theme";

function GlassTabBarBackground() {
  return (
    <Glass style={{ flex: 1, borderRadius: 0 }} tintColor="#1E1B4B">
      <></>
    </Glass>
  );
}

export default function DeveloperLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarBackground: () => (Platform.OS === "ios" ? <GlassTabBarBackground /> : null),
        tabBarStyle: {
          backgroundColor: Platform.OS === "ios" ? "transparent" : "rgba(20,20,45,0.95)",
          borderTopColor: "rgba(255,255,255,0.08)",
          borderTopWidth: 1,
          height: 84,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.cyan,
        tabBarInactiveTintColor: colors.white50,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <Ionicons name="speedometer-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="libraries"
        options={{
          title: "Libraries",
          tabBarIcon: ({ color, size }) => <Ionicons name="business-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} />,
        }}
      />
      {/* reachable via Libraries → Create Admin, hidden from tab bar */}
      <Tabs.Screen name="create-admin" options={{ href: null }} />
    </Tabs>
  );
}
