import db from "../firebase.js";

export default function registerStatistics(bot) {

    bot.on("callback_query", async (query) => {

        if (query.data !== "menu_stats") return;

        await bot.answerCallbackQuery(query.id);

        const chatId = String(query.message.chat.id);

        const userSnap = await db.ref(`users/${chatId}`).get();

        if (!userSnap.exists()) return;

        const user = userSnap.val();

        if (user.role !== "owner") {

            return bot.answerCallbackQuery(query.id, {
                text: "Solo el Dueño puede acceder.",
                show_alert: true
            });

        }

        const usersSnap = await db.ref("users").get();
        const keysSnap = await db.ref("keys").get();

        let totalUsers = 0;
        let totalAdmins = 0;
        let totalOwners = 0;

        if (usersSnap.exists()) {

            usersSnap.forEach(item => {

                const u = item.val();

                totalUsers++;

                if (u.role === "owner") totalOwners++;

                if (u.role === "admin") totalAdmins++;

            });

        }

        let totalKeys = 0;
        let disponibles = 0;
        let usadas = 0;
        let expiradas = 0;

        const now = Date.now();

        if (keysSnap.exists()) {

            keysSnap.forEach(item => {

                const key = item.val();

                totalKeys++;

                if (key.used) {

                    usadas++;

                } else if (key.expires <= now) {

                    expiradas++;

                } else {

                    disponibles++;

                }

            });

        }

        const porcentaje = totalKeys > 0
            ? Math.round((usadas / totalKeys) * 100)
            : 0;

        await bot.editMessageText(

`📊 <b>ESTADÍSTICAS GLOBALES</b>

━━━━━━━━━━━━━━━━━━

👥 <b>Usuarios</b>

${totalUsers}

👑 <b>Dueños</b>

${totalOwners}

🛡️ <b>Admins</b>

${totalAdmins}

━━━━━━━━━━━━━━━━━━

🔑 <b>Keys Totales</b>

${totalKeys}

🟢 <b>Disponibles</b>

${disponibles}

🔴 <b>Usadas</b>

${usadas}

⌛ <b>Expiradas</b>

${expiradas}

📈 <b>Uso</b>

${porcentaje}%

━━━━━━━━━━━━━━━━━━

🕒 Última actualización

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
                            callback_data: "menu_stats"
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
