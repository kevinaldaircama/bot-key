import TelegramBot from "node-telegram-bot-api";

import config from "./config.js";

import db from "./firebase.js";

const bot = new TelegramBot(config.BOT_TOKEN, {

polling: true

});

console.clear();

console.log("==============================");

console.log("MULTI SCRIPT VPN BOT");

console.log("==============================");

console.log("Bot iniciado correctamente.");

bot.onText(/\/start/, async (msg) => {

const chatId = msg.chat.id;

const name = msg.from.first_name;

const snapshot = await db.ref("users/" + chatId).get();

if (!snapshot.exists()) {

await db.ref("users/" + chatId).set({

id: chatId,

name,

username: msg.from.username || "",

role: "user",

approved: false,

created: Date.now()

});

}

bot.sendMessage(chatId,

`🚀 *Multi Script VPN Premium*

Bienvenido ${name}.

Tu cuenta ha sido registrada correctamente.

Próximamente aparecerá el sistema de solicitudes.

`,{

parse_mode:"Markdown"

});

});

bot.on("polling_error", console.log);
