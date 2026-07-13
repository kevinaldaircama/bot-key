import db from "../firebase.js";

export default function registerUsage(bot) {

    bot.on("callback_query", async (query) => {

        if (query.data !== "menu_usage") return;

        await bot.answerCallbackQuery(query.id);

        const chatId = String(query.message.chat.id);

        const snap = await db.ref("keys").get();

        let total = 0;
        let usadas = 0;
        let disponibles = 0;
        let expiradas = 0;

        const now = Date.now();

        if (snap.exists()) {

            snap.forEach(item => {

                const key = item.val();

                if (key.owner !== chatId) return;

                total++;

                if (key.used) {

                    usadas++;

                } else if (key.expires <= now) {

                    expiradas++;

                } else {

                    disponibles++;

                }

            });

        }

        const porcentaje = total > 0
            ? Math.round((usadas / total) * 100)
            : 0;

        await bot.editMessageText(

`📈 <b>MI USO</b>

━━━━━━━━━━━━━━━━━━

🔑 <b>Keys Generadas</b>

${total}

🟢 <b>Disponibles</b>

${disponibles}

🔴 <b>Usadas</b>

${usadas}

⌛ <b>Expiradas</b>

${expiradas}

━━━━━━━━━━━━━━━━━━

📊 <b>Porcentaje de Uso</b>

${porcentaje}%

━━━━━━━━━━━━━━━━━━

🕒 <b>Última actualización</b>

${new Date().toLocaleString("es-PE")}`,

        {

            chat_id: chatId,

            message_id: query.message.message_id,

            parse_mode: "HTML",

            reply_markup: {

                inline_keyboard: [

                    [

                        {
                            text: "🔄 Actualizar",
                            callback_data: "menu_usage"
                        }

                    ],

                    [

                        {
                            text: "📜 Historial",
                            callback_data: "menu_history"
                        },
                        {
                            text: "🔑 Crear Key",
                            callback_data: "menu_key"
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
