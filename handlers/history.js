import db from "../firebase.js";

export default function registerHistory(bot) {

    bot.on("message", async (msg) => {

        if (!msg.text) return;
        if (msg.text !== "📜 Historial") return;

        const chatId = String(msg.chat.id);

        const snap = await db.ref("keys").get();

        if (!snap.exists()) {
            return bot.sendMessage(chatId, "❌ No tienes historial.");
        }

        let text = "📜 <b>Historial de Keys</b>\n\n";

        let total = 0;

        snap.forEach((item) => {

            const key = item.val();

            if (key.owner !== chatId) return;

            total++;

            const estado = key.used ? "🔴 Usada" : "🟢 Disponible";

            const fecha = new Date(key.created).toLocaleString("es-PE");

            text +=
`━━━━━━━━━━━━━━
🔑 <code>${key.key}</code>

👤 <b>Reseller:</b>
${key.reseller}

📅 <b>Creada:</b>
${fecha}

📌 <b>Estado:</b>
${estado}

`;
        });

        if (total === 0) {

            text += "No tienes Keys creadas.";

        }

        text += `━━━━━━━━━━━━━━

📊 Total: <b>${total}</b>`;

        bot.sendMessage(chatId, text, {

            parse_mode: "HTML"

        });

    });

           }
