import db from "../db.js";

function isNavigationCallback(data = "") {
  return [
    "menu_home",
    "menu_history",
    "menu_usage",
    "menu_statistics",
    "menu_plans",
    "menu_domains",
    "menu_settings",
    "menu_reseller",
  ].includes(String(data));
}

async function getStaffRole(chatId, config) {
  const id = String(chatId);

  if (id === String(config.OWNER_ID)) return "owner";

  try {
    const snap = await db.ref(`users/${id}`).get();
    const user = snap.val() || {};

    if (
      user.role === "owner" ||
      user.isOwner === true ||
      user.owner === true
    ) return "owner";

    if (
      user.role === "admin" ||
      user.isAdmin === true ||
      user.admin === true
    ) return "admin";
  } catch {}

  return null;
}

async function saveAudit(config, chatId, username, action, details = "") {
  const role = await getStaffRole(chatId, config);
  if (!role) return;

  await db.ref("auditHistory").push({
    chatId: String(chatId),
    username: username || String(chatId),
    role,
    action,
    details: String(details || "").slice(0, 1000),
    createdAt: Date.now(),
  });
}

export default function registerAudit(bot, config) {
  bot.on("callback_query", async (query) => {
    try {
      const data = String(query.data || "");
      if (!data || isNavigationCallback(data)) return;

      const role = await getStaffRole(query.from.id, config);
      if (!role) return;

      await saveAudit(
        config,
        query.from.id,
        query.from.username ? `@${query.from.username}` : query.from.first_name,
        "BOTÓN",
        data
      );
    } catch (err) {
      console.error("Audit callback:", err.message);
    }
  });

  bot.on("message", async (msg) => {
    try {
      if (!msg.text) return;
      const role = await getStaffRole(msg.from?.id ?? msg.chat?.id, config);
      if (!role) return;

      const text = String(msg.text).trim();
      if (!text) return;

      await saveAudit(
        config,
        msg.from?.id ?? msg.chat?.id,
        msg.from?.username ? `@${msg.from.username}` : msg.from?.first_name,
        text.startsWith("/") ? "COMANDO" : "ENTRADA",
        text
      );
    } catch (err) {
      console.error("Audit message:", err.message);
    }
  });
}

export { getStaffRole, saveAudit };
