import db from "../firebase.js";
import config from "../config.js";

export default function registerHome(bot) {

    bot.on("callback_query", async (query) => {

        if (query.data !== "menu_home") return;

        await bot.answerCallbackQuery(query.id);

        const chatId = String(query.message.chat.id);

        const snap = await db.ref(`users/${chatId}`).get();

        if (!snap.exists()) return;

        const user = snap.val();

        // Contar Keys
        const keysSnap = await db.ref("keys").get();

        let totalKeys = 0;

        if (keysSnap.exists()) {

            keysSnap.forEach(item => {

                if (item.val().owner === chatId) {

                    totalKeys++;

                }

            });

        }

        // =============================
        // DUEÑO
        // =============================

        if (chatId === config.OWNER_ID) {

            return bot.editMessageText(

`👑 <b>MULTI SCRIPT VPN</b>

━━━━━━━━━━━━━━━━━━

👤 <b>${user.name}</b>

🎖️ <b>Rango:</b> Dueño

🔑 <b>Keys:</b> ${totalKeys}

👥 <b>Reseller:</b>

${user.reseller || "Sin configurar"}

📅 <b>Acceso:</b>

Ilimitado

━━━━━━━━━━━━━━━━━━`,

{

chat_id: chatId,

message_id: query.message.message_id,

parse_mode:"HTML",

reply_markup:{

inline_keyboard:[

[
{text:"🔑 Crear Key",callback_data:"menu_key"},
{text:"🚀 Instalador",callback_data:"menu_install"}
],

[
{text:"🖥 Mis VPS",callback_data:"menu_vps"},
{text:"📁 Mis Dominios",callback_data:"menu_domains"}
],

[
{text:"🌐 Dominio A",callback_data:"menu_domain_a"},
{text:"🧩 Dominio NS",callback_data:"menu_domain_ns"}
],

[
{text:"👥 Resellers",callback_data:"menu_reseller"},
{text:"📊 Estadísticas",callback_data:"menu_stats"}
],

[
{text:"📜 Historial",callback_data:"menu_history"},
{text:"📈 Mi Uso",callback_data:"menu_usage"}
]

]

}

});

        }

        // =============================
        // ADMIN
        // =============================

        return bot.editMessageText(

`🛡️ <b>MULTI SCRIPT VPN</b>

━━━━━━━━━━━━━━━━━━

👤 <b>${user.name}</b>

🎖️ <b>Rango:</b> Admin

🔑 <b>Keys:</b> ${totalKeys}

👥 <b>Reseller:</b>

${user.reseller || "Sin configurar"}

📅 <b>Expira:</b>

${user.expire || "Sin definir"}

━━━━━━━━━━━━━━━━━━`,

{

chat_id: chatId,

message_id: query.message.message_id,

parse_mode:"HTML",

reply_markup:{

inline_keyboard:[

[
{text:"🔑 Crear Key",callback_data:"menu_key"},
{text:"🚀 Instalador",callback_data:"menu_install"}
],

[
{text:"🖥 Mis VPS",callback_data:"menu_vps"},
{text:"📁 Mis Dominios",callback_data:"menu_domains"}
],

[
{text:"🌐 Dominio A",callback_data:"menu_domain_a"},
{text:"🧩 Dominio NS",callback_data:"menu_domain_ns"}
],

[
{text:"👥 Resellers",callback_data:"menu_reseller"}
],

[
{text:"📜 Historial",callback_data:"menu_history"},
{text:"📈 Mi Uso",callback_data:"menu_usage"}
]

]

}

});

    });

}
