import db from "../firebase.js";
import config from "../config.js";

export default function registerRequest(bot) {

    bot.on("callback_query", async (query) => {

        if (query.data !== "request_access") return;

        await bot.answerCallbackQuery(query.id);

        const chatId = String(query.message.chat.id);

        const userRef = db.ref(`users/${chatId}`);
        const user = (await userRef.get()).val();

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

        // Mensaje al usuario

        await bot.editMessageText(

`📨 <b>Solicitud Enviada</b>

━━━━━━━━━━━━━━━━━━

✅ Tu solicitud fue enviada correctamente.

👤 <b>Nombre</b>

${user.name}

🆔 <b>ID</b>

<code>${chatId}</code>

━━━━━━━━━━━━━━━━━━

⏳ Ahora solo debes esperar la aprobación del Dueño.

Recibirás una notificación automáticamente.`,

        {

            chat_id: chatId,

            message_id: query.message.message_id,

            parse_mode: "HTML",

            reply_markup: {

                inline_keyboard: [

                    [

                        {

                            text: "👤 Contactarme",

                            url: "https://t.me/senseicamachito"

                        }

                    ]

                ]

            }

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
