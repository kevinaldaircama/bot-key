import db from "../firebase.js";

const messageState = {};

export default function registerSettings(bot) {

bot.on("callback_query", async (query) => {

const chatId = String(query.message.chat.id);

switch (query.data) {

// ===================================
// MENU CONFIGURACIÓN
// ===================================

case "menu_settings":

await bot.answerCallbackQuery(query.id);

await bot.editMessageText(

`⚙️ <b>CONFIGURACIÓN</b>

━━━━━━━━━━━━━━━━━━

Seleccione una opción.`,

{
chat_id: chatId,
message_id: query.message.message_id,
parse_mode:"HTML",
reply_markup:{
inline_keyboard:[

[
{
text:"📨 Mensajes",
callback_data:"settings_messages"
},
{
text:"👥 Usuarios",
callback_data:"settings_users"
}
],

[
{
text:"📊 Estadísticas",
callback_data:"settings_stats"
},
{
text:"📜 Historial",
callback_data:"settings_history"
}
],

[
{
text:"🔒 Seguridad",
callback_data:"settings_security"
},
{
text:"☁️ Cloudflare",
callback_data:"settings_cloudflare"
}
],

[
{
text:"⬅️ Volver",
callback_data:"back_owner"
}
]

]
}
}

);

break;

// ===================================
// MENSAJES
// ===================================

case "settings_messages":

await bot.answerCallbackQuery(query.id);

await bot.editMessageText(

`📨 <b>MENSAJES</b>

━━━━━━━━━━━━━━━━━━

Seleccione una opción.`,

{
chat_id:chatId,
message_id:query.message.message_id,
parse_mode:"HTML",
reply_markup:{
inline_keyboard:[

[
{
text:"📢 Enviar a Todos",
callback_data:"broadcast_all"
}
],

[
{
text:"⬅️ Volver",
callback_data:"menu_settings"
}
]

]
}
}

);

break;

case "broadcast_all":

messageState[chatId]=true;

await bot.answerCallbackQuery(query.id);

await bot.sendMessage(chatId,

`📨 Envíe el mensaje que desea enviar a todos los usuarios.

Puede usar HTML y emojis.`,

{
parse_mode:"HTML"
});

break;
// ===================================
// USUARIOS
// ===================================

case "settings_users":

await bot.answerCallbackQuery(query.id);

await bot.editMessageText(

`👥 <b>GESTIÓN DE USUARIOS</b>

━━━━━━━━━━━━━━━━━━

Seleccione una opción.`,

{
chat_id:chatId,
message_id:query.message.message_id,
parse_mode:"HTML",
reply_markup:{
inline_keyboard:[

[
{
text:"✅ Aprobados",
callback_data:"users_approved"
},
{
text:"❌ Rechazados",
callback_data:"users_rejected"
}
],

[
{
text:"⏳ Pendientes",
callback_data:"users_pending"
},
{
text:"📋 Todos",
callback_data:"users_all"
}
],

[
{
text:"⬅️ Volver",
callback_data:"menu_settings"
}
]

]
}
}

);

break;

// ===================================
// APROBADOS
// ===================================

case "users_approved":{

const snap=await db.ref("users").get();

let text=`✅ <b>USUARIOS APROBADOS</b>

━━━━━━━━━━━━━━━━━━

`;

let total=0;

if(snap.exists()){

snap.forEach(item=>{

const u=item.val();

if(u.approved){

total++;

text+=`👤 ${u.name}
🆔 <code>${u.id}</code>
🎖 ${u.role}

`;

}

});

}

text+=`\n━━━━━━━━━━━━━━━━━━
Total: ${total}`;

await bot.editMessageText(text,{

chat_id:chatId,
message_id:query.message.message_id,
parse_mode:"HTML",

reply_markup:{
inline_keyboard:[
[
{
text:"⬅️ Volver",
callback_data:"settings_users"
}
]
]
}

});

break;

}

// ===================================
// RECHAZADOS
// ===================================

case "users_rejected":{

const snap=await db.ref("users").get();

let text=`❌ <b>USUARIOS RECHAZADOS</b>

━━━━━━━━━━━━━━━━━━

`;

let total=0;

if(snap.exists()){

snap.forEach(item=>{

const u=item.val();

if(!u.approved){

total++;

text+=`👤 ${u.name}
🆔 <code>${u.id}</code>

`;

}

});

}

text+=`\n━━━━━━━━━━━━━━━━━━
Total: ${total}`;

await bot.editMessageText(text,{

chat_id:chatId,
message_id:query.message.message_id,
parse_mode:"HTML",

reply_markup:{
inline_keyboard:[
[
{
text:"⬅️ Volver",
callback_data:"settings_users"
}
]
]
}

});

break;

}
// ===================================
// PENDIENTES
// ===================================

case "users_pending":{

const snap=await db.ref("users").get();

let text=`⏳ <b>USUARIOS PENDIENTES</b>

━━━━━━━━━━━━━━━━━━

`;

let total=0;

if(snap.exists()){

snap.forEach(item=>{

const u=item.val();

if(!u.approved && u.role==="user"){

total++;

text+=`👤 ${u.name}
🆔 <code>${u.id}</code>

`;

}

});

}

text+=`\n━━━━━━━━━━━━━━━━━━
Total: ${total}`;

await bot.editMessageText(text,{

chat_id:chatId,
message_id:query.message.message_id,
parse_mode:"HTML",

reply_markup:{
inline_keyboard:[
[
{
text:"⬅️ Volver",
callback_data:"settings_users"
}
]
]
}

});

break;

}

// ===================================
// TODOS LOS USUARIOS
// ===================================

case "users_all":{

const snap=await db.ref("users").get();

let text=`👥 <b>TODOS LOS USUARIOS</b>

━━━━━━━━━━━━━━━━━━

`;

let total=0;

if(snap.exists()){

snap.forEach(item=>{

const u=item.val();

total++;

text+=`👤 ${u.name}
🆔 <code>${u.id}</code>
🎖 ${u.role}
${u.approved?"✅":"❌"}

`;

});

}

text+=`\n━━━━━━━━━━━━━━━━━━
Total: ${total}`;

await bot.editMessageText(text,{

chat_id:chatId,
message_id:query.message.message_id,
parse_mode:"HTML",

reply_markup:{
inline_keyboard:[
[
{
text:"⬅️ Volver",
callback_data:"settings_users"
}
]
]
}

});

break;

}

// ===================================
// ESTADÍSTICAS
// ===================================

case "settings_stats":

await bot.answerCallbackQuery(query.id);

await bot.sendMessage(chatId,

"📊 Estadísticas disponibles próximamente.",

{
parse_mode:"HTML"
});

break;

// ===================================
// HISTORIAL
// ===================================

case "settings_history":

await bot.answerCallbackQuery(query.id);

await bot.sendMessage(chatId,

"📜 Historial disponible próximamente.",

{
parse_mode:"HTML"
});

break;

// ===================================
// SEGURIDAD
// ===================================

case "settings_security":

await bot.answerCallbackQuery(query.id);

await bot.sendMessage(chatId,

"🔒 Panel de seguridad próximamente.",

{
parse_mode:"HTML"
});

break;

// ===================================
// CLOUDFLARE
// ===================================

case "settings_cloudflare":

await bot.answerCallbackQuery(query.id);

await bot.sendMessage(chatId,

"☁️ Panel Cloudflare próximamente.",

{
parse_mode:"HTML"
});

break;
default:
break;
// ===================================
// FIN DEL SWITCH
// ===================================

}

});

// ===================================
// ENVIAR MENSAJE A TODOS
// ===================================

bot.on("message", async (msg) => {

const chatId = String(msg.chat.id);

if (!messageState[chatId]) return;

if (!msg.text) return;

delete messageState[chatId];

const snap = await db.ref("users").get();

if (!snap.exists()) {

return bot.sendMessage(chatId,
"❌ No existen usuarios registrados.");

}

let enviados = 0;
let errores = 0;

const usuarios = [];

snap.forEach(item => {

usuarios.push(item.key);

});

for (const id of usuarios) {

try {

await bot.sendMessage(id, msg.text, {
parse_mode: "HTML"
});

enviados++;

} catch {

errores++;

}

}

await bot.sendMessage(chatId,

`✅ <b>Mensaje enviado correctamente</b>

━━━━━━━━━━━━━━━━━━

📤 Enviados:
<b>${enviados}</b>

❌ Errores:
<b>${errores}</b>

━━━━━━━━━━━━━━━━━━`,

{
parse_mode:"HTML"
});

});

// ===================================
// FIN DEL MÓDULO
// ===================================

}
