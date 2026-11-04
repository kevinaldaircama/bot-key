import db from "../db.js";
import config from "../config.js";

export default function registerRequest(bot) {

    bot.on("callback_query", async (query) => {

        if (query.data !== "request_access") return;

        const chatId = String(query.message.chat.id);

        const userRef = db.ref(`users/${chatId}`);
        const user = (await userRef.get()).val() || {};

        const requestRef = db.ref(`requests/${chatId}`);

        // Ya existe una solicitud
        if ((await requestRef.get()).exists()) {

            return bot.answerCallbackQuery(query.id, {

                text: "Ya enviaste una solicitud.",

                show_alert: true

            });

        }

        await requestRef.set({

            id: chatId,

            name: user.name,

            username: user.username,

            role: "user",

            createdAt: Date.now()

        });

        // Confirmación breve en el botón, sin enviar el bloque de texto
        // de "SOLICITUD DE ACCESO" al usuario.
        await bot.answerCallbackQuery(query.id, {
            text: "Solicitud enviada. Espera la aprobación.",
            show_alert: false
        });

        // Aviso al Dueño

        await bot.sendMessage(

config.OWNER_ID,

`📨 <b>Nueva Solicitud</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Nombre</b>

${user.name}

🆔 <b>ID</b>

<code>${chatId}</code>

📛 <b>Usuario</b>

@${user.username || "Sin username"}

📅 <b>Fecha</b>

${new Date().toLocaleString("es-PE")}

━━━━━━━━━━━━━━━━━━

¿Qué deseas hacer?`,

{

parse_mode:"HTML",

reply_markup:{

inline_keyboard:[

[

{

text:"✅ Aprobar",

callback_data:`accept_${chatId}`

},

{

text:"❌ Rechazar",

callback_data:`reject_${chatId}`

}

]

]

}

});

    });

}
