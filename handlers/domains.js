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
callback_data: "back_home"
}
]

]
}
}

);

}

const data = snap.val();

let text = `📁 <b>MIS DOMINIOS</b>\n\n━━━━━━━━━━━━━━━━━━\n\n`;

if (data) {

for (const key in data) {

if (key === "ns") continue;

const item = data[key];

text +=
`🌐 <b>${item.domain}</b>

📡 ${item.ip}

━━━━━━━━━━━━━━━━━━

`;

}

if (data.ns) {

text += "\n🧩 <b>REGISTROS NS</b>\n\n";

for (const ns in data.ns) {

const item = data.ns[ns];

text +=
`🧩 ${item.domain}

➡️ ${item.target}

━━━━━━━━━━━━━━━━━━

`;

}

}

}

await bot.editMessageText(text,{

chat_id:chatId,

message_id:query.message.message_id,

parse_mode:"HTML",

reply_markup:{

inline_keyboard:[

[
{
text:"🔄 Actualizar",
callback_data:"menu_domains"
}
],

[
{
text:"⬅️ Volver",
callback_data:"back_home"
}
]

]

}

});

});

}
