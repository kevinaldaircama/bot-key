import crypto from "crypto";
import db from "../db.js";

// ======================================================
// CONFIGURACIÓN
// ======================================================

const WEBAPP_URL = "https://kevinaldaircama.github.io/bot-key";

const REQUIRED_ADS = 5;
const KEY_LIFETIME = 2 * 60 * 60 * 1000; // 2 horas
const FREE_KEY_COOLDOWN = 24 * 60 * 60 * 1000; // 24 horas

const INSTALL_URL =
  "https://raw.githubusercontent.com/kevinaldaircama/bot-key/main/install.sh";

const UPDATE_URL =
  "https://raw.githubusercontent.com/kevinaldaircama/bot-key/main/update.sh";

// ======================================================
// UTILIDADES
// ======================================================

function now() {
  return Date.now();
}

function formatTime(ms) {
  if (ms <= 0) return "0m";

  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatDate(timestamp) {
  if (!timestamp) return "N/A";

  return new Date(timestamp).toLocaleString("es-PE", {
    timeZone: "America/Lima",
  });
}

function generateRandomKey() {
  return crypto.randomBytes(16).toString("hex").toUpperCase();
}

// ======================================================
// TELEGRAM
// ======================================================

async function getTelegramName(bot, chatId) {
  try {
    const chat = await bot.getChat(chatId);

    if (chat.username) {
      return `@${chat.username}`;
    }

    if (chat.first_name || chat.last_name) {
      return [chat.first_name, chat.last_name]
        .filter(Boolean)
        .join(" ");
    }

    return String(chatId);
  } catch {
    return String(chatId);
  }
}

// ======================================================
// SQLITE / FIREBASE-COMPATIBLE DB
// ======================================================

async function getUser(chatId) {
  try {
    const snapshot = await db.ref(`users/${chatId}`).get();
    return snapshot.val() || {};
  } catch (error) {
    console.error("❌ Error getUser:", error);
    return {};
  }
}

async function saveUser(chatId, data) {
  try {
    await db.ref(`users/${chatId}`).update(data);
  } catch (error) {
    console.error("❌ Error saveUser:", error);
    throw error;
  }
}

async function getUserKeys(chatId) {
  try {
    const snapshot = await db.ref("keys").get();
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
    console.error("❌ Error getUserKeys:", error);
    return [];
  }
}

// ======================================================
// GENERAR KEY
// ======================================================

async function generateKey(bot, chatId, mode) {
  const key = generateRandomKey();

  const createdAt = now();
  const expiresAt = createdAt + KEY_LIFETIME;

  const telegramName = await getTelegramName(bot, chatId);

  const keyData = {
    chatId: String(chatId),
    telegramName,
    key,
    type: "free",
    mode,
    createdAt,
    expiresAt,
    active: true,
  };

  await db.ref(`keys/${key}`).set(keyData);

  await db.ref("keyHistory").push({
    ...keyData,
    action: "created",
    timestamp: createdAt,
  });

  return {
    key,
    createdAt,
    expiresAt,
    telegramName,
  };
}

// ======================================================
// CONTAR KEYS ACTIVAS
// ======================================================

async function getActiveFreeKeysCount() {
  try {
    const snapshot = await db.ref("keys").get();
    const data = snapshot.val() || {};

    const currentTime = now();

    return Object.values(data).filter((item) => {
      if (!item) return false;

      return (
        item.type === "free" &&
        item.active === true &&
        Number(item.expiresAt || 0) > currentTime
      );
    }).length;
  } catch (error) {
    console.error("❌ Error contando keys:", error);
    return 0;
  }
}

// ======================================================
// MENÚ PRINCIPAL
// ======================================================

async function showFreeKeyMenu(bot, chatId) {
  const user = await getUser(chatId);

  const isAdmin =
    user.isAdmin === true ||
    user.admin === true ||
    user.role === "admin" ||
    user.role === "owner";

  const keyboard = [];

  if (isAdmin) {
    keyboard.push([
      {
        text: "🔑 GENERAR KEY FREE",
        callback_data: "free_generate",
      },
    ]);
  } else {
    keyboard.push([
      {
        text: "📺 COMPLETAR ANUNCIOS",
        url: WEBAPP_URL,
      },
    ]);
  }

  keyboard.push([
    {
      text: "🔑 MIS KEYS",
      callback_data: "free_mykeys",
    },
  ]);

  keyboard.push([
    {
      text: "🔄 ACTUALIZAR",
      callback_data: "free_update",
    },
  ]);

  await bot.sendMessage(
    chatId,
    `🔐 *FREE KEY MANAGER*

Selecciona una opción:

📺 Los usuarios normales deben completar los anuncios.
🔑 Los administradores pueden generar directamente.

⏱️ Duración de la Key Free: *2 horas*
🕐 Cooldown: *24 horas*`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: keyboard,
      },
    }
  );
}

