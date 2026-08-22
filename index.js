import "./license-api.js";
import TelegramBot from "node-telegram-bot-api";
import config from "./config.js";

import registerStart, { registerMenuCallbacks } from "./handlers/start.js";
import registerHome from "./handlers/home.js";

import registerRequest from "./handlers/request.js";
import registerCallback from "./handlers/callback.js";
import registerApprove from "./handlers/approve.js";

import registerReseller from "./handlers/reseller.js";
import registerKey from "./handlers/key.js";
import registerFreeKey from "./handlers/key free.js";
import registerHistory from "./handlers/history.js";
import registerUsage from "./handlers/usage.js";
import registerStatistics from "./handlers/statistics.js";
import registerPlans from "./handlers/plans.js";

import registerDomainA from "./handlers/domainA.js";
import registerDomainNS from "./handlers/domainNS.js";
import registerDomains from "./handlers/domains.js";
import registerSettings from "./handlers/settings.js";
import registerActivations from "./handlers/watchActivations.js";

import startExpireTask from "./tasks/expireUsers.js";
import deleteExpiredKeys from "./handlers/deleteExpiredKeys.js";

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
// MÓDULOS
// ==========================

registerStart(bot);
registerMenuCallbacks(bot);
registerHome(bot);

registerRequest(bot);
registerCallback(bot);
registerApprove(bot);

registerReseller(bot);
registerKey(bot); 
registerHistory(bot);
registerSettings(bot);
registerUsage(bot);
registerStatistics(bot);
registerPlans(bot);
registerFreeKey(bot);
registerDomainA(bot, config);
registerDomainNS(bot, config);
registerDomains(bot, config);

registerActivations(bot);



startExpireTask(bot);
deleteExpiredKeys();

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