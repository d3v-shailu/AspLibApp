import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || "4000", 10),
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "dev-insecure-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigin: process.env.CORS_ORIGIN || "*",
};

if (!env.databaseUrl) {
  // eslint-disable-next-line no-console
  console.warn("[config] DATABASE_URL is not set — DB calls will fail.");
}
