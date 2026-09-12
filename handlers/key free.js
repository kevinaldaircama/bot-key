import crypto from "crypto";
import db from "../db.js";

// ============================================================
// CONFIGURACIÓN
// ============================================================

const WEBAPP_URL = "https://kevinaldaircama.github.io/bot-key";

const REQUIRED_ADS = 5;
const KEY_LIFETIME = 2 * 60 * 60 * 1000;
const FREE_KEY_COOLDOWN = 24 * 60 * 60 * 1000;

const INSTALL_URL =
  "https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/install.sh";

const UPDATE_URL =
  "https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/update.sh";

// ============================================================
// UTILIDADES
// ============================================================

function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getRemainingTime(timestamp) {
  if (!timestamp) return 0;

  const remaining =
    Number(timestamp) + FREE_KEY_COOLDOWN - Date.now();

  return remaining > 0 ? remaining : 0;
}

function formatRemainingTime(ms) {
  if (ms <= 0) return "0 minutos";

  const totalMinutes = Math.ceil(ms / 60000);

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];

  if (days > 0) {
    parts.push(
      `${days} día${days !== 1 ? "s" : ""}`
    );
  }

  if (hours > 0) {
    parts.push(
      `${hours} hora${hours !== 1 ? "s" : ""}`
    );
  }

  if (minutes > 0) {
    parts.push(
      `${minutes} minuto${minutes !== 1 ? "s" : ""}`
    );
  }

  return parts.join(" ");
}

function generateRandomKey() {
  return (
    "KT-" +
    crypto.randomBytes(4).toString("hex").toUpperCase() +
    "-" +
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );
}

// ============================================================
// TELEGRAM USER
// ============================================================

async function getTelegramName(bot, chatId) {
  try {
    const chat = await bot.getChat(chatId);

    if (chat.username) {
      return `@${chat.username}`;
    }

    if (chat.first_name) {
      return chat.first_name;
    }

    return String(chatId);
  } catch {
    return String(chatId);
  }
}

// ============================================================
// DATABASE
// ============================================================

async function getUser(chatId) {
  try {
    const snapshot =
      await db.ref(`users/${chatId}`).get();

    return snapshot.val() || {};
  } catch (error) {
    console.error(
      "[KEYFREE] Error obteniendo usuario:",
      error
    );

    return {};
  }
}

async function saveUser(chatId, data) {
  await db
    .ref(`users/${chatId}`)
    .update(data);
}

async function getUserKeys(chatId) {
  try {
    const snapshot =
      await db.ref("keys").get();

    const data = snapshot.val() || {};

    return Object.entries(data)
      .map(([key, value]) => ({
        key,
        ...(value || {}),
      }))
      .filter((item) => {
        return (
          String(item.chatId) === String(chatId) &&
          item.type === "free"
        );
      });
  } catch (error) {
    console.error(
      "[KEYFREE] Error obteniendo keys:",
      error
    );

    return [];
  }
}

// ============================================================
// GENERAR KEY
// ============================================================

async function generateKey(bot, chatId) {
  const user = await getUser(chatId);

  const isOwner =
    user.role === "owner" ||
    user.isOwner === true ||
    user.owner === true;

  const isAdmin =
    user.role === "admin" ||
    user.isAdmin === true ||
    user.admin === true;

  const isStaff =
    isOwner || isAdmin;

  // ==========================================================
  // COOLDOWN
  // ==========================================================

  if (!isStaff) {
    const remaining =
      getRemainingTime(user.freeKeyAt);

    if (remaining > 0) {
      return {
        success: false,
        reason: "cooldown",
        remaining,
      };
    }

    // ========================================================
    // ANUNCIOS
    // ========================================================

    if (!user.adsKeyUnlocked) {
      return {
        success: false,
        reason: "ads",
      };
    }
  }

  // ==========================================================
  // CREAR KEY
  // ==========================================================

  const key =
    generateRandomKey();

  const telegramName =
    await getTelegramName(bot, chatId);

  const now = Date.now();

  const expiresAt =
    now + KEY_LIFETIME;

  const keyData = {
    key,
    type: "free",
    chatId: String(chatId),
    username: telegramName,
    createdAt: now,
    expiresAt,
    active: true,
  };

  await db
    .ref(`keys/${key}`)
    .set(keyData);

  // ==========================================================
  // CONSUMIR DESBLOQUEO
  // ==========================================================

  if (!isStaff) {
    await saveUser(chatId, {
      adsKeyUnlocked: false,
      freeKeyAt: now,
    });
  }

  // ==========================================================
  // HISTORIAL
  // ==========================================================

  try {
    await db.ref("keyHistory").push().set({
      key,
      type: "free",
      chatId: String(chatId),
      username: telegramName,
      action: "created",
      createdAt: now,
      expiresAt,
    });
  } catch (error) {
    console.error(
      "[KEYFREE] Error historial:",
      error
    );
  }

  // ==========================================================
  // CONTADOR
  // ==========================================================

  let activeCount = 0;

  try {
    const snapshot =
      await db.ref("keys").get();

    const keys =
      snapshot.val() || {};

    activeCount =
      Object.values(keys).filter((item) => {
        return (
          item &&
          item.active === true &&
          item.type === "free" &&
          Number(item.expiresAt || 0) > now
        );
      }).length;
  } catch (error) {
    console.error(
      "[KEYFREE] Error contador:",
      error
    );
  }

  return {
    success: true,
    key,
    expiresAt,
    activeCount,
    isStaff,
  };
}

