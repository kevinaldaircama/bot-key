import axios from "axios";
import db from "../db.js";
import config from "../config.js";

const PLANS = [
  { label: "7 Días", days: 7, admin: 5, owner: 10 },
  { label: "30 Días", days: 30, admin: 10, owner: 15 },
  { label: "60 Días", days: 60, admin: 15, owner: 20 },
  { label: "90 Días", days: 90, admin: 20, owner: 25 },
  { label: "365 Días (1 Año)", days: 365, admin: 30, owner: 25 },
  { label: "♾️ Acceso Ilimitado", days: 0, admin: 35, owner: 30 },
];
const money = value => Number(value).toFixed(2);

export default function registerPlans(bot) {
  bot.onText(/\/planes(?:@\w+)?/, async msg => {
    const chatId = String(msg.chat.id);
    try {
      const { data } = await axios.get("https://open.er-api.com/v6/latest/USD", { timeout: 7000 });
      const tc = Number(data?.rates?.PEN);
      if (!Number.isFinite(tc) || tc <= 0) throw new Error("Tipo de cambio inválido");
      const lines = PLANS.map((plan, i) => [
        `📅 <b>${plan.label}</b>`,
        `🛡️ Admin: <b>$${money(plan.admin)}</b> | 🇵🇪 <b>S/ ${money(plan.admin * tc)}</b>`,
        `👑 Dueño/Sub dueño: <b>$${money(plan.owner)}</b> | 🇵🇪 <b>S/ ${money(plan.owner * tc)}</b>`,
      ].join("\n")).join("\n\n");
      await bot.sendMessage(chatId, `🚀 <b>MULTI SCRIPT VPN PREMIUM</b>\n\n━━━━━━━━━━━━━━━━━━\n\n💎 <b>PLANES ADMIN / DUEÑO</b>\n\n${lines}\n\n━━━━━━━━━━━━━━━━━━\n💱 1 USD = S/ ${money(tc)}\n\nSelecciona comprar acceso para contactar a un administrador autorizado.`, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [
          ...PLANS.map((p, i) => [{ text: `💳 Comprar ${p.label}`, callback_data: `plan_buy_${i}` }]),
          [{ text: "📩 Unirme al grupo", url: "https://t.me/multiscriptofi" }]
        ] }
      });
    } catch (err) {
      console.error("Error tipo de cambio:", err.message);
      await bot.sendMessage(chatId, "❌ No se pudo obtener el tipo de cambio actual. Intenta nuevamente.");
    }
  });

  bot.on("callback_query", async query => {
    const match = /^plan_buy_(\d)$/.exec(query.data || "");
    if (!match) return;
    const plan = PLANS[Number(match[1])];
    if (!plan) return bot.answerCallbackQuery(query.id, { text: "Plan no válido.", show_alert: true });
    await bot.answerCallbackQuery(query.id);
    const usersSnap = await db.ref("users").get();
    const configured = new Set((config.AUTHORIZED_CONTACT_IDS || []).map(String));
    configured.add(String(config.OWNER_ID));
    const contacts = [];
    if (usersSnap.exists()) usersSnap.forEach(item => {
      const u = item.val() || {};
      if ((["owner", "admin", "subowner"].includes(u.role) && u.approved !== false && !u.banned) || configured.has(String(item.key))) {
        contacts.push({ id: String(item.key), name: u.name || "Administrador", role: u.role || "Autorizado" });
      }
    });
    for (const id of configured) if (!contacts.some(c => c.id === id)) contacts.push({ id, name: "Contacto autorizado", role: "Autorizado" });
    const rows = contacts.slice(0, 30).map(c => [{ text: `${c.role === "owner" ? "👑" : "🛡️"} ${c.name}`, url: `tg://user?id=${c.id}` }]);
    if (!rows.length) return bot.sendMessage(query.message.chat.id, "❌ No hay administradores de compra configurados. Contacta al dueño.");
    await bot.sendMessage(query.message.chat.id, `💳 <b>COMPRA DE ACCESO</b>\n\nPlan: <b>${plan.label}</b>\n\nSelecciona un dueño, sub dueño o administrador autorizado para coordinar tu compra.`, { parse_mode: "HTML", reply_markup: { inline_keyboard: rows } });
  });
}
