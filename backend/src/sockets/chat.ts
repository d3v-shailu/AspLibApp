import { Server as HttpServer } from "http";
import { Server as IoServer, Socket } from "socket.io";
import { pool } from "../config/db";
import { verifyToken } from "../utils/jwt";
import { ChannelRow } from "../types";

/**
 * Real-time chat over Socket.io.
 * Client connects with: io(URL, { auth: { token: "<jwt>" } })
 * then emits `join` with { channel_id } and `message` with { channel_id, message }.
 *
 * Access rule (backend-enforced):
 *   channel.library_id == user.library_id
 *   AND (channel.gender == user.gender OR channel.gender == 'all')
 */
export function initChatSocket(httpServer: HttpServer): IoServer {
  const io = new IoServer(httpServer, {
    cors: { origin: "*" },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Authentication required"));
    try {
      const payload = verifyToken(token);
      if (payload.must_reset_password) return next(new Error("Password reset required"));
      (socket.data as { user: unknown }).user = payload;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as { sub: string; role: string; library_id: string | null };

    socket.on("join", async ({ channel_id }: { channel_id: string }) => {
      try {
        const { rows } = await pool.query<ChannelRow>(
          `SELECT c.*, u.gender AS user_gender
           FROM chat_channels c, users u
           WHERE c.id = $1 AND u.id = $2
             AND c.library_id = u.library_id
             AND (c.gender = u.gender OR c.gender = 'all')`,
          [channel_id, user.sub]
        );
        if (!rows[0]) return socket.emit("error", { message: "Channel not allowed" });
        socket.join(`channel:${channel_id}`);
        socket.emit("joined", { channel_id });
      } catch {
        socket.emit("error", { message: "Could not join channel" });
      }
    });

    socket.on("message", async ({ channel_id, message }: { channel_id: string; message: string }) => {
      try {
        if (!message?.trim()) return;
        const { rows } = await pool.query<ChannelRow>(
          `SELECT c.id FROM chat_channels c, users u
           WHERE c.id = $1 AND u.id = $2
             AND c.library_id = u.library_id
             AND (c.gender = u.gender OR c.gender = 'all')`,
          [channel_id, user.sub]
        );
        if (!rows[0]) return socket.emit("error", { message: "Channel not allowed" });

        const saved = await pool.query(
          `INSERT INTO chat_messages (channel_id, sender_id, message) VALUES ($1,$2,$3) RETURNING *`,
          [channel_id, user.sub, message.trim()]
        );
        io.to(`channel:${channel_id}`).emit("message", saved.rows[0]);
      } catch {
        socket.emit("error", { message: "Could not send message" });
      }
    });
  });

  return io;
}
