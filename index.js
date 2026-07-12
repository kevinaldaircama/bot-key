import TelegramBot from "node-telegram-bot-api";
import config from "./config.js";

import registerStart from "./handlers/start.js";
import registerRequest from "./handlers/request.js";
import registerCallback from "./handlers/callback.js";
import registerApprove from "./handlers/approve.js";


const bot = new TelegramBot(config.BOT_TOKEN,{
    polling:true
});

console.clear();

console.log("=================================");
console.log("MULTI SCRIPT VPN BOT");
console.log("=================================");

registerStart(bot);
registerRequest(bot);
registerCallback(bot);
registerApprove(bot);


bot.on("polling_error",console.log);
