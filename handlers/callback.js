import db from "../db.js";

const pendingApprovals = new Map();

export { pendingApprovals };

export default function registerCallback(bot) {

    bot.on("callback_query", async (query) => {

        const data = query.data;

        // ==========================
        // APROBAR
        // ==========================

        if (data.startsWith("accept_")) {

            const userId = data.split("_")[1];

            pendingApprovals.set(String(query.from.id), userId);

            await bot.editMessageText(

`✅ <b>Aprobar Usuario</b>

━━━━━━━━━━━━━━━━━━

Selecciona el tiempo de acceso para este usuario.

━━━━━━━━━━━━━━━━━━`,

            {

                chat_id: query.message.chat.id,

                message_id: query.message.message_id,

                parse_mode: "HTML",

                reply_markup: {

                    inline_keyboard: [

                        [

                            {
                                text: "7 Días",
                                callback_data: "days_7"
                            },

                            {
                                text: "30 Días",
                                callback_data: "days_30"
                            }

                        ],

                        [

                            {
                                text: "60 Días",
                                callback_data: "days_60"
                            },

                            {
                                text: "90 Días",
                                callback_data: "days_90"
                            }

                        ],

                        [

                            {
                                text: "365 Días",
                                callback_data: "days_365"
                            }

                        ],

                        [

                            {
                                text: "♾️ Ilimitado",
                                callback_data: "days_0"
                            }

                        ],

                        [

                            {
                                text: "❌ Cancelar",
                                callback_data: "cancel_request"
                            }

                        ]

                    ]

                }

            });

            return bot.answerCallbackQuery(query.id);

        }

        // ==========================
        // RECHAZAR
        // ==========================

        if (data.startsWith("reject_")) {

            const userId = data.split("_")[1];

            await db.ref(`requests/${userId}`).remove();
            const userRef = db.ref(`users/${userId}`);
            const userSnap = await userRef.get();
            const userData = userSnap.val() || {};
            const rejects = Number(userData.rejectCount || 0) + 1;
            const permanentlyBanned = rejects >= 3;
            await userRef.update({
                rejectCount: rejects,
                ...(permanentlyBanned ? { banned: true, approved: false, role: "user", permanentBan: true } : {})
            });

            await bot.editMessageText(

`❌ <b>Solicitud Rechazada</b>

━━━━━━━━━━━━━━━━━━

El usuario fue rechazado correctamente.

Rechazos acumulados: ${rejects}/3
${permanentlyBanned ? "🚫 Baneado permanentemente." : rejects === 2 ? "⚠️ Se registró la segunda advertencia." : ""}

━━━━━━━━━━━━━━━━━━`,

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

`❌ Tu solicitud fue rechazada por el administrador.

${permanentlyBanned ? "🚫 Has sido baneado permanentemente por acumular 3 rechazos." : rejects === 2 ? "⚠️ ADVERTENCIA: llevas 2 rechazos. Un tercer rechazo causará un baneo permanente." : `Rechazos: ${rejects}/3. Puedes volver a intentarlo más adelante.`}`

            );

            return bot.answerCallbackQuery(query.id);

        }

        // ==========================
        // CANCELAR
        // ==========================

        if (data === "cancel_request") {

            pendingApprovals.delete(String(query.from.id));

            await bot.editMessageText(

`❌ Operación cancelada.`,

            {

                chat_id: query.message.chat.id,

                message_id: query.message.message_id,

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

            return bot.answerCallbackQuery(query.id);

        }

    });

}
