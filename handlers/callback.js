import db from "../firebase.js";

export default function registerCallback(bot) {

    bot.on("callback_query", async (query) => {

        const data = query.data;

        // ==========================
        // ACEPTAR SOLICITUD
        // ==========================

        if (data.startsWith("accept_")) {

            const userId = data.split("_")[1];

            const requestRef = db.ref(`requests/${userId}`);

            if (!(await requestRef.get()).exists()) {

                return bot.answerCallbackQuery(query.id, {
                    text: "La solicitud ya no existe."
                });

            }

            await db.ref(`users/${userId}`).update({
                approved: true,
                role: "admin"
            });

            await requestRef.remove();

            await bot.editMessageText(

`✅ Usuario aprobado correctamente.

ID: ${userId}

Rol: Admin`,

            {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id
            });

            await bot.sendMessage(

                userId,

`🎉 Tu solicitud fue aprobada.

Ahora ya puedes utilizar el bot.

Escribe nuevamente:

/start`

            );

            return bot.answerCallbackQuery(query.id);

        }

        // ==========================
        // RECHAZAR SOLICITUD
        // ==========================

        if (data.startsWith("reject_")) {

            const userId = data.split("_")[1];

            await db.ref(`requests/${userId}`).remove();

            await bot.editMessageText(

`❌ Solicitud rechazada.

ID: ${userId}`,

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