// ======================================================
// ANUNCIOS
// ======================================================

async function showAdsMessage(bot, chatId) {
  const user = await getUser(chatId);

  const adsCompleted = Number(user.adsCompleted || 0);

  if (user.adsKeyUnlocked === true) {
    return showGenerateMenu(bot, chatId);
  }

  await bot.sendMessage(
    chatId,
    `📺 *DESBLOQUEAR KEY FREE*

Debes completar *${REQUIRED_ADS} anuncios* para desbloquear tu Key Free.

📊 Progreso actual:
*${Math.min(adsCompleted, REQUIRED_ADS)} / ${REQUIRED_ADS}*

Cuando completes los anuncios, pulsa:

👉 *VOLVER AL BOT*`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📺 VER ANUNCIOS",
              url: WEBAPP_URL,
            },
          ],
          [
            {
              text: "🔄 COMPROBAR",
              callback_data: "free_check_ads",
            },
          ],
        ],
      },
    }
  );
}

// ======================================================
// MENÚ GENERAR
// ======================================================

async function showGenerateMenu(bot, chatId) {
  const user = await getUser(chatId);

  const isAdmin =
    user.isAdmin === true ||
    user.admin === true ||
    user.role === "admin" ||
    user.role === "owner";

  const buttons = [
    [
      {
        text: "⚡ GENERAR AUTO",
        callback_data: "free_generate_auto",
      },
    ],
    [
      {
        text: "🛠️ GENERAR NORMAL",
        callback_data: "free_generate_normal",
      },
    ],
    [
      {
        text: "🔄 GENERAR UPDATE",
        callback_data: "free_generate_update",
      },
    ],
    [
      {
        text: "🔑 MIS KEYS",
        callback_data: "free_mykeys",
      },
    ],
  ];

  if (isAdmin) {
    buttons.push([
      {
        text: "🗑️ REVOCAR KEY",
        callback_data: "free_revoke_menu",
      },
    ]);
  }

  await bot.sendMessage(
    chatId,
    `🔑 *KEY FREE DESBLOQUEADA*

Ya puedes generar tu Key Free.

⏱️ Duración: *2 horas*

Selecciona el tipo de generación:`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: buttons,
      },
    }
  );
}

// ======================================================
// CREAR KEY SEGÚN MODO
// ======================================================

async function createKeyForMode(bot, chatId, mode) {
  const user = await getUser(chatId);

  const isAdmin =
    user.isAdmin === true ||
    user.admin === true ||
    user.role === "admin" ||
    user.role === "owner";

  // --------------------------------------------------
  // COOLDOWN PARA USUARIOS NORMALES
  // --------------------------------------------------

  if (!isAdmin) {
    const lastFreeKey = Number(user.lastFreeKey || 0);
    const elapsed = now() - lastFreeKey;

    if (lastFreeKey && elapsed < FREE_KEY_COOLDOWN) {
      const remaining = FREE_KEY_COOLDOWN - elapsed;

      await bot.sendMessage(
        chatId,
        `⏳ *KEY FREE EN COOLDOWN*

Ya utilizaste tu Key Free recientemente.

🕐 Disponible nuevamente en:
*${formatTime(remaining)}*

📅 ${formatDate(lastFreeKey + FREE_KEY_COOLDOWN)}`,
        {
          parse_mode: "Markdown",
        }
      );

      return;
    }

    if (user.adsKeyUnlocked !== true) {
      await bot.sendMessage(
        chatId,
        `🔒 *KEY FREE BLOQUEADA*

Debes completar los *${REQUIRED_ADS} anuncios* antes de generar una Key Free.`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📺 COMPLETAR ANUNCIOS",
                  url: WEBAPP_URL,
                },
              ],
            ],
          },
        }
      );

      return;
    }
  }

  // --------------------------------------------------
  // GENERAR KEY
  // --------------------------------------------------

  try {
    const result = await generateKey(bot, chatId, mode);

    if (!isAdmin) {
      await saveUser(chatId, {
        lastFreeKey: result.createdAt,
        adsKeyUnlocked: false,
        adsCompleted: 0,
      });
    }

    await bot.sendMessage(
      chatId,
      `🎉 *KEY FREE GENERADA*

🔑 *Key:*
\`${result.key}\`

⚙️ Modo:
*${mode.toUpperCase()}*

⏱️ Duración:
*2 horas*

📅 Creada:
${formatDate(result.createdAt)}

📅 Expira:
${formatDate(result.expiresAt)}

👤 Usuario:
${result.telegramName}

━━━━━━━━━━━━━━━━━━

📥 *INSTALACIÓN*

\`\`\`
bash <(curl -fsSL ${INSTALL_URL})
\`\`\`

🔄 *ACTUALIZACIÓN*

\`\`\`
bash <(curl -fsSL ${UPDATE_URL})
\`\`\``,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔑 MIS KEYS",
                callback_data: "free_mykeys",
              },
            ],
            [
              {
                text: "🔄 ACTUALIZAR",
                callback_data: "free_update",
              },
            ],
          ],
        },
      }
    );
  } catch (error) {
    console.error("❌ Error generando Key Free:", error);

    await bot.sendMessage(
      chatId,
      "❌ No se pudo generar la Key Free. Intenta nuevamente."
    );
  }
}

