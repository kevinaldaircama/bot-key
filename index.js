import TelegramBot from "node-telegram-bot-api";
import config from "./config.js";
import "./firebase.js";

import registerStart from "./handlers/start.js";

const bot = new TelegramBot(config.BOT_TOKEN, {
  polling: true
});

console.clear();

console.log("=================================");
console.log("🚀 MULTI SCRIPT VPN BOT");
console.log("=================================");
console.log("✅ Bot iniciado correctamente");

registerStart(bot);

bot.on("polling_error", (error) => {
  console.log(error.message);
});
