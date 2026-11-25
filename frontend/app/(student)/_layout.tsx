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

export default function StudentLayout() {
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
        options={{ title: "Home", tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="book"
        options={{ title: "Book", tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: "History", tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: "Chat", tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }}
      />
      {/* pushed from home */}
      <Tabs.Screen name="checkin" options={{ href: null }} />
    </Tabs>
  );
}