// ======================================================
// MIS KEYS
// ======================================================

async function showMyKeys(bot, chatId) {
  const keys = await getUserKeys(chatId);

  const currentTime = now();

  const activeKeys = keys.filter((item) => {
    return (
      item.active === true &&
      Number(item.expiresAt || 0) > currentTime
    );
  });

  if (!activeKeys.length) {
    await bot.sendMessage(
      chatId,
      `🔑 *MIS KEYS*

No tienes ninguna Key Free activa.`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔑 GENERAR KEY",
                callback_data: "free_generate",
              },
            ],
          ],
        },
      }
    );

    return;
  }

  let text = `🔑 *MIS KEYS ACTIVAS*\n\n`;

  for (const item of activeKeys) {
    const remaining =
      Number(item.expiresAt) - currentTime;

    text +=
      `🔑 \`${item.key}\`\n` +
      `⚙️ Modo: *${String(item.mode || "auto").toUpperCase()}*\n` +
      `⏱️ Restante: *${formatTime(remaining)}*\n` +
      `📅 Expira: ${formatDate(item.expiresAt)}\n\n`;
  }

  await bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
  });
}

// ======================================================
// REVOCAR KEY
// ======================================================

async function showRevokeMenu(bot, chatId) {
  const user = await getUser(chatId);

  const isAdmin =
    user.isAdmin === true ||
    user.admin === true ||
    user.role === "admin" ||
    user.role === "owner";

  if (!isAdmin) {
    await bot.sendMessage(
      chatId,
      "❌ No tienes permisos para revocar Keys."
    );
    return;
  }

  const snapshot = await db.ref("keys").get();
  const data = snapshot.val() || {};

  const currentTime = now();

  const activeKeys = Object.entries(data)
    .filter(([key, item]) => {
      return (
        item &&
        item.type === "free" &&
        item.active === true &&
        Number(item.expiresAt || 0) > currentTime
      );
    })
    .slice(0, 20);

  if (!activeKeys.length) {
    await bot.sendMessage(
      chatId,
      "🗑️ No hay Keys Free activas para revocar."
    );
    return;
  }

  const buttons = activeKeys.map(([key, item]) => [
    {
      text: `🗑️ ${key.slice(0, 12)}...`,
      callback_data: `free_revoke:${key}`,
    },
  ]);

  await bot.sendMessage(
    chatId,
    `🗑️ *REVOCAR KEY FREE*

Selecciona la Key que deseas revocar:`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: buttons,
      },
    }
  );
}

async function revokeKey(bot, chatId, key) {
  const user = await getUser(chatId);

  const isAdmin =
    user.isAdmin === true ||
    user.admin === true ||
    user.role === "admin" ||
    user.role === "owner";

  if (!isAdmin) {
    await bot.sendMessage(
      chatId,
      "❌ No tienes permisos para esta acción."
    );
    return;
  }

  try {
    const keyRef = db.ref(`keys/${key}`);
    const snapshot = await keyRef.get();

    if (!snapshot.exists()) {
      await bot.sendMessage(
        chatId,
        "❌ La Key no existe."
      );
      return;
    }

    const keyData = snapshot.val() || {};

    await keyRef.update({
      active: false,
      revokedAt: now(),
      revokedBy: String(chatId),
    });

    await db.ref("keyHistory").push({
      ...keyData,
      action: "revoked",
      revokedAt: now(),
      revokedBy: String(chatId),
    });

    await bot.sendMessage(
      chatId,
      `✅ *KEY REVOCADA*

🔑 \`${key}\``,
      {
        parse_mode: "Markdown",
      }
    );
  } catch (error) {
    console.error("❌ Error revocando Key:", error);

    await bot.sendMessage(
      chatId,
      "❌ No se pudo revocar la Key."
    );
  }
}

