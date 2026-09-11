import axios from "axios";

const PLANS = [
  { label: "7 Días", days: 7, admin: 2.50, owner: 8 },
  { label: "30 Días", days: 30, admin: 5, owner: 10 },
  { label: "60 Días", days: 60, admin: 10, owner: 15 },
  { label: "90 Días", days: 90, admin: 25, owner: 20 },
  { label: "365 Días (1 Año)", days: 365, admin: 35, owner: 40 },
  { label: "♾️ Acceso Ilimitado", days: 0, admin: 150, owner: 200 },
];

function money(value) {
  return Number(value).toFixed(2);
}

export default function registerPlans(bot) {
  bot.onText(/\/planes(?:@\w+)?/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const { data } = await axios.get(
        "https://open.er-api.com/v6/latest/USD",
        { timeout: 7000 }
      );

      const tc = Number(data?.rates?.PEN);
      if (!Number.isFinite(tc) || tc <= 0) throw new Error("Tipo de cambio inválido");

      const lines = PLANS.map((plan) => {
        const adminPen = money(plan.admin * tc);
        const ownerPen = money(plan.owner * tc);

        return [
          `📅 <b>${plan.label}</b>`,
          `🛡️ Admin: <b>$${money(plan.admin)}</b> | 🇵🇪 <b>S/ ${adminPen}</b>`,
          `👑 Dueño: <b>$${money(plan.owner)}</b> | 🇵🇪 <b>S/ ${ownerPen}</b>`,
        ].join("\n");
      }).join("\n\n");

      await bot.sendMessage(
        chatId,
`🚀 <b>MULTI SCRIPT VPN PREMIUM</b>

━━━━━━━━━━━━━━━━━━

💎 <b>PLANES ADMIN / DUEÑO</b>

${lines}

━━━━━━━━━━━━━━━━━━

💱 <b>Tipo de cambio actual:</b>
1 USD = S/ ${money(tc)}

🇵🇪 Los precios en soles se recalculan automáticamente según el tipo de cambio actual.

━━━━━━━━━━━━━━━━━━

📩 ¿Deseas comprar un acceso?`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "💳 Comprar Acceso", url: "https://t.me/senseicamachito" }],
              [{ text: "📩 Unirme al grupo", url: "https://t.me/multiscriptofi" }],
            ],
          },
        }
      );
    } catch (err) {
      console.error("❌ Error tipo de cambio:", err.message);
      await bot.sendMessage(
        chatId,
        "❌ No se pudo obtener el tipo de cambio actual. Intenta nuevamente en unos segundos."
      );
    }
  });
}
