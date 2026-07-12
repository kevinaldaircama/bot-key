import db from "../firebase.js";

const pendingApprovals = new Map();

export { pendingApprovals };

export default function registerCallback(bot) {

    bot.on("callback_query", async (query) => {

        const data = query.data;

        // ==========================
        // ACEPTAR
        // ==========================

        if (data.startsWith("accept_")) {

            const userId = data.split("_")[1];

            pendingApprovals.set(String(query.from.id), userId);

            await bot.editMessageText(

`📅 Escribe la cantidad de días para el usuario.

Ejemplos:

7
30
60
90
365

O escribe:

0

para acceso ilimitado.`,

            {

                chat_id: query.message.chat.id,
                message_id: query.message.message_id

            });

            return bot.answerCallbackQuery(query.id);

        }

        // ==========================
        // RECHAZAR
        // ==========================

        if (data.startsWith("reject_")) {

            const userId = data.split("_")[1];

            await db.ref(`requests/${userId}`).remove();

            await bot.editMessageText(

`❌ Solicitud rechazada correctamente.`,

            {

                chat_id: query.message.chat.id,
                message_id: query.message.message_id

            });

            await bot.sendMessage(

                userId,

`❌ Tu solicitud fue rechazada por el administrador.`

            );

            return bot.answerCallbackQuery(query.id);

        }

    });

}
