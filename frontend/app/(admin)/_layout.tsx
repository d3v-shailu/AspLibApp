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

const tabStyle = {
  tabBarBackground: () => (Platform.OS === "ios" ? <GlassTabBarBackground /> : null),
  tabBarStyle: {
    backgroundColor: Platform.OS === "ios" ? "transparent" : "rgba(20,20,45,0.95)",
    borderTopColor: "rgba(255,255,255,0.08)",
    borderTopWidth: 1,
    height: 84,
    paddingTop: 6,
  } as const,
  tabBarActiveTintColor: colors.cyan,
  tabBarInactiveTintColor: colors.white50,
  tabBarLabelStyle: { fontSize: 11, fontWeight: "600" as const },
};

export default function AdminLayout() {
  return (
    <Tabs screenOptions={tabStyle}>
      <Tabs.Screen
        name="index"
        options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => <Ionicons name="speedometer-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="seats"
        options={{ title: "Seats", tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="slots"
        options={{ title: "Slots", tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="students"
        options={{ title: "Students", tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: "Chat", tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color} /> }}
      />
      {/* pushed from dashboard quick actions */}
      <Tabs.Screen name="bookings" options={{ href: null }} />
      <Tabs.Screen name="geofence" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
    </Tabs>
  );
}
