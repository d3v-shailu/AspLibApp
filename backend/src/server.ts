import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { initChatSocket } from "./sockets/chat";
import { startNoShowCron } from "./jobs/noShowCron";

const app = createApp();
const server = http.createServer(app);

initChatSocket(server);
startNoShowCron();

server.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[dlms-backend] listening on http://localhost:${env.port}`);
});
