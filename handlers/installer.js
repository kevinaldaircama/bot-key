import db from "../firebase.js";

export default function registerInstaller(bot) {

    bot.on("message", async (msg) => {

        if (!msg.text) return;
        if (msg.text !== "🚀 Instalador") return;

        try {

            const chatId = String(msg.chat.id);

            const snap = await db.ref(`users/${chatId}`).get();

            if (!snap.exists()) return;

            const user = snap.val();

            if (!user.approved) return;

            if (user.role !== "owner" && user.role !== "admin") return;

            const keysSnap = await db.ref("keys").get();

            let disponibles = 0;

            if (keysSnap.exists()) {

                keysSnap.forEach((item) => {

                    const key = item.val();

                    if (
                        key.owner === chatId &&
                        key.used === false
                    ) {
                        disponibles++;
                    }

                });

            }

            const role = user.role === "owner"
                ? "👑 Dueño"
                : "🛡️ Admin";

            await bot.sendMessage(chatId,

`<b>🚀 MULTI SCRIPT VPN</b>

━━━━━━━━━━━━━━━━━━

${role}

👤 <b>Reseller</b>

${user.reseller || "Sin configurar"}

━━━━━━━━━━━━━━━━━━

🔑 <b>Keys Disponibles</b>

<b>${disponibles}</b>

━━━━━━━━━━━━━━━━━━

💻 <b>Instalador Oficial</b>

<code>bash <(curl -fsSL https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/install.sh)</code>

━━━━━━━━━━━━━━━━━━

⚠️ Durante la instalación se solicitará una KEY válida.`,

            {

                parse_mode: "HTML"

            });

        } catch (err) {

            console.log(err);

            bot.sendMessage(msg.chat.id,
                "❌ Error interno. Revisa la consola del VPS.");

        }

    });

                            }
