import db from "../db.js";

export default function registerUsage(bot) {
  bot.on("callback_query", async (query) => {
    if (query.data !== "menu_usage") return;

    await bot.answerCallbackQuery(query.id);

    const chatId = String(query.message.chat.id);

    // ===== KEYS =====
    const keysSnap = await db.ref("keys").get();

    let total = 0;
    let disponibles = 0;

    const now = Date.now();

    if (keysSnap.exists()) {
      keysSnap.forEach(item => {
        const key = item.val();

        if (key.owner !== chatId) return;

        total++;

        if (!key.used && key.expires > now) {
          disponibles++;
        }
      });
    }

    // ===== DOMINIOS =====
    const domainsSnap = await db.ref(`domains/${chatId}`).get();

    let totalDominios = 0;
    let dominiosA = 0;
    let dominiosNS = 0;

    if (domainsSnap.exists()) {
      const data = domainsSnap.val();

      for (const key in data) {
        if (key === "ns") continue;
        dominiosA++;
      }

      if (data.ns) {
        for (const key in data.ns) {
          dominiosNS++;
        }
      }

      totalDominios = dominiosA + dominiosNS;
    }

    await bot.editMessageText(
`📈 <b>MI USO</b>

━━━━━━━━━━━━━━━━━━

🔑 <b>Keys Generadas</b>

${total}

🟢 <b>Disponibles</b>

${disponibles}

🌐 <b>Dominios Totales</b>

${totalDominios}

🅰️ <b>Registros A</b>

${dominiosA}

🧩 <b>Registros NS</b>

${dominiosNS}

━━━━━━━━━━━━━━━━━━

🕒 <b>Última actualización</b>

${new Date().toLocaleString("es-PE")}`,
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🔄 Actualizar", callback_data: "menu_usage" }
            ],
            [
              { text: "📜 Historial", callback_data: "menu_history" },
              { text: "🔑 Crear Key", callback_data: "menu_key" }
            ],
            [
              { text: "🏠 Inicio", callback_data: "menu_home" }
            ]
          ]
        }
      }
    );
  });
}
