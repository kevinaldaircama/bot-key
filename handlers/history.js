import db from "../db.js";
import config from "../config.js";
import { getStaffRole } from "./audit.js";

function formatDate(ts) {
  const value = Number(ts || 0);
  if (!value) return "Fecha desconocida";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Fecha desconocida";

  return d.toLocaleString("es-PE", {
    timeZone: "America/Lima",
    hour12: false,
  });
}

function collectChildren(snapshot, target, filter = null) {
  if (!snapshot?.exists()) return;

  snapshot.forEach((item) => {
    const value = item.val();
    if (!value || typeof value !== "object") return;
    if (filter && !filter(value)) return;

    target.push({
      id: item.key,
      ...value,
      time: Number(value.time || value.createdAt || value.revokedAt || 0),
    });
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function registerHistory(bot) {
  bot.on("callback_query", async (query) => {
    if (query.data !== "menu_history") return;

    try {
      await bot.answerCallbackQuery(query.id);

      const chatId = String(query.message.chat.id);
      const role = await getStaffRole(chatId, config);
      const items = [];

      if (role === "owner" || role === "admin") {
        // Staff: mostrar TODO el registro de acciones de propietarios/admins.
        const auditSnap = await db.ref("auditHistory").get();
        collectChildren(auditSnap, items);

        // Conservar también el historial antiguo ya existente.
        const ownHistory = await db.ref(`history/${chatId}`).get();
        collectChildren(ownHistory, items);
      } else {
        // Usuarios normales: solo su propio historial.
        const historySnap = await db.ref(`history/${chatId}`).get();
        const keyHistorySnap = await db.ref("keyHistory").get();

        collectChildren(historySnap, items);
        collectChildren(
          keyHistorySnap,
          items,
          (value) => String(value.chatId || "") === chatId
        );
      }

      const unique = new Map();
      for (const item of items) {
        const signature = [
          item.id || "",
          item.type || item.action || "",
          item.key || item.domain || item.details || item.value || "",
          item.time || 0,
        ].join("|");
        unique.set(signature, item);
      }

      const ordered = [...unique.values()]
        .sort((a, b) => b.time - a.time)
        .slice(0, role === "owner" || role === "admin" ? 50 : 15);

      let text = role === "owner" || role === "admin"
        ? "📜 <b>HISTORIAL DE ACCIONES STAFF</b>\n\n"
        : "📜 <b>MI HISTORIAL</b>\n\n";

      if (ordered.length === 0) {
        text += "No hay registros todavía.";
      } else {
        for (const h of ordered) {
          const type = String(
            h.type ||
            h.action ||
            "EVENTO"
          );

          if (h.role) {
            text += `• <b>${escapeHtml(h.role.toUpperCase())}</b> · ${escapeHtml(h.username || h.chatId || "-\n")}\n`;
            text += `  ⚙️ <b>${escapeHtml(type)}</b>: <code>${escapeHtml(h.details || "-")}</code>\n`;
          } else {
            text += `• <b>${escapeHtml(type)}</b>\n`;
            if (type === "DOMINIO_NS") {
              text += `  ↳ ${escapeHtml(h.domain || "-")} → ${escapeHtml(h.target || "-")}\n`;
            } else if (type === "DOMINIO_A") {
              text += `  ↳ ${escapeHtml(h.domain || "-")}\n`;
            } else if (type === "CUPON") {
              text += `  ↳ ${escapeHtml(h.code || "-")} (+${escapeHtml(h.days || 0)}d)\n`;
            } else if (h.key) {
              text += `  ↳ <code>${escapeHtml(h.key)}</code>\n`;
            } else {
              text += `  ↳ ${escapeHtml(h.value || h.action || "-")}\n`;
            }
          }

          text += `  🕒 ${formatDate(h.time)}\n\n`;
        }
      }

      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 Actualizar", callback_data: "menu_history" }],
            [
              { text: "🔑 Crear Key", callback_data: "menu_key" },
              { text: "📈 Mi Uso", callback_data: "menu_usage" },
            ],
            [{ text: "🏠 Inicio", callback_data: "menu_home" }],
          ],
        },
      });
    } catch (error) {
      console.error("❌ Error historial:", error);
      try {
        await bot.answerCallbackQuery(query.id, {
          text: "No se pudo cargar el historial.",
          show_alert: true,
        });
      } catch {}
    }
  });
}
