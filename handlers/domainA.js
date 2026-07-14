import db from "../firebase.js";

const DOMAIN = "socialstreaming.xyz";
const API = "https://api.cloudflare.com/client/v4";

const usersState = {};

// ==============================
// REGISTRAR CALLBACKS
// ==============================

export default function registerDomainA(bot, config) {

bot.on("callback_query", async (query) => {

const chatId = String(query.message.chat.id);

if (query.data !== "menu_domain_a") return;

await bot.answerCallbackQuery(query.id);

await bot.editMessageText(

`🌐 <b>REGISTRO A</b>

━━━━━━━━━━━━━━━━━━

Con esta opción podrás crear un Registro A en Cloudflare.

Dominio:

<code>${DOMAIN}</code>

Seleccione una opción.`,

{
chat_id: chatId,
message_id: query.message.message_id,
parse_mode: "HTML",
reply_markup: {
inline_keyboard: [

[
{
text: "➕ Crear Registro A",
callback_data: "domain_a_create"
}
],

[
{
text: "📋 Mis Registros",
callback_data: "domain_a_list"
}
],

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

});

// ==============================
// CREAR REGISTRO A
// ==============================

bot.on("callback_query", async (query) => {

const chatId = String(query.message.chat.id);

if (query.data !== "domain_a_create") return;

usersState[chatId] = {
step: "WAIT_IP"
};

await bot.answerCallbackQuery(query.id);

await bot.sendMessage(chatId,

`📡 <b>Ingrese la IP del servidor</b>

Ejemplo:

<code>104.16.120.10</code>`,

{
parse_mode: "HTML"
}

);

});
  // ==============================
// RECIBIR IP Y NOMBRE
// ==============================

bot.on("message", async (msg) => {

const chatId = String(msg.chat.id);

if (!usersState[chatId]) return;

if (!msg.text) return;

const state = usersState[chatId];

// ==============================
// ESPERANDO IP
// ==============================

if (state.step === "WAIT_IP") {

const ip = msg.text.trim();

const ipv4 =
/^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

if (!ipv4.test(ip)) {

return bot.sendMessage(chatId,

"❌ IP inválida.\n\nEjemplo:\n<code>104.16.120.10</code>",

{
parse_mode:"HTML"
});

}

state.ip = ip;
state.step = "WAIT_NAME";

return bot.sendMessage(chatId,

`✍️ Escriba el nombre del subdominio.

Ejemplo:

<code>panel</code>

Se creará:

<code>panel.${DOMAIN}</code>`,

{
parse_mode:"HTML"
});

}

// ==============================
// ESPERANDO NOMBRE
// ==============================

if (state.step === "WAIT_NAME") {

const name = msg.text
.trim()
.toLowerCase()
.replace(/[^a-z0-9-]/g,"");

if (!name.length) {

return bot.sendMessage(chatId,

"❌ Nombre inválido.");

}

state.name = name;

await bot.sendMessage(chatId,

`⏳ Creando registro...

🌐 ${name}.${DOMAIN}
📡 ${state.ip}`);
  }
  // ==============================
// CREAR REGISTRO EN CLOUDFLARE
// ==============================

try {

const response = await fetch(
`${API}/zones/${config.CLOUDFLARE_ZONE_ID}/dns_records`,
{
method: "POST",
headers: {
Authorization: `Bearer ${config.CLOUDFLARE_TOKEN}`,
"Content-Type": "application/json"
},
body: JSON.stringify({

type: "A",

name: `${state.name}.${DOMAIN}`,

content: state.ip,

ttl: 1,

proxied: true

})
}
);

const result = await response.json();

if (!result.success) {

delete usersState[chatId];

return bot.sendMessage(chatId,

`❌ Cloudflare devolvió un error.

<code>${JSON.stringify(result.errors,null,2)}</code>`,

{
parse_mode:"HTML"
});

}

// ==============================
// GUARDAR EN FIREBASE
// ==============================

await db.ref(`domains/${chatId}/${state.name}`).set({

recordId: result.result.id,

type: "A",

domain: `${state.name}.${DOMAIN}`,

name: state.name,

ip: state.ip,

createdAt: Date.now()

});

// ==============================
// RESPUESTA
// ==============================

await bot.sendMessage(chatId,

`✅ <b>Registro creado correctamente</b>

━━━━━━━━━━━━━━━━━━

🌐 Dominio

<code>${state.name}.${DOMAIN}</code>

📡 IP

<code>${state.ip}</code>

☁️ Cloudflare

Registro A activo.

━━━━━━━━━━━━━━━━━━`,

{
parse_mode:"HTML"
});

delete usersState[chatId];

} catch (err) {

console.log(err);

delete usersState[chatId];

await bot.sendMessage(chatId,

"❌ Error al conectar con Cloudflare.");

}

}

});
