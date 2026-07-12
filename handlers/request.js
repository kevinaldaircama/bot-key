import db from "../firebase.js";
import config from "../config.js";

export default function registerRequest(bot) {

    bot.on("callback_query", async (query) => {

        const chatId = String(query.message.chat.id);

        if (query.data !== "request_access") return;

        const userRef = db.ref(`users/${chatId}`);
        const user = (await userRef.get()).val();

        // Evitar solicitudes repetidas
        const requestRef = db.ref(`requests/${chatId}`);

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
            createdAt: Date.now()
        });

        await bot.editMessageText(
`✅ Tu solicitud ha sido enviada al dueño con éxito.

Por favor espera a que el dueño revise tu solicitud.

Recibirás un mensaje cuando seas aprobado.`,
        {
            chat_id: chatId,
            message_id: query.message.message_id
        });

        // Avisar al dueño

        await bot.sendMessage(

            config.OWNER_ID,

`📨 Nueva solicitud

👤 Nombre: ${user.name}

🆔 ID: ${chatId}

📛 Usuario: @${user.username || "Sin username"}

¿Qué deseas hacer?`,

            {

                reply_markup: {

                    inline_keyboard: [

                        [

                            {
                                text: "✅ Aceptar",
                                callback_data: `accept_${chatId}`
                            },

                            {
                                text: "❌ Rechazar",
                                callback_data: `reject_${chatId}`
                            }

                        ]

                    ]

                }

            }

        );

        bot.answerCallbackQuery(query.id);

    });

    }
