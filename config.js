import dotenv from "dotenv";

dotenv.config();

const DOMAIN = String(process.env.DOMAIN || "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");

export default {
  BOT_TOKEN: process.env.BOT_TOKEN,
  OWNER_ID: String(process.env.OWNER_ID || ""),

  CLOUDFLARE_TOKEN: process.env.CLOUDFLARE_TOKEN || "",
  CLOUDFLARE_ZONE_ID: process.env.CLOUDFLARE_ZONE_ID || "",

  // Dominio principal configurado durante la instalación.
  DOMAIN
};
