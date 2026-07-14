import db from "../firebase.js";

const DOMAIN = "socialstreaming.xyz";
const API = "https://api.cloudflare.com/client/v4";

const usersState = {};

export default function registerDomainNS(bot, config) {

bot.on("callback_query", async (query) => {

const chatId = String(query.message.chat.id);

if (query.data !== "menu_domain_ns") return;

await bot.answerCallbackQuery(query.id);

await bot.editMessageText(

`🧩 <b>REGISTRO NS</b>

━━━━━━━━━━━━━━━━━━

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
text: "➕ Crear Registro NS",
callback_data: "domain_ns_create"
}
],

[
{
text: "📋 Mis Registros NS",
callback_data: "domain_ns_list"
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

bot.on("callback_query", async (query)=>{

const chatId=String(query.message.chat.id);

if(query.data!=="domain_ns_create") return;

usersState[chatId]={
step:"WAIT_NS_NAME"
};

await bot.answerCallbackQuery(query.id);

await bot.sendMessage(chatId,

`📝 Escriba el nombre del NS.

Ejemplo:

<code>ns1</code>`,

{
parse_mode:"HTML"
});

});
// ==============================
// RECIBIR NOMBRE Y DESTINO
// ==============================

bot.on("message", async (msg) => {

const chatId = String(msg.chat.id);

if (!usersState[chatId]) return;
if (!msg.text) return;

const state = usersState[chatId];

// ==============================
// NOMBRE DEL NS
// ==============================

if (state.step === "WAIT_NS_NAME") {

const ns = msg.text
.trim()
.toLowerCase()
.replace(/[^a-z0-9-]/g, "");

if (!ns.length) {

return bot.sendMessage(chatId,
"❌ Nombre inválido.");

}

state.ns = ns;

state.step = "WAIT_TARGET";

return bot.sendMessage(chatId,

`🌐 Escriba el nombre del subdominio destino.

Ejemplos:

<code>panel</code>

<code>vpn</code>

<code>server1</code>

Se creará:

<code>${ns}.socialstreaming.xyz</code>

Apuntando hacia:

<code>panel.socialstreaming.xyz</code>`,
{
parse_mode:"HTML"
});

}

// ==============================
// DESTINO
// ==============================

if (state.step === "WAIT_TARGET") {

const target = msg.text
.trim()
.toLowerCase()
.replace(/[^a-z0-9-]/g, "");

if (!target.length) {

return bot.sendMessage(chatId,
"❌ Destino inválido.");

}

state.target = target;

await bot.sendMessage(chatId,

`⏳ Creando registro...

🧩 ${state.ns}.socialstreaming.xyz

➡️ ${state.target}.socialstreaming.xyz`);
// ==============================
// CREAR REGISTRO NS
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

type: "NS",

name: state.ns,

content: `${state.target}.${DOMAIN}`,

ttl: 1

})
}
);

const result = await response.json();

if (!result.success) {

delete usersState[chatId];

return bot.sendMessage(chatId,

`❌ Error al crear el Registro NS.

<code>${JSON.stringify(result.errors, null, 2)}</code>`,

{
parse_mode: "HTML"
});

}

// ==============================
// GUARDAR EN FIREBASE
// ==============================

await db.ref(`domains/${chatId}/ns/${state.ns}`).set({

recordId: result.result.id,

type: "NS",

name: state.ns,

domain: `${state.ns}.${DOMAIN}`,

target: `${state.target}.${DOMAIN}`,

createdAt: Date.now()

});

// ==============================
// RESPUESTA
// ==============================

await bot.sendMessage(chatId,

`✅ <b>Registro NS creado correctamente</b>

━━━━━━━━━━━━━━━━━━

🧩 Nombre

<code>${state.ns}.${DOMAIN}</code>

➡️ Destino

<code>${state.target}.${DOMAIN}</code>

☁️ Estado

Activo

━━━━━━━━━━━━━━━━━━`,

{
parse_mode: "HTML"
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