// ======================================================
// REGISTRAR HANDLERS
// ======================================================

export default function registerFreeKey(bot) {
  // --------------------------------------------------
  // /keyfree
  // --------------------------------------------------

  bot.onText(/^\/keyfree(?:@\w+)?$/i, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const user = await getUser(chatId);

      const isAdmin =
        user.isAdmin === true ||
        user.admin === true ||
        user.role === "admin" ||
        user.role === "owner";

      if (isAdmin) {
        await saveUser(chatId, {
          adsKeyUnlocked: true,
        });

        await showGenerateMenu(bot, chatId);
        return;
      }

      const lastFreeKey = Number(user.lastFreeKey || 0);

      if (
        lastFreeKey &&
        now() - lastFreeKey < FREE_KEY_COOLDOWN
      ) {
        const remaining =
          FREE_KEY_COOLDOWN -
          (now() - lastFreeKey);

        await bot.sendMessage(
          chatId,
          `⏳ *KEY FREE EN COOLDOWN*

Disponible nuevamente en:

*${formatTime(remaining)}*

📅 ${formatDate(
            lastFreeKey + FREE_KEY_COOLDOWN
          )}`,
          {
            parse_mode: "Markdown",
          }
        );

        return;
      }

      if (user.adsKeyUnlocked === true) {
        await showGenerateMenu(bot, chatId);
      } else {
        await showAdsMessage(bot, chatId);
      }
    } catch (error) {
      console.error("❌ /keyfree:", error);

      await bot.sendMessage(
        chatId,
        "❌ Ocurrió un error al abrir Key Free."
      );
    }
  });

  // --------------------------------------------------
  // GENERAR
  // --------------------------------------------------

  bot.on("callback_query", async (query) => {
    const chatId = query.message?.chat?.id;
    const data = query.data;

    if (!chatId || !data) return;

    try {
      await bot.answerCallbackQuery(query.id);
    } catch {}

    if (data === "free_generate") {
      await showGenerateMenu(bot, chatId);
      return;
    }

    if (data === "free_generate_auto") {
      await createKeyForMode(bot, chatId, "auto");
      return;
    }

    if (data === "free_generate_normal") {
      await createKeyForMode(bot, chatId, "normal");
      return;
    }

    if (data === "free_generate_update") {
      await createKeyForMode(bot, chatId, "update");
      return;
    }

    if (data === "free_mykeys") {
      await showMyKeys(bot, chatId);
      return;
    }

    if (data === "free_revoke_menu") {
      await showRevokeMenu(bot, chatId);
      return;
    }

    if (data.startsWith("free_revoke:")) {
      const key = data.substring("free_revoke:".length);

      await revokeKey(bot, chatId, key);
      return;
    }

    if (data === "free_check_ads") {
      const user = await getUser(chatId);

      if (user.adsKeyUnlocked === true) {
        await bot.sendMessage(
          chatId,
          "✅ *ANUNCIOS COMPLETADOS*\n\nTu Key Free está desbloqueada.",
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🔑 GENERAR KEY",
                    callback_data: "free_generate",
                  },
                ],
              ],
            },
          }
        );
      } else {
        await showAdsMessage(bot, chatId);
      }

      return;
    }

    if (data === "free_update") {
      await bot.sendMessage(
        chatId,
        `🔄 *ACTUALIZACIÓN*

Ejecuta:

\`\`\`
bash <(curl -fsSL ${UPDATE_URL})
\`\`\``,
        {
          parse_mode: "Markdown",
        }
      );

      return;
    }
  });

  // --------------------------------------------------
  // /start adscompleted
  // --------------------------------------------------

  bot.onText(
    /^\/start(?:@\w+)?\s+adscompleted$/i,
    async (msg) => {
      const chatId = msg.chat.id;

      try {
        await saveUser(chatId, {
          adsKeyUnlocked: true,
          adsCompleted: REQUIRED_ADS,
        });

        await bot.sendMessage(
          chatId,
          `✅ *ANUNCIOS COMPLETADOS*

🔓 Tu Key Free está desbloqueada.

Ahora puedes generar tu Key.`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🔑 GENERAR KEY FREE",
                    callback_data: "free_generate",
                  },
                ],
              ],
            },
          }
        );
      } catch (error) {
        console.error(
          "❌ Error /start adscompleted:",
          error
        );

        await bot.sendMessage(
          chatId,
          "❌ No se pudo desbloquear tu Key Free."
        );
      }
    }
  );

  console.log("✅ Handler Key Free cargado con SQLite");
}