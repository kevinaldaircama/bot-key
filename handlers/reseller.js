import db from "../firebase.js";

const waitingReseller = new Map();

export default function registerReseller(bot) {

    // ==========================
    // Botón 👥 Resellers
    // ==========================
    bot.on("callback_query", async (query) => {

        if (query.data !== "menu_reseller") return;

        await bot.answerCallbackQuery(query.id);

        const chatId = String(query.message.chat.id);

        const snap = await db.ref(`users/${chatId}`).get();

        if (!snap.exists()) return;

        const user = snap.val();

        if (!user.approved) return;

        if (user.role !== "owner" && user.role !== "admin") return;

        waitingReseller.set(chatId, true);

        await bot.editMessageText(

`👥 <b>Configurar Reseller</b>

━━━━━━━━━━━━━━━━━━

👤 Reseller actual

<b>${user.reseller || "Sin configurar"}</b>

━━━━━━━━━━━━━━━━━━

✍️ Ahora escribe el nuevo nombre del Reseller.

Ejemplos:

• KevinTech
• VPN Premium
• Mi Empresa

━━━━━━━━━━━━━━━━━━`,

{

chat_id: chatId,

message_id: query.message.message_id,

parse_mode:"HTML",

reply_markup:{

inline_keyboard:[

[
{text:"🏠 Inicio",callback_data:"menu_home"}
]

]

}

});

    });

    // ==========================
    // Guardar Reseller
    // ==========================
    bot.on("message", async (msg) => {

        if (!msg.text) return;

        const chatId = String(msg.chat.id);

        if (!waitingReseller.has(chatId)) return;

        const reseller = msg.text.trim();

        if (reseller.length < 3) {

            return bot.sendMessage(chatId,
                "❌ El nombre debe tener al menos 3 caracteres.");
        }

        waitingReseller.delete(chatId);

        await db.ref(`users/${chatId}`).update({

            reseller

        });

        await bot.sendMessage(

chatId,

`✅ <b>Reseller actualizado correctamente</b>

━━━━━━━━━━━━━━━━━━

👤 Nuevo nombre

<b>${reseller}</b>

━━━━━━━━━━━━━━━━━━

Ahora todas las Keys nuevas mostrarán este nombre.`,

{

parse_mode:"HTML",

reply_markup:{

inline_keyboard:[

[
{text:"🏠 Volver al Panel",callback_data:"menu_home"}
]

]

}

});

    });

}
