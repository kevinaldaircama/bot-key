import db from "../firebase.js";

export default function registerActivations(bot) {
    console.log("🕒 Sistema de licencias iniciado.");

    db.ref("activations").on("child_added", async (snap) => {
        const data = snap.val();

        if (!data || data.notified) return;

        const text = `🔔 NOTIFICACIÓN DE USO 🔔

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
        } catch (err) {
            console.error("Error enviando notificación:", err);
        }
    });
}
