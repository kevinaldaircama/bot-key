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
// Contar Keys del usuario

const keysSnapshot = await db.ref("keys").get();

let totalKeys = 0;

if (keysSnapshot.exists()) {

    keysSnapshot.forEach((item) => {

        if (item.val().owner === chatId) {
            totalKeys++;
        }

    });

}

const roleName = user.role === "owner" ? "Dueño" : "Admin";
        
        bot.sendMessage(
    chatId,

`✅ ${totalKeys} ${totalKeys === 1 ? "Key Generada" : "Keys Generadas"} (${roleName})

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