// ============================================================
// MENÚ
// ============================================================

function keyFreeMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🤖 Auto",
            callback_data: "free_key_auto",
          },
        ],
        [
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
            callback_data: "free_key_revoke_menu",
          },
        ],
      ],
    },
  };
}

// ============================================================
// MENSAJE PRINCIPAL
// ============================================================

function keyFreeMessage() {
  return (
    "🔑 <b>GESTOR DE KEY FREE</b>\n\n" +
    "Selecciona el tipo de instalación:\n\n" +
    "🤖 <b>Auto</b>\n" +
    "Instalación automática con la key incluida.\n\n" +
    "📦 <b>Normal</b>\n" +
    "Instalación normal y key por separado.\n\n" +
    "🔄 <b>Actualizar</b>\n" +
    "Actualización del Multi Script usando la key.\n\n" +
    "🚫 <b>Revocar Key</b>\n" +
    "Revoca una key free activa."
  );
}

// ============================================================
// ANUNCIOS
// ============================================================

async function sendAdRequired(bot, chatId) {
  await bot.sendMessage(
    chatId,
    "📢 <b>ACTIVACIÓN DE KEY FREE</b>\n\n" +
      `Debes completar <b>${REQUIRED_ADS} anuncios</b> para desbloquear tu key gratuita.\n\n` +
      "Cuando termines, vuelve al bot y pulsa el botón de confirmación.",
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
          [
            {
              text: "🔓 Ya completé los anuncios",
              callback_data: "free_ads_completed",
            },
          ],
        ],
      },
    }
  );
}

// ============================================================
// CREAR KEY
// ============================================================

async function createKeyForMode({
  bot,
  chatId,
  mode,
}) {
  const result =
    await generateKey(bot, chatId);

  // ==========================================================
  // COOLDOWN
  // ==========================================================

  if (
    !result.success &&
    result.reason === "cooldown"
  ) {
    await bot.sendMessage(
      chatId,
      "⏳ <b>KEY FREE NO DISPONIBLE</b>\n\n" +
        "Ya utilizaste tu key gratuita.\n\n" +
        "🕐 Podrás solicitar otra en:\n" +
        `<b>${formatRemainingTime(
          result.remaining
        )}</b>`,
      {
        parse_mode: "HTML",
      }
    );

    return;
  }

  // ==========================================================
  // ANUNCIOS
  // ==========================================================

  if (
    !result.success &&
    result.reason === "ads"
  ) {
    await sendAdRequired(
      bot,
      chatId
    );

    return;
  }

  if (!result.success) {
    await bot.sendMessage(
      chatId,
      "❌ No fue posible generar la key."
    );

    return;
  }

  const safeKey =
    escapeHtml(result.key);

  // ==========================================================
  // AUTO
  // ==========================================================

  if (mode === "auto") {
    const command =
      `export INSTALL_KEY="${safeKey}"; ` +
      `bash <(curl -fsSL ${INSTALL_URL})`;

    await bot.sendMessage(
      chatId,
      "🤖 <b>INSTALACIÓN AUTOMÁTICA</b>\n\n" +
        "Tu key fue generada correctamente.\n\n" +
        "📋 <b>Comando:</b>\n\n" +
        `<code>${escapeHtml(command)}</code>\n\n` +
        "📌 Copia y pega el comando completo en tu VPS.\n\n" +
        "⏳ <b>Duración:</b> 2 horas",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔄 Generar otra",
                callback_data:
                  "free_key_auto",
              },
            ],
          ],
        },
      }
    );

    return;
  }

  // ==========================================================
  // NORMAL
  // ==========================================================

  if (mode === "normal") {
    const command =
      `bash <(curl -fsSL ${INSTALL_URL})`;

    await bot.sendMessage(
      chatId,
      "📦 <b>INSTALACIÓN NORMAL</b>\n\n" +
        "🔑 <b>Tu Key:</b>\n" +
        `<code>${safeKey}</code>\n\n` +
        "📋 <b>Comando de instalación:</b>\n\n" +
        `<code>${escapeHtml(command)}</code>\n\n` +
        "📌 Ejecuta el comando y cuando el instalador solicite la key, introduce la mostrada arriba.\n\n" +
        "⏳ <b>Duración:</b> 2 horas",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔄 Generar otra",
                callback_data:
                  "free_key_normal",
              },
            ],
          ],
        },
      }
    );

    return;
  }

  // ==========================================================
  // ACTUALIZAR
  // ==========================================================

  if (mode === "update") {
    const command =
      `bash <(curl -fsSL ${UPDATE_URL})`;

    await bot.sendMessage(
      chatId,
      "🔄 <b>ACTUALIZACIÓN MULTI SCRIPT</b>\n\n" +
        "🔑 <b>Tu Key:</b>\n" +
        `<code>${safeKey}</code>\n\n` +
        "📋 <b>Comando de actualización:</b>\n\n" +
        `<code>${escapeHtml(command)}</code>\n\n` +
        "📌 Cuando el actualizador solicite la key, introduce la mostrada arriba.\n\n" +
        "⏳ <b>Duración:</b> 2 horas",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔄 Generar otra",
                callback_data:
                  "free_key_update",
              },
            ],
          ],
        },
      }
    );
  }
}

