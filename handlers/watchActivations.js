const admin = require("firebase-admin");
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.BOT_TOKEN);

const db = admin.database();

db.ref("activations").on("child_added", async (snap) => {

    const data = snap.val();

    if (data.notified) return;

    const text =
`🔔 NOTIFICACIÓN DE USO 🔔

✅ Tu Token ha sido activado.

👤 Reseller: ${data.reseller}

🔑 Token: ${data.token}

🌐 IP Cliente: ${data.ip}

🖥 Host: ${data.hostname}

🐧 Sistema: ${data.os}

📅 Fecha: ${data.date}`;

    try {

        await bot.sendMessage(data.owner, text);

        await snap.ref.update({
            notified: true
        });

    } catch (e) {

        console.log(e);

    }

});
