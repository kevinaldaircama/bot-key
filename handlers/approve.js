import db from "../db.js";
import config from "../config.js";
import { pendingApprovals, pendingApprovalRoles } from "./callback.js";

export default function registerApprove(bot) {

    bot.on("callback_query", async (query) => {

        if (!query.data.startsWith("days_")) return;

        const ownerId = String(query.from.id);

        if (!pendingApprovals.has(ownerId)) {
            return bot.answerCallbackQuery(query.id, {
                text: "La solicitud ya expiró.",
                show_alert: true
            });
        }

        const days = Number(query.data.split("_")[1]);
        if (!Number.isInteger(days) || ![0, 7, 30, 60, 90, 365].includes(days)) {
            return bot.answerCallbackQuery(query.id, {
                text: "Duración no válida.",
                show_alert: true
            });
        }

        const userId = pendingApprovals.get(ownerId);
        const approvedRole = pendingApprovalRoles.get(ownerId) || "admin";

        // Solo el dueño configurado puede conceder el rango de sub dueño.
        if (approvedRole === "subowner" && ownerId !== String(config.OWNER_ID)) {
            pendingApprovals.delete(ownerId);
            pendingApprovalRoles.delete(ownerId);
            return bot.answerCallbackQuery(query.id, {
                text: "Solo el dueño puede crear sub dueños.",
                show_alert: true
            });
        }

        const roleLabel = approvedRole === "subowner" ? "Sub dueño" : "Admin";
        await bot.answerCallbackQuery(query.id);

        let expire = "Ilimitado";

        if (days > 0) {

            const date = new Date();

            date.setDate(date.getDate() + days);

            expire = date.toISOString();

        }

        let displayName = "";
        const currentUser = (await db.ref(`users/${userId}`).get()).val() || {};
        displayName = String(currentUser.name || "").trim();
        if (!displayName || displayName === "undefined" || displayName === "Usuario") {
            try {
                const telegramUser = await bot.getChat(userId);
                displayName = [
                    telegramUser.first_name,
                    telegramUser.last_name
                ].filter(Boolean).join(" ").trim()
                    || telegramUser.username
                    || `Usuario ${userId}`;
            } catch {
                displayName = `Usuario ${userId}`;
            }
        }

        await db.ref(`users/${userId}`).update({
            name: displayName,
            approved: true,
            banned: false,
            role: approvedRole,
            expire
        });

        const requestRef = db.ref(`requests/${userId}`);
const requestSnap = await requestRef.get();

if (requestSnap.exists()) {
    await requestRef.remove();
}

        pendingApprovals.delete(ownerId);
        pendingApprovalRoles.delete(ownerId);

        await bot.editMessageText(

`✅ <b>Usuario Aprobado</b>

━━━━━━━━━━━━━━━━━━

👤 <b>ID</b>

<code>${userId}</code>

📅 <b>Duración</b>

${days === 0 ? "♾️ Ilimitado" : `${days} días`}

🛡️ <b>Rol</b>

${roleLabel}

━━━━━━━━━━━━━━━━━━

El usuario ya puede acceder al panel.`,

        {

            chat_id: query.message.chat.id,

            message_id: query.message.message_id,

            parse_mode: "HTML",

            reply_markup: {

                inline_keyboard: [

                    [

                        {
                            text: "🏠 Inicio",
                            callback_data: "menu_home"
                        }

                    ]

                ]

            }

        });

        await bot.sendMessage(

            userId,

`🎉 <b>¡Solicitud Aprobada!</b>

━━━━━━━━━━━━━━━━━━

✅ Ya tienes acceso al sistema.

🛡️ <b>Rol</b>

${roleLabel}

📅 <b>Duración</b>

${days === 0 ? "♾️ Ilimitado" : `${days} días`}

━━━━━━━━━━━━━━━━━━

Pulsa el botón para entrar al panel.`,

            {

                parse_mode: "HTML",

                reply_markup: {

                    inline_keyboard: [

                        [

                            {
                                text: "🏠 Abrir Panel",
                                callback_data: "menu_home"
                            }

                        ]

                    ]

                }

            }

        );

    });

}
