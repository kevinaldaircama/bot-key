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
        `👑 Sub dueño: <b>$${money(plan.owner)}</b> | 🇵🇪 <b>S/ ${money(plan.owner * tc)}</b>`,
      ].join("\n")).join("\n\n");
      await bot.sendMessage(chatId, `🚀 <b>MULTI SCRIPT VPN PREMIUM</b>\n\n━━━━━━━━━━━━━━━━━━\n\n💎 <b>PLANES ADMIN / DUEÑO</b>\n\n${lines}\n\n━━━━━━━━━━━━━━━━━━\n💱 1 USD = S/ ${money(tc)}\n\n<b>Permisos por rango:</b>
• Los Admin pueden generar y vender keys.
• Los Sub dueños pueden dar acceso a usuarios.
• Los Dueños pueden realizar todas las funciones.

Selecciona comprar acceso para contactar a una persona autorizada.`, {
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
        const storedName = String(u.name || "").trim() === "Usuario" ? "" : String(u.name || "").trim();
        const usernameRaw = String(u.username || "").trim();
        const username = usernameRaw === "Sin username" ? "" : usernameRaw.replace(/^@/, "");
        contacts.push({
          id: String(item.key),
          name: storedName || (username ? `@${username}` : ""),
          role: u.role || "Autorizado"
        });
      }
    });
    for (const id of configured) {
      if (!contacts.some(c => c.id === id)) {
        contacts.push({ id, name: "", role: "Autorizado" });
      }
    }

    // Completar el nombre desde Telegram si no está guardado en la base de datos.
    for (const contact of contacts) {
      if (contact.name) continue;
      try {
        const telegramUser = await bot.getChat(contact.id);
        const fullName = [telegramUser.first_name, telegramUser.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();
        contact.name = fullName || (telegramUser.username ? `@${telegramUser.username}` : "");
      } catch (error) {
        console.warn(`[PLANES] No se pudo obtener el nombre de ${contact.id}:`, error.message);
      }
      if (!contact.name) contact.name = `ID ${contact.id}`;
    }

    const roleLabels = {
      owner: "Dueño",
      admin: "Admin",
      subowner: "Sub dueño",
      Autorizado: "Autorizado"
    };
    // Mostrar nombre y rango en el botón, por ejemplo: "Kevin tech · Admin".
    const rows = contacts.slice(0, 30).map(c => {
      const role = roleLabels[c.role] || c.role || "Autorizado";
      return [{ text: `${c.name} · ${role}`.slice(0, 64), url: `tg://user?id=${c.id}` }];
    });
    if (!rows.length) return bot.sendMessage(query.message.chat.id, "❌ No hay administradores de compra configurados. Contacta al dueño.");
    await bot.sendMessage(query.message.chat.id, `💳 <b>COMPRA DE ACCESO</b>\n\nPlan: <b>${plan.label}</b>\n\nSelecciona el nombre de la persona autorizada para coordinar tu compra.`, { parse_mode: "HTML", reply_markup: { inline_keyboard: rows } });
  });
}
