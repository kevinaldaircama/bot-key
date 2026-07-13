import db from "../firebase.js";

export default function registerInstaller(bot) {

    bot.on("callback_query", async (query) => {

        if (query.data !== "menu_install") return;

        await bot.answerCallbackQuery(query.id);

        try {

            const chatId = String(query.message.chat.id);

            const snap = await db.ref(`users/${chatId}`).get();

            if (!snap.exists()) return;

            const user = snap.val();

            if (!user.approved) return;

            if (user.role !== "owner" && user.role !== "admin") return;

            const keysSnap = await db.ref("keys").get();

            let disponibles = 0;

            if (keysSnap.exists()) {

                keysSnap.forEach(item => {

                    const key = item.val();

                    if (
                        key.owner === chatId &&
                        !key.used &&
                        key.expires > Date.now()
                    ) {

                        disponibles++;

                    }

                });

            }

            const role = user.role === "owner"
                ? "👑 Dueño"
                : "🛡️ Admin";

            await bot.editMessageText(

`🚀 <b>MULTI SCRIPT VPN</b>

━━━━━━━━━━━━━━━━━━

${role}

👤 <b>Reseller</b>

${user.reseller || "Sin configurar"}

━━━━━━━━━━━━━━━━━━

🔑 <b>Keys Disponibles</b>

${disponibles}

━━━━━━━━━━━━━━━━━━

💻 <b>Instalador Oficial</b>

<code>bash &lt;(curl -fsSL https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/install.sh)</code>

━━━━━━━━━━━━━━━━━━

⚠️ Durante la instalación se solicitará una KEY válida.`,

            {

                chat_id: chatId,

                message_id: query.message.message_id,

                parse_mode: "HTML",

                reply_markup: {

                    inline_keyboard: [

                        [

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

        } catch (err) {

            console.log(err);

        }

    });

            }
