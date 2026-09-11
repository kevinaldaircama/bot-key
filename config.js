import dotenv from "dotenv";

dotenv.config();

export default {
  BOT_TOKEN: process.env.BOT_TOKEN,
  OWNER_ID: String(process.env.OWNER_ID),

  CLOUDFLARE_TOKEN: process.env.CLOUDFLARE_TOKEN,
  CLOUDFLARE_ZONE_ID: process.env.CLOUDFLARE_ZONE_ID,

  DOMAIN: process.env.DOMAIN || "socialstreaming.xyz",

  // URL pública de License API configurada por install.sh
  LICENSE_API_URL: process.env.LICENSE_API_URL || ""
};
