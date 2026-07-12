import db from "../firebase.js";
import { pendingApprovals } from "./callback.js";

export default function registerApprove(bot) {

    bot.on("message", async (msg) => {

        if (!msg.text) return;

        const ownerId = String(msg.from.id);

        if (!pendingApprovals.has(ownerId)) return;

        const days = Number(msg.text);

        if (isNaN(days) || days < 0) {

            return bot.sendMessage(ownerId,
                "❌ Escribe un número válido.\n\nEjemplo:\n30");
        }

        const userId = pendingApprovals.get(ownerId);

        let expire = "Ilimitado";

        if (days > 0) {

            const date = new Date();

            date.setDate(date.getDate() + days);

            expire = date.toISOString();

        }

        await db.ref(`users/${userId}`).update({

            approved: true,

            role: "admin",

            expire

        });

        await db.ref(`requests/${userId}`).remove();

        pendingApprovals.delete(ownerId);

        await bot.sendMessage(ownerId,

`✅ Usuario aprobado correctamente.

👤 ID: ${userId}

📅 Duración: ${days == 0 ? "Ilimitado" : days + " días"}`);

        await bot.sendMessage(userId,

`🎉 Tu solicitud fue aprobada.

📅 Acceso:

${days == 0 ? "Ilimitado" : days + " días"}

Escribe nuevamente:

/start`);

    });

}
