import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

const DEV_JWT_FALLBACK = "point001_jwt_secret_dev_key_replace_in_prod_123456";
const DEV_ENCRYPTION_FALLBACK = "0123456789abcdef0123456789abcdef";

const rawJwtSecret = process.env.JWT_SECRET;
const rawEncryptionKey = process.env.ENCRYPTION_KEY;

if (isProduction) {
  if (!rawJwtSecret || rawJwtSecret === DEV_JWT_FALLBACK) {
    console.warn(
      "\x1b[33m[SECURITY NOTICE] JWT_SECRET is using the development fallback. For full production security, configure a unique JWT_SECRET in your host environment variables.\x1b[0m"
    );
  }

  if (!rawEncryptionKey || rawEncryptionKey === DEV_ENCRYPTION_FALLBACK) {
    console.warn(
      "\x1b[33m[SECURITY NOTICE] ENCRYPTION_KEY is using the development fallback. For full production security, configure a unique ENCRYPTION_KEY in your host environment variables.\x1b[0m"
    );
  }
}

export const config = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  JWT_SECRET: rawJwtSecret || DEV_JWT_FALLBACK,
  ENCRYPTION_KEY: rawEncryptionKey || DEV_ENCRYPTION_FALLBACK,
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
};

export default config;
