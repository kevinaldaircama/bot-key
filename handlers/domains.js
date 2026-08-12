import db from "../firebase.js";                
                
const API = "https://api.cloudflare.com/client/v4";        
 const usersState = {};    
       
export default function registerDomains(bot, config) {        
        
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
                
// ==============================          
// VER DOMINIO A          
// ==============================          
bot.on("callback_query", async (query) => {          
  const chatId = String(query.message.chat.id);          
          
  if (!query.data.startsWith("domain_view_")) return;          
          
  await bot.answerCallbackQuery(query.id);          
          
  const key = query.data.replace("domain_view_", "");          
  const snap = await db.ref(`domains/${chatId}/${key}`).get();          
          
  if (!snap.exists()) {          
    return bot.answerCallbackQuery(query.id, {          
      text: "El dominio ya no existe"          
    });          
  }          
          
  const item = snap.val();          
          
  await bot.editMessageText(          
    `🌐 <b>${item.domain}</b>\n\n📡 ${item.ip}`,          
    {          
      chat_id: chatId,          
      message_id: query.message.message_id,          
      parse_mode: "HTML",          
      reply_markup: {          
        inline_keyboard: [          
          [          
            { text: "✏️ Editar", callback_data: `domain_edit_${key}` }          
          ],          
          [          
            { text: "🗑 Eliminar", callback_data: `domain_delete_${key}` }          
          ],          
          [          
            { text: "⬅️ Volver", callback_data: "menu_domains" }          
          ]          
        ]          
      }          
    }          
  );          
});          
// ==============================        
// ELIMINAR DOMINIO A        
// ==============================        
bot.on("callback_query", async (query) => {        
  const chatId = String(query.message.chat.id);        
        
  if (!query.data.startsWith("domain_delete_")) return;        
        
  await bot.answerCallbackQuery(query.id);        
        
  const key = query.data.replace("domain_delete_", "");        
  const ref = db.ref(`domains/${chatId}/${key}`);        
  const snap = await ref.get();        
        
  if (!snap.exists()) {        
    return bot.answerCallbackQuery(query.id, {        
      text: "El dominio ya no existe"        
    });        
  }        
        
  const item = snap.val();        
        
  try {        
    // Eliminar en Cloudflare        
    await fetch(        
      `${API}/zones/${config.CLOUDFLARE_ZONE_ID}/dns_records/${item.recordId}`,        
      {        
        method: "DELETE",        
        headers: {        
          Authorization: `Bearer ${config.CLOUDFLARE_TOKEN}`,        
          "Content-Type": "application/json"        
        }        
      }        
    );        
        
    // Eliminar en Firebase        
    await ref.remove();        
        
    await bot.editMessageText(        
      `🗑 <b>Dominio eliminado</b>\n\n${item.domain}`,        
      {        
        chat_id: chatId,        
        message_id: query.message.message_id,        
        parse_mode: "HTML",        
        reply_markup: {        
          inline_keyboard: [        
            [{ text: "⬅️ Volver a Mis Dominios", callback_data: "menu_domains" }]        
          ]        
        }        
      }        
    );        
  } catch (err) {        
    console.log(err);        
    await bot.answerCallbackQuery(query.id, {        
      text: "Error al eliminar el dominio"        
    });        
  }        
});        
// ==============================      
// MENU EDITAR DOMINIO A      
// ==============================      
bot.on("callback_query", async (query) => {      
  const chatId = String(query.message.chat.id);      
      
  if (!query.data.startsWith("domain_edit_")) return;      
      
  await bot.answerCallbackQuery(query.id);      
      
  const key = query.data.replace("domain_edit_", "");      
  const snap = await db.ref(`domains/${chatId}/${key}`).get();      
      
  if (!snap.exists()) {      
    return bot.answerCallbackQuery(query.id, {      
      text: "El dominio ya no existe"      
    });      
  }      
      
  const item = snap.val();      
      
  await bot.editMessageText(      
    `✏️ <b>Editar dominio</b>\n\n🌐 ${item.domain}\n📡 ${item.ip}` ,      
    {      
      chat_id: chatId,      
      message_id: query.message.message_id,      
      parse_mode: "HTML",      
      reply_markup: {      
        inline_keyboard: [      
          [      
            { text: "📝 Cambiar nombre", callback_data: `domain_edit_name_${key}` }      
          ],      
          [      
            { text: "📡 Cambiar IP", callback_data: `domain_edit_ip_${key}` }      
          ],      
          [      
            { text: "⬅️ Volver", callback_data: `domain_view_${key}` }      
          ]      
        ]      
      }      
    }      
  );      
});      
// ==============================      
// PEDIR NUEVO NOMBRE      
// ==============================      
bot.on("callback_query", async (query) => {      
  const chatId = String(query.message.chat.id);      
      
  if (!query.data.startsWith("domain_edit_name_")) return;      
      
  await bot.answerCallbackQuery(query.id);      
      
  const key = query.data.replace("domain_edit_name_", "");      
  usersState[chatId] = { action: "EDIT_NAME", key };      
      
  await bot.sendMessage(chatId, "📝 Escriba el nuevo nombre del subdominio (ejemplo: panel2)");      
});      
      
// ==============================      
// PEDIR NUEVA IP      
// ==============================      
bot.on("callback_query", async (query) => {      
  const chatId = String(query.message.chat.id);      
      
  if (!query.data.startsWith("domain_edit_ip_")) return;      
      
  await bot.answerCallbackQuery(query.id);      
      
  const key = query.data.replace("domain_edit_ip_", "");      
  usersState[chatId] = { action: "EDIT_IP", key };      
      
  await bot.sendMessage(chatId, "📡 Escriba la nueva IP del servidor");      
});      
// ==============================      
// RECIBIR NUEVO NOMBRE O NUEVA IP      
// ==============================      
bot.on("message", async (msg) => {      
  const chatId = String(msg.chat.id);      
  if (!usersState[chatId]) return;      
  if (!msg.text) return;      
      
  const state = usersState[chatId];      
  const ref = db.ref(`domains/${chatId}/${state.key}`);      
  const snap = await ref.get();      
      
  if (!snap.exists()) {      
    delete usersState[chatId];      
    return bot.sendMessage(chatId, "❌ El dominio ya no existe.");      
  }      
      
  const item = snap.val();      
      
  // ===== EDITAR NOMBRE =====      
  if (state.action === "EDIT_NAME") {      
    const nuevo = msg.text.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");      
      
    if (!nuevo) {      
      return bot.sendMessage(chatId, "❌ Nombre inválido.");      
    }      
      
    try {      
      await fetch(`${API}/zones/${config.CLOUDFLARE_ZONE_ID}/dns_records/${item.recordId}`, {      
        method: "PUT",      
        headers: {      
          Authorization: `Bearer ${config.CLOUDFLARE_TOKEN}`,      
          "Content-Type": "application/json"      
        },      
        body: JSON.stringify({      
          type: "A",      
          name: `${nuevo}.socialstreaming.xyz`,      
          content: item.ip,      
          ttl: 1,      
          proxied: true      
        })      
      });      
      
      await ref.remove();      
      await db.ref(`domains/${chatId}/${nuevo}`).set({      
        ...item,      
        name: nuevo,      
        domain: `${nuevo}.socialstreaming.xyz`      
      });      
      
      delete usersState[chatId];      
      return bot.sendMessage(chatId, `✅ Nombre actualizado a ${nuevo}.socialstreaming.xyz`);      
    } catch (err) {      
      console.log(err);      
      delete usersState[chatId];      
      return bot.sendMessage(chatId, "❌ Error al actualizar el nombre.");      
    }      
  }      
      
  // ===== EDITAR IP =====      
  if (state.action === "EDIT_IP") {      
    const nuevaIP = msg.text.trim();      
      
    try {      
      await fetch(`${API}/zones/${config.CLOUDFLARE_ZONE_ID}/dns_records/${item.recordId}`, {      
        method: "PUT",      
        headers: {      
          Authorization: `Bearer ${config.CLOUDFLARE_TOKEN}`,      
          "Content-Type": "application/json"      
        },      
        body: JSON.stringify({      
          type: "A",      
          name: item.domain,      
          content: nuevaIP,      
          ttl: 1,      
          proxied: true      
        })      
      });      
      
      await ref.child("ip").set(nuevaIP);      
      
      delete usersState[chatId];      
      return bot.sendMessage(chatId, `✅ IP actualizada a ${nuevaIP}`);      
    } catch (err) {      
      console.log(err);      
      delete usersState[chatId];      
      return bot.sendMessage(chatId, "❌ Error al actualizar la IP.");      
    }      
  }      
});      
// ==============================  
// VER REGISTRO NS  
// ==============================  
bot.on("callback_query", async (query) => {  
  const chatId = String(query.message.chat.id);  
  
  if (!query.data.startsWith("ns_view_")) return;  
  
  await bot.answerCallbackQuery(query.id);  
  
  const key = query.data.replace("ns_view_", "");  
  const snap = await db.ref(`domains/${chatId}/ns/${key}`).get();  
  
  if (!snap.exists()) {  
    return bot.answerCallbackQuery(query.id, {  
      text: "El registro NS ya no existe"  
    });  
  }  
  
  const item = snap.val();  
  
  await bot.editMessageText(  
    `🧩 <b>${item.domain}</b>\n\n➡️ ${item.target}`,  
    {  
      chat_id: chatId,  
      message_id: query.message.message_id,  
      parse_mode: "HTML",  
      reply_markup: {  
        inline_keyboard: [  
          [  
            { text: "✏️ Editar", callback_data: `ns_edit_${key}` }  
          ],  
          [  
            { text: "🗑 Eliminar", callback_data: `ns_delete_${key}` }  
          ],  
          [  
            { text: "⬅️ Volver", callback_data: "menu_domains" }  
          ]  
        ]  
      }  
    }  
  );  
});  
// ==============================  
// ELIMINAR REGISTRO NS  
// ==============================  
bot.on("callback_query", async (query) => {  
  const chatId = String(query.message.chat.id);  
  
  if (!query.data.startsWith("ns_delete_")) return;  
  
  await bot.answerCallbackQuery(query.id);  
  
  const key = query.data.replace("ns_delete_", "");  
  const ref = db.ref(`domains/${chatId}/ns/${key}`);  
  const snap = await ref.get();  
  
  if (!snap.exists()) {  
    return bot.answerCallbackQuery(query.id, {  
      text: "El registro NS ya no existe"  
    });  
  }  
  
  const item = snap.val();  
  
  try {  
    await fetch(`${API}/zones/${config.CLOUDFLARE_ZONE_ID}/dns_records/${item.recordId}`, {  
      method: "DELETE",  
      headers: {  
        Authorization: `Bearer ${config.CLOUDFLARE_TOKEN}`,  
        "Content-Type": "application/json"  
      }  
    });  
  
    await ref.remove();  
  
    await bot.editMessageText(  
      `🗑 <b>Registro NS eliminado</b>\n\n${item.domain}`,  
      {  
        chat_id: chatId,  
        message_id: query.message.message_id,  
        parse_mode: "HTML",  
        reply_markup: {  
          inline_keyboard: [  
            [{ text: "⬅️ Volver a Mis Dominios", callback_data: "menu_domains" }]  
          ]  
        }  
      }  
    );  
  } catch (err) {  
    console.log(err);  
    await bot.answerCallbackQuery(query.id, {  
      text: "Error al eliminar el registro NS"  
    });  
  }  
});  
// ==============================  
// MENU EDITAR REGISTRO NS  
// ==============================  
bot.on("callback_query", async (query) => {  
  const chatId = String(query.message.chat.id);  
  
  if (!query.data.startsWith("ns_edit_")) return;  
  
  await bot.answerCallbackQuery(query.id);  
  
  const key = query.data.replace("ns_edit_", "");  
  const snap = await db.ref(`domains/${chatId}/ns/${key}`).get();  
  
  if (!snap.exists()) {  
    return bot.answerCallbackQuery(query.id, { text: "El registro NS ya no existe" });  
  }  
  
  const item = snap.val();  
  
  await bot.editMessageText(  
    `✏️ <b>Editar registro NS</b>\n\n🧩 ${item.domain}\n➡️ ${item.target}`,  
    {  
      chat_id: chatId,  
      message_id: query.message.message_id,  
      parse_mode: "HTML",  
      reply_markup: {  
        inline_keyboard: [  
          [{ text: "📝 Cambiar nombre", callback_data: `ns_edit_name_${key}` }],  
          [{ text: "➡️ Cambiar destino", callback_data: `ns_edit_target_${key}` }],  
          [{ text: "⬅️ Volver", callback_data: `ns_view_${key}` }]  
        ]  
      }  
    }  
  );  
});  
// ==============================  
// PEDIR NUEVO NOMBRE NS  
// ==============================  
bot.on("callback_query", async (query) => {  
  const chatId = String(query.message.chat.id);  
  
  if (!query.data.startsWith("ns_edit_name_")) return;  
  
  await bot.answerCallbackQuery(query.id);  
  
  const key = query.data.replace("ns_edit_name_", "");  
  usersState[chatId] = { action: "EDIT_NS_NAME", key };  
  
  await bot.sendMessage(chatId, "📝 Escriba el nuevo nombre del NS (ejemplo: ns2)");  
});  
// ==============================  
// PEDIR NUEVO DESTINO NS  
// ==============================  
bot.on("callback_query", async (query) => {  
  const chatId = String(query.message.chat.id);  
  
  if (!query.data.startsWith("ns_edit_target_")) return;  
  
  await bot.answerCallbackQuery(query.id);  
  
  const key = query.data.replace("ns_edit_target_", "");  
  usersState[chatId] = { action: "EDIT_NS_TARGET", key };  
  
  await bot.sendMessage(chatId, "➡️ Escriba el nuevo subdominio destino (ejemplo: panel2)");  
});  
// ==============================
// RECIBIR CAMBIOS DE NS
// ==============================
bot.on("message", async (msg) => {
  const chatId = String(msg.chat.id);
  if (!usersState[chatId]) return;
  if (!msg.text) return;

  const state = usersState[chatId];

  if (state.action !== "EDIT_NS_NAME" && state.action !== "EDIT_NS_TARGET") {
    return;
  }

  const ref = db.ref(`domains/${chatId}/ns/${state.key}`);
  const snap = await ref.get();

  if (!snap.exists()) {
    delete usersState[chatId];
    return bot.sendMessage(chatId, "❌ El registro NS ya no existe.");
  }

  const item = snap.val();

  // ===== EDITAR NOMBRE NS =====
  if (state.action === "EDIT_NS_NAME") {
    const nuevo = msg.text.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");

    if (!nuevo) return bot.sendMessage(chatId, "❌ Nombre inválido.");

    try {
      await fetch(`${API}/zones/${config.CLOUDFLARE_ZONE_ID}/dns_records/${item.recordId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${config.CLOUDFLARE_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: "NS",
          name: nuevo,
          content: item.target,
          ttl: 1
        })
      });

      await ref.remove();
      await db.ref(`domains/${chatId}/ns/${nuevo}`).set({
        ...item,
        name: nuevo,
        domain: `${nuevo}.socialstreaming.xyz`
      });

      delete usersState[chatId];
      return bot.sendMessage(chatId, `✅ Nombre NS actualizado a ${nuevo}.socialstreaming.xyz`);
    } catch (err) {
      console.log(err);
      delete usersState[chatId];
      return bot.sendMessage(chatId, "❌ Error al actualizar el nombre NS.");
    }
  }

  // ===== EDITAR DESTINO NS =====
  if (state.action === "EDIT_NS_TARGET") {
    const nuevoTarget = msg.text.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");

    if (!nuevoTarget) return bot.sendMessage(chatId, "❌ Destino inválido.");

    try {
      await fetch(`${API}/zones/${config.CLOUDFLARE_ZONE_ID}/dns_records/${item.recordId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${config.CLOUDFLARE_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: "NS",
          name: item.name,
          content: `${nuevoTarget}.socialstreaming.xyz`,
          ttl: 1
        })
      });

      await ref.child("target").set(`${nuevoTarget}.socialstreaming.xyz`);

      delete usersState[chatId];
      return bot.sendMessage(chatId, `✅ Destino NS actualizado a ${nuevoTarget}.socialstreaming.xyz`);
    } catch (err) {
      console.log(err);
      delete usersState[chatId];
      return bot.sendMessage(chatId, "❌ Error al actualizar el destino NS.");
    }
  }
});
}  
