import db from "../firebase.js";

export default function registerHistory(bot) {

    bot.on("callback_query", async (query) => {

        if (query.data !== "menu_history") return;

        await bot.answerCallbackQuery(query.id);

        const chatId = String(query.message.chat.id);

        const snap = await db.ref("keys").get();

        let text = `📜 <b>HISTORIAL DE KEYS</b>

━━━━━━━━━━━━━━━━━━

`;

        let total = 0;

        if (snap.exists()) {

            snap.forEach(item => {

                const key = item.val();

                if (key.owner !== chatId) return;

                total++;

                const estado = key.used
                    ? "🔴 Usada"
                    : (key.expires <= Date.now()
                        ? "⌛ Expirada"
                        : "🟢 Disponible");

                text +=

`🔑 <code>${key.key}</code>

👤 ${key.reseller}

📅 ${new Date(key.created).toLocaleString("es-PE")}

📌 ${estado}

━━━━━━━━━━━━━━━━━━

`;

            });

        }

        if (total === 0) {

            text += "No tienes Keys generadas.\n\n";

        }

        text += `📊 <b>Total:</b> ${total}`;

        await bot.editMessageText(

            text,

            {

                chat_id: chatId,

                message_id: query.message.message_id,

                parse_mode: "HTML",

                reply_markup: {

                    inline_keyboard: [

                        [

                            {

                                text: "🔄 Actualizar",

                                callback_data: "menu_history"

                            }

                        ],

                        [

                            {

                                text: "🔑 Crear Key",

                                callback_data: "menu_key"

                            },

                            {

                                text: "📈 Mi Uso",

                                callback_data: "menu_usage"

                            }

                        ],

                        [

                            {

                                text: "🏠 Inicio",

                                callback_data: "menu_home"

                            }

                        ]

                    ]

                }

            });

    });

}
