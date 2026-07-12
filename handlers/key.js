import db from "../firebase.js";
import { randomUUID } from "crypto";

export default function registerKey(bot) {

    bot.on("message", async (msg) => {

        if (!msg.text) return;

        if (msg.text !== "🔑 Crear Key") return;

        const chatId = String(msg.chat.id);

        const snap = await db.ref(`users/${chatId}`).get();

        if (!snap.exists()) return;

        const user = snap.val();

        if (!user.approved) return;

        if (user.role !== "owner" && user.role !== "admin") return;

        if (!user.reseller || user.reseller.trim() === "") {

            return bot.sendMessage(chatId,
`❌ Primero configura tu nombre de Reseller.

Pulsa:

👥 Resellers`);

        }

        const key = randomUUID()
            .replace(/-/g, "")
            .substring(0, 20)
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

        bot.sendMessage(
    chatId,

`✅ 1 Key Generada (Admin)

🚀 Proyecto: KevinTech Multi Script

👤 Reseller:
${user.reseller}

🤖 Bot Oficial:
@TuBot

💻 Comando de Instalación:

🔑 Key:
${key}

\`\`\`bash
export INSTALL_KEY="${key}"; bash <(curl -fsSL https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/install.sh)
\`\`\`
`,
{
    parse_mode: "Markdown"
});

    });

                                   }
