import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GradientBackground } from "../../components/GradientBackground";
import { Glass } from "../../components/Glass";
import { GlassButton } from "../../components/GlassButton";
import { LoadingScreen } from "../../components/LoadingScreen";
import { useAuth } from "../../context/AuthContext";
import { chatService } from "../../services/chat.service";
import { apiError } from "../../services/api";
import { colors, radius, spacing } from "../../constants/theme";
import { ChatChannel, ChatMessage } from "../../types";

export default function AdminChatScreen() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [active, setActive] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);

  const loadMessages = useCallback(async (channel: ChatChannel) => {
    try {
      setMessages(await chatService.messages("admin", channel.id));
    } catch (e) {
      Alert.alert("Error", apiError(e));
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const ch = await chatService.channels("admin");
        setChannels(ch);
        if (ch[0]) {
          setActive(ch[0]);
          await loadMessages(ch[0]);
        }
      } catch (e) {
        Alert.alert("Error", apiError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMessages]);

  // polling for near-real-time updates
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => loadMessages(active), 4000);
    return () => clearInterval(t);
  }, [active, loadMessages]);

  const send = async () => {
    if (!draft.trim() || !active) return;
    const msg = draft.trim();
    setDraft("");
    try {
      const saved = await chatService.send("admin", active.id, msg);
      setMessages((prev) => [...prev, saved]);
    } catch (e) {
      Alert.alert("Error", apiError(e));
    }
  };

  const deleteMessage = async (m: ChatMessage) => {
    if (!active) return;
    try {
      await chatService.deleteMessage(active.id, m.id);
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
    } catch (e) {
      Alert.alert("Error", apiError(e));
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <GradientBackground>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        {/* channel tabs */}
        <View style={styles.tabs}>
          {channels.map((c) => (
            <Glass
              key={c.id}
              isInteractive
              style={[styles.tab, active?.id === c.id && styles.tabActive]}
            >
              <Text style={[styles.tabText, active?.id === c.id && { color: colors.cyan }]} onPress={() => { setActive(c); loadMessages(c); }}>
                {c.name}
              </Text>
            </Glass>
          ))}
        </View>

        <FlatList
          contentContainerStyle={styles.list}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <Glass style={styles.bubble}>
              <View style={styles.bubbleHeader}>
                <Text style={styles.sender}>{item.sender_name ?? "User"}</Text>
                <Ionicons name="trash-outline" size={15} color={colors.red} onPress={() => deleteMessage(item)} />
              </View>
              <Text style={styles.messageText}>{item.message}</Text>
              <Text style={styles.time}>{new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
            </Glass>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No messages yet</Text>}
        />

        <Glass style={styles.inputRow}>
          <TextInput
            placeholder="Moderator message…"
            placeholderTextColor={colors.white50}
            value={draft}
            onChangeText={setDraft}
            style={styles.input}
            multiline
          />
          <GlassButton title="" icon="send" onPress={send} style={{ width: 48, minHeight: 44 }} />
        </Glass>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: spacing.sm, padding: spacing.lg, paddingTop: spacing.xxl + 30 },
  tab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 999 },
  tabActive: { borderWidth: 1, borderColor: colors.cyan },
  tabText: { color: colors.white70, fontSize: 13, fontWeight: "700" },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: 20 },
  bubble: { padding: spacing.md, borderRadius: radius.md, alignSelf: "stretch" },
  bubbleHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  sender: { color: colors.cyan, fontSize: 12, fontWeight: "800" },
  messageText: { color: colors.white, fontSize: 14 },
  time: { color: colors.white50, fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  empty: { color: colors.white50, textAlign: "center", marginTop: 40 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, margin: spacing.lg, padding: spacing.sm },
  input: { flex: 1, color: colors.white, fontSize: 15, minHeight: 44, paddingHorizontal: spacing.md },
});
