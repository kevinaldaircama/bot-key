import db from "../firebase.js";

export default function registerVPS(bot) {

    bot.on("callback_query", async (query) => {

        if (query.data !== "menu_vps") return;

        await bot.answerCallbackQuery(query.id);

        const chatId = String(query.message.chat.id);

        const snap = await db.ref(`vps/${chatId}`).get();

        if (!snap.exists()) {

            return bot.editMessageText(

`🖥 <b>MIS VPS</b>

━━━━━━━━━━━━━━━━━━

❌ No tienes VPS registrados.

Los VPS aparecerán automáticamente cuando una KEY sea utilizada.

━━━━━━━━━━━━━━━━━━`,

            {

                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "HTML",

                reply_markup: {

                    inline_keyboard: [

                        [
                            {
                                text: "🔄 Actualizar",
                                callback_data: "menu_vps"
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

        let total = 0;

        let text = `🖥 <b>MIS VPS</b>

━━━━━━━━━━━━━━━━━━

`;

        snap.forEach(item => {

            const vps = item.val();

            total++;

            text +=

`💻 <b>${vps.name || "Sin nombre"}</b>

🌐 <b>IP:</b>
<code>${vps.ip || "-"}</code>

🖥 <b>Sistema:</b>
${vps.os || "-"}

📅 <b>Instalado:</b>
${new Date(vps.created).toLocaleString("es-PE")}

━━━━━━━━━━━━━━━━━━

`;

        });

        text +=

`📊 <b>Total VPS</b>

${total}`;

        await bot.editMessageText(

text,

{

chat_id: chatId,

message_id: query.message.message_id,

parse_mode: "HTML",

reply_markup:{

inline_keyboard:[

[
{
text:"🔄 Actualizar",
callback_data:"menu_vps"
}
],

[
{
text:"🏠 Inicio",
callback_data:"menu_home"
}
]

]

}

});

    });

}
