import crypto from "crypto";
import db from "../db.js";

const WEBAPP_URL = "https://kevinaldaircama.github.io/bot-key";
const REQUIRED_ADS = 5;

const KEY_LIFETIME = 2 * 60 * 60 * 1000;
const FREE_KEY_COOLDOWN = 24 * 60 * 60 * 1000;

const INSTALL_URL =
  "https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/install.sh";

const UPDATE_URL =
  "https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/update.sh";

function generateRandomKey() {
  const part1 = crypto.randomBytes(4).toString("hex").toUpperCase();
  const part2 = crypto.randomBytes(4).toString("hex").toUpperCase();

  return `KT-${part1}-${part2}`;
}

function getUser(chatId) {
  return db.ref(`users/${chatId}`).get() || {};
}

function saveUser(chatId, data) {
  return db.ref(`users/${chatId}`).update(data);
}

function getUserKeys(chatId) {
  return db.ref("keys").get() || {};
}

function isStaff(config, chatId) {
  const id = String(chatId);

  if (String(config.OWNER_ID) === id) {
    return true;
  }

  const user = getUser(chatId);

  if (user?.isAdmin === true) {
    return true;
  }

  if (user?.isStaff === true) {
    return true;
  }

  return false;
}

function formatRemaining(ms) {
  if (ms <= 0) return "0m";

  const totalMinutes = Math.ceil(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(" ");
}

function keyFreeMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🤖 Auto",
            callback_data: "free_key_auto",
          },
          {
            text: "📦 Normal",
            callback_data: "free_key_normal",
          },
        ],
        [
          {
            text: "🔄 Actualizar",
            callback_data: "free_key_update",
          },
        ],
        [
          {
            text: "🚫 Revocar Key",
            callback_data: "free_key_revoke",
          },
        ],
      ],
    },
  };
}

async function sendAdRequired(bot, chatId) {
  await bot.sendMessage(
    chatId,
    "🔒 <b>KEY FREE BLOQUEADA</b>\n\n" +
      `📺 Debes completar <b>${REQUIRED_ADS} anuncios</b> para desbloquear tu Key Free.\n\n` +
      "Cuando termines los anuncios, pulsa <b>VOLVER AL BOT</b> para continuar.",
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `📺 Ver ${REQUIRED_ADS} anuncios`,
              web_app: {
                url: WEBAPP_URL,
              },
            },
          ],
        ],
      },
    }
  );
}

async function generateKey(bot, chatId, config, mode = "normal") {
  const user = getUser(chatId);

  const staff = isStaff(config, chatId);

  /*
   * Los usuarios normales tienen límite de 24 horas.
   * Staff / Owner no tienen este límite.
   */
  if (!staff) {
    const freeKeyAt = Number(user?.freeKeyAt || 0);
    const now = Date.now();

    if (freeKeyAt > now) {
      const remaining = formatRemaining(freeKeyAt - now);

      await bot.sendMessage(
        chatId,
        "⏳ <b>KEY FREE EN COOLDOWN</b>\n\n" +
          `Debes esperar <b>${remaining}</b> para generar otra Key Free.`,
        {
          parse_mode: "HTML",
        }
      );

      return;
    }

    /*
     * Verificación de anuncios.
     */
    if (user?.adsKeyUnlocked !== true) {
      await sendAdRequired(bot, chatId);
      return;
    }
  }

  const key = generateRandomKey();

  const now = Date.now();
  const expiresAt = now + KEY_LIFETIME;

  const keyData = {
    key,
    chatId,
    username: user?.username || "",
    type: "free",
    mode,
    createdAt: now,
    expiresAt,
    active: true,
  };

  await db.ref(`keys/${key}`).set(keyData);

  /*
   * Consumir el desbloqueo de anuncios.
   * Solo usuarios normales.
   */
  if (!staff) {
    await saveUser(chatId, {
      adsKeyUnlocked: false,
      freeKeyAt: now + FREE_KEY_COOLDOWN,
    });
  }

  /*
   * Guardar historial.
   */
  await db.ref("keyHistory").push().set({
    action: "created",
    key,
    chatId,
    username: user?.username || "",
    type: "free",
    mode,
    createdAt: now,
    expiresAt,
  });

  const activeKeys = Object.values(getUserKeys(chatId))
    .filter((item) => {
      return (
        item &&
        String(item.chatId) === String(chatId) &&
        item.active === true &&
        Number(item.expiresAt || 0) > now
      );
    })
    .length;

  await bot.sendMessage(
    chatId,
    "╔════════════════════════════╗\n" +
      "║     🔑 <b>KEY FREE CREADA</b>     ║\n" +
      "╚════════════════════════════╝\n\n" +
      `🔐 <b>Key:</b>\n<code>${key}</code>\n\n` +
      `📦 <b>Modo:</b> ${mode}\n` +
      `⏱️ <b>Duración:</b> 2 horas\n` +
      `📊 <b>Keys activas:</b> ${activeKeys}\n\n` +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "📥 <b>INSTALACIÓN</b>\n\n" +
      `<code>bash &lt;(curl -fsSL ${INSTALL_URL})</code>\n\n` +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "🔄 <b>ACTUALIZAR</b>\n\n" +
      `<code>bash &lt;(curl -fsSL ${UPDATE_URL})</code>`,
    {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }
  );
}

