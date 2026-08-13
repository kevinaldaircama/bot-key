import db from "../firebase.js";

function formatDate(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function registerHistory(bot) {
  bot.on("callback_query", async (query) => {
    if (query.data !== "menu_history") return;

    await bot.answerCallbackQuery(query.id);

    const chatId = String(query.message.chat.id);

    const snap = await db
      .ref(`history/${chatId}`)
      .orderByChild("time")
      .limitToLast(15)
      .get();

    let text = `📜 <b>Mi Historial (últimos 15)</b>\n\n`;

    if (!snap.exists()) {
      text += "No hay registros aún.";
    } else {
      const items = [];

      snap.forEach(item => {
        items.push(item.val());
      });

      items.reverse();

      for (const h of items) {
        text += `• <b>${h.type}</b>\n`;

        if (h.type === "DOMINIO_NS") {
          text += `  ↳ ${h.domain} -> ${h.target}\n`;
        } else if (h.type === "DOMINIO_A") {
          text += `  ↳ ${h.domain}\n`;
        } else if (h.type === "CUPON") {
          text += `  ↳ ${h.code} (+${h.days}d)\n`;
        } else {
          text += `  ↳ ${h.value}\n`;
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
          [
            { text: "🔄 Actualizar", callback_data: "menu_history" }
          ],
          [
            { text: "🔑 Crear Key", callback_data: "menu_key" },
            { text: "📈 Mi Uso", callback_data: "menu_usage" }
          ],
          [
            { text: "🏠 Inicio", callback_data: "menu_home" }
          ]
        ]
      }
    });
  });
}