// ============================================================
// REVOCAR
// ============================================================

async function showRevokeMenu(
  bot,
  chatId
) {
  const keys =
    await getUserKeys(chatId);

  const now =
    Date.now();

  const activeKeys =
    keys.filter((item) => {
      return (
        item.active === true &&
        Number(item.expiresAt || 0) > now
      );
    });

  if (activeKeys.length === 0) {
    await bot.sendMessage(
      chatId,
      "🚫 <b>REVOCAR KEY</b>\n\n" +
        "No tienes ninguna key free activa para revocar.",
      {
        parse_mode: "HTML",
      }
    );

    return;
  }

  const buttons =
    activeKeys.map((item) => [
      {
        text: `🚫 ${item.key}`,
        callback_data:
          `free_revoke_${item.key}`,
      },
    ]);

  buttons.push([
    {
      text: "❌ Cancelar",
      callback_data:
        "free_key_cancel",
    },
  ]);

  await bot.sendMessage(
    chatId,
    "🚫 <b>REVOCAR KEY FREE</b>\n\n" +
      "Selecciona la key que deseas revocar:",
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: buttons,
      },
    }
  );
}

// ============================================================
// REGISTRO
// ============================================================

export default function registerFreeKey(bot) {

  // ==========================================================
  // /keyfree
  // ==========================================================

  bot.onText(
    /^\/keyfree(?:@\w+)?$/i,
    async (msg) => {

      const chatId =
        msg.chat.id;

      try {
        const user =
          await getUser(chatId);

        const isOwner =
          user.role === "owner" ||
          user.isOwner === true ||
          user.owner === true;

        const isAdmin =
          user.role === "admin" ||
          user.isAdmin === true ||
          user.admin === true;

        const isStaff =
          isOwner || isAdmin;

        // STAFF
        if (isStaff) {
          await bot.sendMessage(
            chatId,
            keyFreeMessage(),
            {
              parse_mode: "HTML",
              ...keyFreeMenu(),
            }
          );

          return;
        }

        // COOLDOWN
        const remaining =
          getRemainingTime(
            user.freeKeyAt
          );

        if (remaining > 0) {
          await bot.sendMessage(
            chatId,
            "⏳ <b>KEY FREE EN COOLDOWN</b>\n\n" +
              "Podrás solicitar otra key en:\n\n" +
              `<b>${formatRemainingTime(
                remaining
              )}</b>`,
            {
              parse_mode: "HTML",
            }
          );

          return;
        }

        // ANUNCIOS
        if (!user.adsKeyUnlocked) {
          await sendAdRequired(
            bot,
            chatId
          );

          return;
        }

        // MENÚ
        await bot.sendMessage(
          chatId,
          keyFreeMessage(),
          {
            parse_mode: "HTML",
            ...keyFreeMenu(),
          }
        );

      } catch (error) {

        console.error(
          "[KEYFREE]",
          error
        );

        await bot.sendMessage(
          chatId,
          "❌ Ocurrió un error al abrir el gestor de Key Free."
        );
      }
    }
  );

  // ==========================================================
  // CALLBACKS
  // ==========================================================

  bot.on(
    "callback_query",
    async (query) => {

      if (!query.data) return;

      const chatId =
        query.message?.chat?.id;

      if (!chatId) return;

      // AUTO
      if (
        query.data ===
        "free_key_auto"
      ) {

        await bot.answerCallbackQuery(
          query.id
        );

        await createKeyForMode({
          bot,
          chatId,
          mode: "auto",
        });

        return;
      }

      // NORMAL
      if (
        query.data ===
        "free_key_normal"
      ) {

        await bot.answerCallbackQuery(
          query.id
        );

        await createKeyForMode({
          bot,
          chatId,
          mode: "normal",
        });

        return;
      }

      // UPDATE
      if (
        query.data ===
        "free_key_update"
      ) {

        await bot.answerCallbackQuery(
          query.id
        );

        await createKeyForMode({
          bot,
          chatId,
          mode: "update",
        });

        return;
      }

      // REVOCAR MENÚ
      if (
        query.data ===
        "free_key_revoke_menu"
      ) {

        await bot.answerCallbackQuery(
          query.id
        );

        await showRevokeMenu(
          bot,
          chatId
        );

        return;
      }

      // CANCELAR
      if (
        query.data ===
        "free_key_cancel"
      ) {

        await bot.answerCallbackQuery(
          query.id
        );

        await bot.sendMessage(
          chatId,
          "↩️ Operación cancelada."
        );

        return;
      }

      // ======================================================
      // ANUNCIOS COMPLETADOS
      // ======================================================

      if (
        query.data ===
        "free_ads_completed"
      ) {

        await bot.answerCallbackQuery(
          query.id
        );

        try {

          await saveUser(
            chatId,
            {
              adsKeyUnlocked: true,
            }
          );

          await bot.sendMessage(
            chatId,
            "✅ <b>ANUNCIOS COMPLETADOS</b>\n\n" +
              "Tu Key Free ha sido desbloqueada.\n\n" +
              "Ahora puedes usar nuevamente:\n" +
              "🤖 Auto\n" +
              "📦 Normal\n" +
              "🔄 Actualizar",
            {
              parse_mode: "HTML",
              ...keyFreeMenu(),
            }
          );

        } catch (error) {

          console.error(
            "[KEYFREE ADS CALLBACK]",
            error
          );

          await bot.sendMessage(
            chatId,
            "❌ No se pudo activar la Key Free."
          );
        }

        return;
      }

      // ======================================================
      // REVOCAR KEY
      // ======================================================

      if (
        query.data.startsWith(
          "free_revoke_"
        )
      ) {

        await bot.answerCallbackQuery(
          query.id
        );

        const key =
          query.data.substring(
            "free_revoke_".length
          );

        if (!key) return;

        try {

          const keyRef =
            db.ref(`keys/${key}`);

          const snapshot =
            await keyRef.get();

          if (!snapshot.exists()) {

            await bot.sendMessage(
              chatId,
              "❌ La key ya no existe."
            );

            return;
          }

          const keyData =
            snapshot.val();

          if (
            String(keyData.chatId) !==
              String(chatId) ||
            keyData.type !== "free"
          ) {

            await bot.sendMessage(
              chatId,
              "❌ No puedes revocar esta key."
            );

            return;
          }

          await keyRef.update({
            active: false,
            revokedAt: Date.now(),
          });

          try {

            await db
              .ref("keyHistory")
              .push()
              .set({
                key,
                type: "free",
                chatId:
                  String(chatId),
                action: "revoked",
                revokedAt:
                  Date.now(),
              });

          } catch (error) {

            console.error(
              "[KEYFREE] Error historial revocación:",
              error
            );
          }

          await bot.sendMessage(
            chatId,
            "✅ <b>KEY REVOCADA</b>\n\n" +
              `🔑 Key:\n<code>${escapeHtml(
                key
              )}</code>\n\n` +
              "La key ya no podrá utilizarse.",
            {
              parse_mode: "HTML",
            }
          );

        } catch (error) {

          console.error(
            "[KEYFREE REVOKE]",
            error
          );

          await bot.sendMessage(
            chatId,
            "❌ No se pudo revocar la key."
          );
        }

        return;
      }
    }
  );

  // ==========================================================
  // /start adscompleted
  // ==========================================================

  bot.onText(
    /^\/start(?:@\w+)?\s+adscompleted$/i,
    async (msg) => {

      const chatId =
        msg.chat.id;

      try {

        // IMPORTANTE:
        // NO usamos {...user}.
        // Solo actualizamos el campo necesario.

        await saveUser(
          chatId,
          {
            adsKeyUnlocked: true,
          }
        );

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

        console.error(
          "[KEYFREE ADS]",
          error
        );

        await bot.sendMessage(
          chatId,
          "❌ No se pudo activar la Key Free."
        );
      }
    }
  );
}