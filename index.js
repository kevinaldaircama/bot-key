import TelegramBot from "node-telegram-bot-api";
import config from "./config.js";

// Panel principal
import registerStart, { registerMenuCallbacks } from "./handlers/start.js";
import registerHome from "./handlers/home.js";

// Solicitudes
import registerRequest from "./handlers/request.js";
import registerCallback from "./handlers/callback.js";
import registerApprove from "./handlers/approve.js";

// Panel
import registerReseller from "./handlers/reseller.js";
import registerKey from "./handlers/key.js";
import registerInstaller from "./handlers/installer.js";
import registerHistory from "./handlers/history.js";
import registerUsage from "./handlers/usage.js";
import registerStatistics from "./handlers/statistics.js";
import registerVPS from "./handlers/vps.js";
import registerPlans from "./handlers/plans.js";

const bot = new TelegramBot(config.BOT_TOKEN, {
    polling: true
});

console.clear();

console.log("========================================");
console.log("     🚀 MULTI SCRIPT VPN BOT");
console.log("========================================");
console.log("🤖 Bot iniciado correctamente");
console.log("========================================");

// ==========================
// INICIAR MÓDULOS
// ==========================

registerStart(bot);
registerMenuCallbacks(bot);
registerHome(bot);

registerRequest(bot);
registerCallback(bot);
registerApprove(bot);

registerReseller(bot);
registerKey(bot);
registerInstaller(bot);
registerHistory(bot);
registerUsage(bot);
registerStatistics(bot);
registerVPS(bot);
registerPlans(bot);

// ==========================
// ERRORES
// ==========================

bot.on("polling_error", (err) => {

    console.log("Polling Error:", err.message);

});

bot.on("webhook_error", (err) => {

    console.log("Webhook Error:", err.message);

});

process.on("uncaughtException", (err) => {

    console.log("Uncaught Exception:", err);

});

process.on("unhandledRejection", (err) => {

    console.log("Unhandled Rejection:", err);

});
