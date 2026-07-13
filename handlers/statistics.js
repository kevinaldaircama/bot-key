import db from "../firebase.js";

export default function registerStatistics(bot) {

    bot.on("message", async (msg) => {

        if (!msg.text) return;

        if (msg.text !== "📊 Estadísticas") return;

        const chatId = String(msg.chat.id);

        const userSnap = await db.ref(`users/${chatId}`).get();

        if (!userSnap.exists()) return;

        const user = userSnap.val();

        if (user.role !== "owner") {

            return bot.sendMessage(chatId,
                "❌ Solo el dueño puede ver las estadísticas.");
        }

        const usersSnap = await db.ref("users").get();
        const keysSnap = await db.ref("keys").get();

        let totalUsers = 0;
        let totalAdmins = 0;
        let totalOwners = 0;

        if (usersSnap.exists()) {

            usersSnap.forEach(item => {

                const u = item.val();

                totalUsers++;

                if (u.role === "admin") totalAdmins++;

                if (u.role === "owner") totalOwners++;

            });

        }

        let totalKeys = 0;
        let usadas = 0;
        let disponibles = 0;
        let expiradas = 0;

        const now = Date.now();

        if (keysSnap.exists()) {

            keysSnap.forEach(item => {

                const key = item.val();

                totalKeys++;

                if (key.used) {

                    usadas++;

                } else if (key.expires < now) {

                    expiradas++;

                } else {

                    disponibles++;

                }

            });

        }

        bot.sendMessage(chatId,

`📊 <b>Estadísticas Globales</b>

━━━━━━━━━━━━━━

👥 Usuarios:
<b>${totalUsers}</b>

👑 Dueños:
<b>${totalOwners}</b>

🛡️ Admins:
<b>${totalAdmins}</b>

━━━━━━━━━━━━━━

🔑 Keys:
<b>${totalKeys}</b>

🟢 Disponibles:
<b>${disponibles}</b>

🔴 Usadas:
<b>${usadas}</b>

⌛ Expiradas:
<b>${expiradas}</b>

━━━━━━━━━━━━━━`,

{

parse_mode:"HTML"

});

    });

          }
