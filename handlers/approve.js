import db from "../firebase.js";
import { pendingApprovals } from "./callback.js";

export default function registerApprove(bot) {

    bot.on("callback_query", async (query) => {

        if (!query.data.startsWith("days_")) return;

        await bot.answerCallbackQuery(query.id);

        const ownerId = String(query.from.id);

        if (!pendingApprovals.has(ownerId)) {

            return bot.answerCallbackQuery(query.id, {

                text: "La solicitud ya expiró.",

                show_alert: true

            });

        }

        const days = Number(query.data.split("_")[1]);

        const userId = pendingApprovals.get(ownerId);

        let expire = "Ilimitado";

        if (days > 0) {

            const date = new Date();

            date.setDate(date.getDate() + days);

            expire = date.toISOString();

        }

        await db.ref(`users/${userId}`).update({

            approved: true,

            role: "admin",

            expire

        });

        await db.ref(`requests/${userId}`).remove();

        pendingApprovals.delete(ownerId);

        await bot.editMessageText(

`✅ <b>Usuario Aprobado</b>

━━━━━━━━━━━━━━━━━━

👤 <b>ID</b>

<code>${userId}</code>

📅 <b>Duración</b>

${days === 0 ? "♾️ Ilimitado" : `${days} días`}

🛡️ <b>Rol</b>

Admin

━━━━━━━━━━━━━━━━━━

El usuario ya puede acceder al panel.`,

        {

            chat_id: query.message.chat.id,

            message_id: query.message.message_id,

            parse_mode: "HTML",

            reply_markup: {

                inline_keyboard: [

                    [

                        {
                            text: "🏠 Inicio",
                            callback_data: "menu_home"
                        }

                    ]

                ]

            }

        });

        await bot.sendMessage(

            userId,

`🎉 <b>¡Solicitud Aprobada!</b>

━━━━━━━━━━━━━━━━━━

✅ Ya tienes acceso al sistema.

🛡️ <b>Rol</b>

Admin

📅 <b>Duración</b>

${days === 0 ? "♾️ Ilimitado" : `${days} días`}

━━━━━━━━━━━━━━━━━━

Pulsa el botón para entrar al panel.`,

            {

                parse_mode: "HTML",

                reply_markup: {

                    inline_keyboard: [

                        [

                            {
                                text: "🏠 Abrir Panel",
                                callback_data: "menu_home"
                            }

                        ]

                    ]

                }

            }

        );

    });

}
