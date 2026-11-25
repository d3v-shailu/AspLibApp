import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { GradientBackground } from "../../components/GradientBackground";
import { Glass } from "../../components/Glass";
import { GlassButton } from "../../components/GlassButton";
import { LoadingScreen } from "../../components/LoadingScreen";
import { useAuth } from "../../context/AuthContext";
import { chatService } from "../../services/chat.service";
import { apiError } from "../../services/api";
import { colors, radius, spacing } from "../../constants/theme";
import { ChatChannel, ChatMessage } from "../../types";

export default function StudentChatScreen() {
  const { user } = useAuth();
  const [channel, setChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const loadMessages = useCallback(async () => {
    if (!channel) return;
    try {
      setMessages(await chatService.messages("student", channel.id));
    } catch (e) {
      console.warn(apiError(e));
    }
  }, [channel]);

  useEffect(() => {
    (async () => {
      try {
        const ch = await chatService.channels("student");
        if (ch[0]) setChannel(ch[0]);
      } catch (e) {
        Alert.alert("Error", apiError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    loadMessages();
    if (!channel) return;
    const t = setInterval(loadMessages, 3000); // near-real-time polling
    return () => clearInterval(t);
  }, [channel, loadMessages]);

  const send = async () => {
    if (!draft.trim() || !channel) return;
    const msg = draft.trim();
    setDraft("");
    try {
      const saved = await chatService.send("student", channel.id, msg);
      setMessages((prev) => [...prev, saved]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      Alert.alert("Error", apiError(e));
    }
  };

  if (loading) return <LoadingScreen />;

  if (!channel) {
    return (
      <GradientBackground style={{ alignItems: "center", justifyContent: "center" }}>
        <Glass style={{ padding: spacing.xxl }}>
          <Text style={{ color: colors.white70 }}>No chat channel available — ask your admin to set your gender in your profile.</Text>
        </Glass>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Text style={styles.header}>{channel.name}</Text>
        <FlatList
          ref={listRef}
          contentContainerStyle={styles.list}
          data={messages}
          keyExtractor={(m) => m.id}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const mine = item.sender_id === user?.id;
            return (
              <View style={[styles.bubbleWrap, { alignItems: mine ? "flex-end" : "flex-start" }]}>
                <Glass style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  {!mine && <Text style={styles.sender}>{item.sender_name ?? "Student"}</Text>}
                  <Text style={styles.messageText}>{item.message}</Text>
                  <Text style={styles.time}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </Glass>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>Say hello 👋</Text>}
        />
        <Glass style={styles.inputRow}>
          <TextInput placeholder="Message…" placeholderTextColor={colors.white50} value={draft} onChangeText={setDraft} style={styles.input} multiline />
          <GlassButton title="" icon="send" onPress={send} style={{ width: 48, minHeight: 44 }} />
        </Glass>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  header: { color: colors.white, fontSize: 18, fontWeight: "800", textAlign: "center", paddingTop: spacing.xxl + 20, paddingBottom: spacing.sm },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: 20 },
  bubbleWrap: { flexDirection: "row" },
  bubble: { maxWidth: "82%", padding: spacing.md, borderRadius: radius.md },
  mine: { tintColor: "rgba(124,58,237,0.25)", borderWidth: 1, borderColor: `${colors.purple}66` },
  theirs: {},
  sender: { color: colors.cyan, fontSize: 11, fontWeight: "800", marginBottom: 2 },
  messageText: { color: colors.white, fontSize: 14 },
  time: { color: colors.white50, fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  empty: { color: colors.white50, textAlign: "center", marginTop: 40 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, margin: spacing.lg, padding: spacing.sm },
  input: { flex: 1, color: colors.white, fontSize: 15, minHeight: 44, paddingHorizontal: spacing.md },
});
