import db from "../firebase.js";

export default function registerActivations(bot) {
    console.log("🕒 Sistema de licencias iniciado.");

    db.ref("activations").on("child_added", async (snap) => {
        const data = snap.val();

        if (!data || data.notified) return;

        const text = `🔔 NOTIFICACIÓN DE USO 🔔

✅ Tu Token ha sido activado.

👤 Reseller: ${data.reseller || "N/A"}
🔑 Token: ${data.token || "N/A"}
🌐 IP Cliente: ${data.ip || "N/A"}
🖥 Host: ${data.hostname || "N/A"}
🐧 Sistema: ${data.os || "N/A"}
📅 Fecha: ${data.date || "N/A"}`;

        try {
            await bot.sendMessage(data.owner, text);

            await snap.ref.update({
                notified: true
            });

            console.log(`✅ Activación notificada: ${data.token}`);
        } catch (err) {
            console.error("❌ Error enviando notificación:", err);
        }
    });
}
