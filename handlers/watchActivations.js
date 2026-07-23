import db from "../firebase.js";

export default function registerActivations(bot) {
    console.log("🕒 Sistema de licencias iniciado.");

    db.ref("activations").on("child_added", async (snap) => {
        const data = snap.val();

        console.log("📥 Activación detectada:", snap.key);

        if (!data) return;
        if (data.notified === true) return;

        try {
            console.log("📤 Enviando mensaje a:", data.owner);

            await bot.sendMessage(data.owner, `🔔 NOTIFICACIÓN DE USO 🔔

✅ Tu Token ha sido activado.

👤 Reseller: ${data.reseller || "N/A"}
🔑 Token: ${data.token || "N/A"}
🌐 IP Cliente: ${data.ip || "N/A"}
🖥 Host: ${data.hostname || "N/A"}
🐧 Sistema: ${data.os || "N/A"}
📅 Fecha: ${data.date || "N/A"}`);

            await snap.ref.update({ notified: true });

            console.log("✅ Notificación enviada:", data.token);

        } catch (err) {
            console.error("❌ Error:");
            console.error(err.response?.body || err);
        }
    });
}
