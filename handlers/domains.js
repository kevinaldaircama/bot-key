import db from "../firebase.js";      
      
export default function registerDomains(bot) {      
      
bot.on("callback_query", async (query) => {      
      
const chatId = String(query.message.chat.id);      
      
if (query.data !== "menu_domains") return;      
      
await bot.answerCallbackQuery(query.id);      
      
const snap = await db.ref(`domains/${chatId}`).get();      
      
if (!snap.exists()) {      
      
return bot.editMessageText(      
      
`📁 <b>MIS DOMINIOS</b>      
      
━━━━━━━━━━━━━━━━━━      
      
No tienes dominios registrados.`,      
      
{      
chat_id: chatId,      
message_id: query.message.message_id,      
parse_mode: "HTML",      
reply_markup: {      
inline_keyboard: [      
      
[      
{      
text: "⬅️ Volver",      
callback_data: "menu_home"      
}      
]      
      
]      
}      
}      
      
);      
      
}      
      
const data = snap.val();      
      
const keyboard = [];

// Dominios A
for (const key in data) {
  if (key === "ns") continue;
  keyboard.push([
    {
      text: `🌐 ${data[key].domain}`,
      callback_data: `domain_view_${key}`
    }
  ]);
}

// Registros NS
if (data.ns) {
  for (const key in data.ns) {
    keyboard.push([
      {
        text: `🧩 ${data.ns[key].domain}`,
        callback_data: `ns_view_${key}`
      }
    ]);
  }
}

keyboard.push([{ text: "⬅️ Volver", callback_data: "menu_home" }]);

await bot.editMessageText("📁 <b>MIS DOMINIOS</b>", {
  chat_id: chatId,
  message_id: query.message.message_id,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: keyboard
  }
});
      
});      
      
}
