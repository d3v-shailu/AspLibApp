import { api } from "./api";
import { ChatChannel, ChatMessage } from "../types";

export const chatService = {
  /** Student: only their allowed channels. Admin: all library channels. */
  async channels(role: string): Promise<ChatChannel[]> {
    const base = role === "admin" ? "/admin" : "/student";
    const { data } = await api.get<{ channels: ChatChannel[] }>(`${base}/channels`);
    return data.channels;
  },

  async messages(role: string, channelId: string): Promise<ChatMessage[]> {
    const base = role === "admin" ? "/admin" : "/student";
    const { data } = await api.get<{ messages: ChatMessage[] }>(`${base}/channels/${channelId}/messages`);
    return data.messages;
  },

  async send(role: string, channelId: string, message: string): Promise<ChatMessage> {
    const base = role === "admin" ? "/admin" : "/student";
    const { data } = await api.post<{ message: ChatMessage }>(`${base}/channels/${channelId}/messages`, { message });
    return data.message;
  },

  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    await api.delete(`/admin/channels/${channelId}/messages/${messageId}`);
  },
};