async function revokeKey(bot, chatId, key) {
  const keyData = db.ref(`keys/${key}`).get();

  if (!keyData) {
    await bot.sendMessage(
      chatId,
      "❌ <b>Key no encontrada.</b>",
      {
        parse_mode: "HTML",
      }
    );

    return;
  }

  if (String(keyData.chatId) !== String(chatId)) {
    await bot.sendMessage(
      chatId,
      "❌ <b>Esta Key no pertenece a tu cuenta.</b>",
      {
        parse_mode: "HTML",
      }
    );

    return;
  }

  const now = Date.now();

  await db.ref("keyHistory").push().set({
    action: "revoked",
    key,
    chatId,
    username: keyData.username || "",
    type: keyData.type || "free",
    mode: keyData.mode || "normal",
    createdAt: keyData.createdAt || now,
    expiresAt: keyData.expiresAt || null,
    revokedAt: now,
  });

  await db.ref(`keys/${key}`).remove();

  await bot.sendMessage(
    chatId,
    "✅ <b>KEY REVOCADA</b>\n\n" +
      `🔑 <code>${key}</code>\n\n` +
      "La Key fue eliminada correctamente.",
    {
      parse_mode: "HTML",
    }
  );
}

export default function registerFreeKey(bot, config) {
  /*
   * /keyfree
   */
  bot.onText(/^\/keyfree(?:@\w+)?$/i, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const user = getUser(chatId);
      const staff = isStaff(config, chatId);

      /*
       * Staff entra directamente al menú.
       */
      if (staff) {
        await bot.sendMessage(
          chatId,
          "🔑 <b>KEY FREE</b>\n\n" +
            "Selecciona una opción:",
          {
            parse_mode: "HTML",
            ...keyFreeMenu(),
          }
        );

        return;
      }

      /*
       * Comprobar cooldown.
       */
      const freeKeyAt = Number(user?.freeKeyAt || 0);
      const now = Date.now();

      if (freeKeyAt > now) {
        const remaining = formatRemaining(freeKeyAt - now);

        await bot.sendMessage(
          chatId,
          "⏳ <b>KEY FREE EN COOLDOWN</b>\n\n" +
            `Podrás generar otra Key en aproximadamente <b>${remaining}</b>.`,
          {
            parse_mode: "HTML",
          }
        );

        return;
      }

      /*
       * Comprobar anuncios.
       */
      if (user?.adsKeyUnlocked !== true) {
        await sendAdRequired(bot, chatId);
        return;
      }

      /*
       * Menú Key Free.
       */
      await bot.sendMessage(
        chatId,
        "🔑 <b>KEY FREE</b>\n\n" +
          "Tu Key Free está desbloqueada.\n\n" +
          "Selecciona una opción:",
        {
          parse_mode: "HTML",
          ...keyFreeMenu(),
        }
      );
    } catch (error) {
      console.error("Error /keyfree:", error);

      await bot.sendMessage(
        chatId,
        "❌ Ocurrió un error al abrir Key Free."
      );
    }
  });

  /*
   * /start adscompleted
   *
   * Este comando viene desde el botón
   * VOLVER AL BOT de la WebApp.
   */
  bot.onText(
    /^\/start(?:@\w+)?\s+adscompleted$/i,
    async (msg) => {
      const chatId = msg.chat.id;

      try {
        await saveUser(chatId, {
          adsKeyUnlocked: true,
        });

        await bot.sendMessage(
          chatId,
          "✅ <b>ANUNCIOS COMPLETADOS</b>\n\n" +
            "Tu Key Free está desbloqueada.\n\n" +
            "Usa <code>/keyfree</code> para continuar.",
          {
            parse_mode: "HTML",
          }
        );
      } catch (error) {
        console.error("Error /start adscompleted:", error);

        await bot.sendMessage(
          chatId,
          "❌ No se pudo desbloquear tu Key Free."
        );
      }
    }
  );

  /*
   * AUTO
   */
  bot.on("callback_query", async (query) => {
    const chatId = query.message?.chat?.id;

    if (!chatId) return;

    try {
      if (query.data === "free_key_auto") {
        await bot.answerCallbackQuery(query.id);

        await generateKey(
          bot,
          chatId,
          config,
          "auto"
        );

        return;
      }

      /*
       * NORMAL
       */
      if (query.data === "free_key_normal") {
        await bot.answerCallbackQuery(query.id);

        await generateKey(
          bot,
          chatId,
          config,
          "normal"
        );

        return;
      }

      /*
       * ACTUALIZAR
       */
      if (query.data === "free_key_update") {
        await bot.answerCallbackQuery(query.id);

        await bot.sendMessage(
          chatId,
          "🔄 <b>ACTUALIZAR</b>\n\n" +
            `<code>bash &lt;(curl -fsSL ${UPDATE_URL})</code>`,
          {
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }
        );

        return;
      }

      /*
       * REVOCAR
       */
      if (query.data === "free_key_revoke") {
        await bot.answerCallbackQuery(query.id);

        const keys = getUserKeys(chatId);
        const now = Date.now();

        const userKeys = Object.values(keys).filter((item) => {
          return (
            item &&
            String(item.chatId) === String(chatId) &&
            item.active === true &&
            Number(item.expiresAt || 0) > now
          );
        });

        if (userKeys.length === 0) {
          await bot.sendMessage(
            chatId,
            "📭 <b>No tienes Keys activas para revocar.</b>",
            {
              parse_mode: "HTML",
            }
          );

          return;
        }

        const buttons = userKeys.map((item) => [
          {
            text: `🚫 ${item.key}`,
            callback_data: `free_revoke_${item.key}`,
          },
        ]);

        buttons.push([
          {
            text: "❌ Cancelar",
            callback_data: "free_revoke_cancel",
          },
        ]);

        await bot.sendMessage(
          chatId,
          "🚫 <b>REVOCAR KEY</b>\n\n" +
            "Selecciona la Key que deseas revocar:",
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: buttons,
            },
          }
        );

        return;
      }

      /*
       * CANCELAR REVOCACIÓN
       */
      if (query.data === "free_revoke_cancel") {
        await bot.answerCallbackQuery(query.id);

        await bot.sendMessage(
          chatId,
          "❌ Operación cancelada."
        );

        return;
      }

      /*
       * REVOCAR KEY ESPECÍFICA
       */
      if (query.data.startsWith("free_revoke_")) {
        const key = query.data.replace("free_revoke_", "");

        await bot.answerCallbackQuery(query.id);

        await revokeKey(
          bot,
          chatId,
          key
        );

        return;
      }
    } catch (error) {
      console.error(
        "Error callback Key Free:",
        error
      );

      try {
        await bot.answerCallbackQuery(
          query.id,
          {
            text: "❌ Ocurrió un error.",
            show_alert: true,
          }
        );
      } catch {}
    }
  });
}