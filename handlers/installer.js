import db from "../firebase.js";

export default function registerInstaller(bot) {

    bot.on("message", async (msg) => {

        if (!msg.text) return;

        if (msg.text !== "🚀 Instalador") return;

        const chatId = String(msg.chat.id);

        const snap = await db.ref(`users/${chatId}`).get();

        if (!snap.exists()) return;

        const user = snap.val();

        if (!user.approved) return;

        if (user.role !== "owner" && user.role !== "admin") return;

        // Contar keys
        const keys = await db.ref("keys").get();

        let disponibles = 0;

        if (keys.exists()) {

            keys.forEach(item => {

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

        const role =
            user.role === "owner"
                ? "👑 Dueño"
                : "🛡️ Admin";

        await bot.sendMessage(

            chatId,

`<b>🚀 MULTI SCRIPT VPN</b>

━━━━━━━━━━━━━━━━━━

${role}

👤 <b>Reseller</b>

${user.reseller || "Sin configurar"}

━━━━━━━━━━━━━━━━━━

🔑 <b>Keys Disponibles</b>

${disponibles}

━━━━━━━━━━━━━━━━━━

💻 <b>Instalador Oficial</b>

<code>bash <(curl -fsSL https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/install.sh)</code>

━━━━━━━━━━━━━━━━━━

⚠️ Durante la instalación se solicitará una KEY válida.

Las Keys vencen a las <b>2 horas</b> o al <b>primer uso</b>.`,

            {

                parse_mode: "HTML"

            }

        );

    });

}
