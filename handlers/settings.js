import db from "../db.js";          
import { pendingApprovals } from "./callback.js";          
const messageState = {};          
const userAction = {};       
const couponState = {};
const couponData = {};   
const USERS_PER_PAGE = 20;

async function showUsersPage(bot, chatId, messageId, page = 0) {

    const snap = await db.ref("users").get();

    if (!snap.exists()) {
        return bot.editMessageText(
            "❌ No existen usuarios registrados.",
            {
                chat_id: chatId,
                message_id: messageId
            }
        );
    }

    const users = [];

    snap.forEach(item => {
        users.push({
            id: item.key,
            ...item.val()
        });
    });

    const totalUsers = users.length;
    const totalPages = Math.max(1, Math.ceil(totalUsers / USERS_PER_PAGE));

    if (page < 0) page = 0;
    if (page >= totalPages) page = totalPages - 1;

    const start = page * USERS_PER_PAGE;
    const end = start + USERS_PER_PAGE;

    let text = `👥 <b>TODOS LOS USUARIOS</b>

━━━━━━━━━━━━━━━━━━

`;

    users.slice(start, end).forEach(u => {

        const estado = u.banned
            ? "🚫 Baneado"
            : (u.approved ? "✅ Activo" : "❌ Sin acceso");

        text +=
`👤 ${u.name || "Sin nombre"}
🆔 <code>${u.id}</code>
🎖 ${u.role || "user"}
📌 ${estado}

`;
    });

    text += `━━━━━━━━━━━━━━━━━━

👥 Total: <b>${totalUsers}</b>

📄 Página <b>${page + 1}</b> de <b>${totalPages}</b>`;

    const buttons = [];

    if (page > 0) {
        buttons.push({
            text: "⬅️ Anterior",
            callback_data: `users_page_${page - 1}`
        });
    }

    if (page < totalPages - 1) {
        buttons.push({
            text: "➡️ Siguiente",
            callback_data: `users_page_${page + 1}`
        });
    }

    const keyboard = [];

    if (buttons.length) keyboard.push(buttons);

    keyboard.push([
        {
            text: "⬅️ Volver",
            callback_data: "settings_users"
        }
    ]);

    await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: keyboard
        }
    });

}          
export default function registerSettings(bot) {          
          
bot.on("callback_query", async (query) => {          
          
const chatId = String(query.message.chat.id);          
          
const me = (await db.ref(`users/${chatId}`).get()).val();          
          
if (!me) {          
return bot.answerCallbackQuery(query.id,{          
text:"Acceso denegado.",          
show_alert:true          
});          
}          
          
const ownerOnly = [      
"settings_users",      
"users_allow",      
"users_remove",      
"users_ban",      
"users_unban"      
];      
          
if (ownerOnly.includes(query.data) && me.role !== "owner") {          
return bot.answerCallbackQuery(query.id,{          
text:"Solo el dueño puede administrar usuarios.",          
show_alert:true          
});          
}          
          
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
chat_id:chatId,          
message_id:query.message.message_id,          
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
text:"🎟 Cupones",
callback_data:"settings_coupons"
}
],
       
[          
{          
text:"⬅️ Volver",          
callback_data:"menu_home"          
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
          
messageState[chatId] = true;          
          
await bot.answerCallbackQuery(query.id);          
          
await bot.sendMessage(          
chatId,          
          
`📨 <b>ENVIAR MENSAJE GLOBAL</b>          
          
━━━━━━━━━━━━━━━━━━          
          
Escriba el mensaje que desea enviar a todos los usuarios.          
          
Puede utilizar HTML y emojis.`,          
          
{          
parse_mode:"HTML"          
});          
          
break;          
          
// ===================================          
// GESTIÓN DE USUARIOS          
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
text:"✅ Dar acceso",          
callback_data:"users_allow"          
},          
{          
text:"🚫 Banear",          
callback_data:"users_ban"          
}          
],          
          
[      
{      
text:"🔓 Desbanear",      
callback_data:"users_unban"      
},      
{      
text:"❌ Quitar acceso",      
callback_data:"users_remove"      
}      
],      
      
[      
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
// DAR ACCESO          
// ===================================          
          
case "users_allow":          
          
userAction[chatId] = "allow";          
          
await bot.answerCallbackQuery(query.id);          
          
await bot.sendMessage(          
          
chatId,          
          
`✅ <b>DAR ACCESO</b>          
          
━━━━━━━━━━━━━━━━━━          
          
Envíe el ID del usuario.`,          
          
{          
parse_mode:"HTML"          
}          
          
);          
          
break;          
          
// ===================================          
// BANEAR          
// ===================================          
          
case "users_ban":          
          
userAction[chatId] = "ban";          
          
await bot.answerCallbackQuery(query.id);          
          
await bot.sendMessage(          
          
chatId,          
          
`🚫 <b>BANEAR USUARIO</b>          
          
━━━━━━━━━━━━━━━━━━          
          
Envíe el ID del usuario.`,          
          
{          
parse_mode:"HTML"          
}          
          
);          
          
break;          
    case "users_unban":      
      
userAction[chatId] = "unban";      
      
await bot.answerCallbackQuery(query.id);      
      
await bot.sendMessage(      
chatId,      
      
`🔓 <b>DESBANEAR USUARIO</b>      
      
━━━━━━━━━━━━━━━━━━      
      
Envíe el ID del usuario.`,      
      
{      
parse_mode:"HTML"      
});      
      
break;      
// ===================================          
// QUITAR ACCESO          
// ===================================          
          
case "users_remove":          
          
userAction[chatId] = "remove";          
          
await bot.answerCallbackQuery(query.id);          
          
await bot.sendMessage(          
          
chatId,          
          
`❌ <b>QUITAR ACCESO</b>          
          
━━━━━━━━━━━━━━━━━━          
          
Envíe el ID del usuario.`,          
          
{          
parse_mode:"HTML"          
}          
          
);          
          
break;        

case "settings_coupons":

await bot.answerCallbackQuery(query.id);

await bot.editMessageText(

`🎟 <b>GESTIÓN DE CUPONES</b>

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
text:"➕ Crear Cupón",
callback_data:"coupon_create"
}
],

[
{
text:"📋 Ver Cupones",
callback_data:"coupon_list"
},
{
text:"🗑 Eliminar",
callback_data:"coupon_delete"
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

});

break;  
case "coupon_create":

couponState[chatId] = "code";

await bot.answerCallbackQuery(query.id);

await bot.sendMessage(chatId,

`🎟 <b>CREAR CUPÓN</b>

━━━━━━━━━━━━━━━━━━

Escribe el código del cupón.

Ejemplo:

<code>ktt</code>`,

{
parse_mode:"HTML"
});

break;

case "coupon_list": {

await bot.answerCallbackQuery(query.id);

const snap = await db.ref("coupons").get();

let text = `🎟 <b>CUPONES REGISTRADOS</b>

━━━━━━━━━━━━━━━━━━

`;

let total = 0;

if (snap.exists()) {

    snap.forEach(item => {

        const c = item.val();

        total++;

        const estado = c.enabled ? "🟢 Activo" : "🔴 Desactivado";

        text += `🎟 <b>${c.code}</b>
📅 ${c.days} día(s)
👥 ${c.used || 0}/${c.uses || 1}
📌 ${estado}

`;

    });

} else {

    text += "No hay cupones registrados.\n\n";

}

text += `━━━━━━━━━━━━━━━━━━

Total: <b>${total}</b>`;

if (text.length > 4000) {
    text = text.slice(0, 3900) + "\n\n... y más cupones";
}
await bot.editMessageText(text, {
    chat_id: chatId,
    message_id: query.message.message_id,
    parse_mode: "HTML",
    reply_markup: {
        inline_keyboard: [
            [
                {
                    text: "⬅️ Volver",
                    callback_data: "settings_coupons"
                }
            ]
        ]
    }
});

break;

}

case "coupon_delete":

couponState[chatId] = "delete";

await bot.answerCallbackQuery(query.id);

await bot.sendMessage(chatId,

`🗑 <b>ELIMINAR CUPÓN</b>

━━━━━━━━━━━━━━━━━━

Escribe el código del cupón que deseas eliminar.`,

{
parse_mode:"HTML"
});

break;
// ===================================          
// TODOS LOS USUARIOS          
// ===================================          
          
case "users_all":

await bot.answerCallbackQuery(query.id);

await showUsersPage(
    bot,
    chatId,
    query.message.message_id,
    0
);

break;

// ===============================
// CAMBIO DE PÁGINA
// ===============================

default:

if (query.data.startsWith("users_page_")) {

    await bot.answerCallbackQuery(query.id);

    const page = parseInt(
        query.data.replace("users_page_", "")
    );

    await showUsersPage(
        bot,
        chatId,
        query.message.message_id,
        page
    );

    return;

}

break;          
}          
          
});          
         
// ===================================        
// PROCESAR ACCIONES Y MENSAJES        
// ===================================        
        
bot.on("message", async (msg) => {        
        
const chatId = String(msg.chat.id);        
        
if (!msg.text) return;        
        
// ===================================        
// DAR ACCESO / BANEAR / QUITAR ACCESO        
// ===================================        
  // ===================================
// CREAR CUPÓN
// ===================================

if (couponState[chatId]) {

    const estado = couponState[chatId];
if (estado === "delete") {

    const code = msg.text.trim().toLowerCase();

    const ref = db.ref(`coupons/${code}`);
    const snap = await ref.get();

    if (!snap.exists()) {

        return bot.sendMessage(chatId,
        "❌ Ese cupón no existe.");
    }

    await ref.remove();

    delete couponState[chatId];

    return bot.sendMessage(chatId,

`🗑 <b>CUPÓN ELIMINADO</b>

━━━━━━━━━━━━━━━━━━

🎟 Código:
<code>${code}</code>`,

{
parse_mode:"HTML"
});

}
    if (estado === "code") {

        couponData[chatId] = {
            code: msg.text.trim().toLowerCase()
        };

        couponState[chatId] = "days";

        return bot.sendMessage(chatId,

`📅 <b>DÍAS DEL CUPÓN</b>

━━━━━━━━━━━━━━━━━━

Escribe cuántos días otorgará.

Ejemplo:

7
30
90
365`,

{
parse_mode:"HTML"
});

    }

    if (estado === "days") {

        const days = Number(msg.text);

        if (isNaN(days) || days <= 0) {

            return bot.sendMessage(chatId,
            "❌ Ingresa un número válido.");
        }

        const code = couponData[chatId].code;

        await db.ref(`coupons/${code}`).set({

            code,

            days,

            uses: 1,

            used: 0,

            enabled: true,

            createdAt: Date.now()

        });

        delete couponState[chatId];
        delete couponData[chatId];

        return bot.sendMessage(chatId,

`✅ <b>CUPÓN CREADO</b>

━━━━━━━━━━━━━━━━━━

🎟 Código:
<code>${code}</code>

📅 Días:
<b>${days}</b>

👥 Usos:
<b>1</b>`,

{
parse_mode:"HTML"
});

    }

}
      
if (userAction[chatId]) {        
        
const action = userAction[chatId];        
delete userAction[chatId];        
        
const userId = msg.text.trim();        
        
const ref = db.ref(`users/${userId}`);      
const snap = await ref.get();      
      
if (!snap.exists()) {      
      
    return bot.sendMessage(      
        chatId,      
        "❌ Usuario no encontrado.",      
        {      
            parse_mode:"HTML"      
        }      
    );      
      
}      
      
const user = snap.val();      
      
if (user.banned && action !== "unban") {      
    return bot.sendMessage(      
        chatId,      
        "❌ El usuario está baneado. Desbanéalo primero."      
    );      
}      
        
switch (action) {        
        
case "allow":      
      
if (user.role === "admin" && user.approved) {      
    return bot.sendMessage(      
        chatId,      
        "⚠️ Ese usuario ya es administrador.",      
        { parse_mode: "HTML" }      
    );      
}      
      
pendingApprovals.set(String(msg.from.id), userId);      
      
await bot.sendMessage(      
chatId,      
      
`✅ <b>Aprobar Usuario</b>      
      
━━━━━━━━━━━━━━━━━━      
      
Selecciona el tiempo de acceso para este usuario.      
      
━━━━━━━━━━━━━━━━━━`,      
      
{      
parse_mode: "HTML",      
reply_markup: {      
inline_keyboard: [      
      
[      
{ text: "7 Días", callback_data: "days_7" },      
{ text: "30 Días", callback_data: "days_30" }      
],      
      
[      
{ text: "60 Días", callback_data: "days_60" },      
{ text: "90 Días", callback_data: "days_90" }      
],      
      
[      
{ text: "365 Días", callback_data: "days_365" }      
],      
      
[      
{ text: "♾️ Ilimitado", callback_data: "days_0" }      
],      
      
[      
{ text: "❌ Cancelar", callback_data: "cancel_request" }      
]      
      
]      
}      
}      
);      
      
break;      
        
case "ban":        
        
await ref.update({        
approved:false,        
banned:true        
});        
        
await bot.sendMessage(        
        
chatId,        
        
`🚫 <b>Usuario baneado</b>        
        
━━━━━━━━━━━━━━━━━━        
        
🆔 <code>${userId}</code>        
        
El usuario ha sido bloqueado.`,        
        
{        
parse_mode:"HTML"        
}        
        
);        
        
break;        
  case "unban":      
      
await ref.update({      
banned:false
});      
      
await bot.sendMessage(      
chatId,      
      
`🔓 <b>Usuario desbaneado</b>      
      
━━━━━━━━━━━━━━━━━━      
      
🆔 <code>${userId}</code>      
      
El usuario puede volver a solicitar acceso.`,      
      
{      
parse_mode:"HTML"      
});      
      
break;      
case "remove":        
        
await ref.update({        
approved:false,        
banned:false,        
role: "user"       
});        
        
await bot.sendMessage(        
        
chatId,        
        
`❌ <b>Acceso eliminado</b>        
        
━━━━━━━━━━━━━━━━━━        
        
🆔 <code>${userId}</code>        
        
El usuario ya no tiene acceso.`,        
        
{        
parse_mode:"HTML"        
}        
        
);        
        
break;        
        
}        
        
return;        
        
}        
        
// ===================================        
// MENSAJE GLOBAL        
// ===================================        
        
if (!messageState[chatId]) return;        
        
delete messageState[chatId];        
        
const snap = await db.ref("users").get();        
        
if (!snap.exists()) {        
        
return bot.sendMessage(        
chatId,        
"❌ No existen usuarios registrados."        
);        
        
}        
        
let enviados = 0;        
let errores = 0;        
        
const usuarios = [];        
        
snap.forEach(item=>{        
        
const u = item.val();        
        
if (!u.banned) {        
        
usuarios.push(item.key);        
        
}        
        
});        
        
for (const id of usuarios) {        
        
try {        
        
await bot.sendMessage(id,msg.text,{        
parse_mode:"HTML"        
});        
        
enviados++;        
        
} catch {        
        
errores++;        
        
}        
        
}        
        
await bot.sendMessage(        
        
chatId,        
        
`✅ <b>Mensaje enviado</b>        
        
━━━━━━━━━━━━━━━━━━        
        
📤 Enviados: <b>${enviados}</b>        
        
❌ Errores: <b>${errores}</b>`,        
        
{        
parse_mode:"HTML"        
}        
        
);        
        
});        
}       
