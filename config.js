import dotenv from "dotenv";

dotenv.config();

export default {
  BOT_TOKEN: process.env.BOT_TOKEN,
  OWNER_ID: String(process.env.OWNER_ID),
  FIREBASE_CREDENTIALS: process.env.FIREBASE_CREDENTIALS,

  CLOUDFLARE_TOKEN: process.env.CLOUDFLARE_TOKEN,
  CLOUDFLARE_ZONE_ID: process.env.CLOUDFLARE_ZONE_ID,

  DOMAIN: "socialstreaming.xyz"
};
