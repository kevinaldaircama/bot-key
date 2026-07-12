import db from "../firebase.js";

const waitingReseller = new Map();

export default function registerReseller(bot) {

    // Botón 👥 Reseller
    bot.on("message", async (msg) => {

        if (!msg.text) return;

        const chatId = String(msg.chat.id);

        if (msg.text !== "👥 Resellers") return;

        const snap = await db.ref(`users/${chatId}`).get();

        if (!snap.exists()) return;

        const user = snap.val();

        if (!user.approved) return;

        if (user.role !== "owner" && user.role !== "admin") return;

        waitingReseller.set(chatId, true);

        bot.sendMessage(chatId,

`👤 Escribe el nombre del Reseller.

Ejemplo:

KevinTech
VPN Premium
Mi Empresa`);

    });

    // Guardar nombre
    bot.on("message", async (msg) => {

        if (!msg.text) return;

        const chatId = String(msg.chat.id);

        if (!waitingReseller.has(chatId)) return;

        const reseller = msg.text.trim();

        waitingReseller.delete(chatId);

        await db.ref(`users/${chatId}`).update({

            reseller

        });

        bot.sendMessage(chatId,

`✅ Nombre del Reseller guardado.

Nombre:

${reseller}`);

    });

}
