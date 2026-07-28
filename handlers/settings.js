import db from "../firebase.js";    
import { pendingApprovals } from "./callback.js";    
const messageState = {};    
const userAction = {};    
    
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
// ===================================    
// TODOS LOS USUARIOS    
// ===================================    
    
case "users_all": {    
    
const snap = await db.ref("users").get();    
    
let text = `👥 <b>TODOS LOS USUARIOS</b>    
    
━━━━━━━━━━━━━━━━━━    
    
`;    
    
let total = 0;    
    
if (snap.exists()) {    
    
snap.forEach(item => {    
    
const u = item.val();    
    
total++;    
    
const estado = u.banned    
? "🚫 Baneado"    
: (u.approved ? "✅ Activo" : "❌ Sin acceso");    
    
text += `👤 ${u.name || "Sin nombre"}    
🆔 <code>${item.key}</code>    
🎖 ${u.role || "user"}    
📌 ${estado}    
    
`;    
    
});    
    
}    
    
text += `━━━━━━━━━━━━━━━━━━    
Total: <b>${total}</b>`;    
    
await bot.editMessageText(text, {    
    
chat_id: chatId,    
message_id: query.message.message_id,    
parse_mode: "HTML",    
    
reply_markup: {    
inline_keyboard: [    
[    
{    
text: "⬅️ Volver",    
callback_data: "settings_users"    
}    
]    
]    
}    
    
});    
    
break;    
    
}    
    
// ===================================    
// FIN DEL SWITCH    
// ===================================    
    
default:    
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

if (user.role === "admin") {
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
banned:false  
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
