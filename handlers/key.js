import db from "../firebase.js";
import { randomUUID } from "crypto";

export default function registerKey(bot) {

    bot.on("callback_query", async (query) => {

        if (query.data !== "menu_key") return;

        await bot.answerCallbackQuery(query.id);

        const chatId = String(query.message.chat.id);

        const snap = await db.ref(`users/${chatId}`).get();

        if (!snap.exists()) return;

        const user = snap.val();

        if (!user.approved) {

            return bot.answerCallbackQuery(query.id, {
                text: "No tienes acceso.",
                show_alert: true
            });

        }

        if (user.role !== "owner" && user.role !== "admin") {

            return bot.answerCallbackQuery(query.id, {
                text: "No autorizado.",
                show_alert: true
            });

        }

        if (!user.reseller || user.reseller.trim() === "") {

            return bot.editMessageText(

`❌ <b>Debes configurar primero tu nombre de Reseller.</b>

Pulsa el botón:

👥 <b>Resellers</b>`,

            {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "👥 Resellers",
                                callback_data: "menu_reseller"
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

        }

        const key = "KEY-" + randomUUID()
            .replace(/-/g, "")
            .substring(0, 10)
            .toUpperCase();

        const created = Date.now();

        const expires = created + (2 * 60 * 60 * 1000);

        await db.ref(`keys/${key}`).set({

            key,

            owner: chatId,

            reseller: user.reseller,

            used: false,

            created,

            expires,

            usedBy: "",

            usedAt: ""

        });

        const keysSnapshot = await db.ref("keys").get();

        let totalKeys = 0;

        if (keysSnapshot.exists()) {

            keysSnapshot.forEach(item => {

                if (item.val().owner === chatId) {

                    totalKeys++;

                }

            });

        }

        const roleName = user.role === "owner"
            ? "👑 Dueño"
            : "🛡️ Admin";

        await bot.editMessageText(

`<b>🔑 KEY GENERADA CORRECTAMENTE</b>

━━━━━━━━━━━━━━━━━━

${roleName}

👤 <b>Reseller</b>

${user.reseller}

━━━━━━━━━━━━━━━━━━

🔑 <b>Key</b>

<code>${key}</code>

━━━━━━━━━━━━━━━━━━

⏳ <b>Expira</b>

2 horas o al primer uso.

━━━━━━━━━━━━━━━━━━

📊 <b>Total de Keys</b>

${totalKeys}

━━━━━━━━━━━━━━━━━━

💻 <b>Instalador</b>

<code>export INSTALL_KEY="${key}"; bash &lt;(curl -fsSL https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/install.sh)</code>`,

        {

            chat_id: chatId,

            message_id: query.message.message_id,

            parse_mode: "HTML",

            reply_markup: {

                inline_keyboard: [

                    [
                        {
                            text: "🔄 Crear otra Key",
                            callback_data: "menu_key"
                        }
                    ],

                    [
                        {
                            text: "📜 Historial",
                            callback_data: "menu_history"
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
