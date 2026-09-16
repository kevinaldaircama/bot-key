import crypto from "crypto";

// ============================================================
// CONFIGURACIÓN
// ============================================================

const WEBAPP_URL = "https://kevinaldaircama.github.io/bot-key";

const REQUIRED_ADS = 5;
const KEY_LIFETIME = 2 * 60 * 60 * 1000; // 2 horas
const FREE_KEY_COOLDOWN = 24 * 60 * 60 * 1000; // 24 horas

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
// SQLITE
// ============================================================

function initDatabase(db) {
  if (!db || typeof db.prepare !== "function") {
    throw new Error(
      "[KEYFREE] La conexión SQLite no fue proporcionada correctamente."
    );
  }

  // ----------------------------------------------------------
  // USUARIOS
  // ----------------------------------------------------------

  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      chat_id TEXT PRIMARY KEY,
      role TEXT DEFAULT 'user',
      is_owner INTEGER DEFAULT 0,
      is_admin INTEGER DEFAULT 0,
      owner INTEGER DEFAULT 0,
      admin INTEGER DEFAULT 0,
      ads_key_unlocked INTEGER DEFAULT 0,
      free_key_at INTEGER
    )
  `).run();

  // ----------------------------------------------------------
  // KEYS
  // ----------------------------------------------------------

  db.prepare(`
    CREATE TABLE IF NOT EXISTS keys (
      key TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      username TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      active INTEGER DEFAULT 1,
      revoked_at INTEGER
    )
  `).run();

  // ----------------------------------------------------------
  // HISTORIAL
  // ----------------------------------------------------------

  db.prepare(`
    CREATE TABLE IF NOT EXISTS key_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT,
      type TEXT,
      chat_id TEXT,
      username TEXT,
      action TEXT,
      created_at INTEGER,
      expires_at INTEGER,
      revoked_at INTEGER
    )
  `).run();
}

// ============================================================
// SQLITE USER HELPERS
// ============================================================

function ensureUser(db, chatId) {
  const existing = db
    .prepare(`
      SELECT *
      FROM users
      WHERE chat_id = ?
    `)
    .get(String(chatId));

  if (existing) {
    return existing;
  }

  db.prepare(`
    INSERT INTO users (
      chat_id,
      role,
      is_owner,
      is_admin,
      owner,
      admin,
      ads_key_unlocked,
      free_key_at
    )
    VALUES (?, 'user', 0, 0, 0, 0, 0, NULL)
  `).run(String(chatId));

  return db
    .prepare(`
      SELECT *
      FROM users
      WHERE chat_id = ?
    `)
    .get(String(chatId));
}

async function getUser(db, chatId) {
  try {
    const user = ensureUser(db, chatId);

    if (!user) {
      return {};
    }

    return {
      ...user,

      // Compatibilidad con el código original
      chatId: user.chat_id,
      role: user.role,

      isOwner:
        Number(user.is_owner || 0) === 1,

      isAdmin:
        Number(user.is_admin || 0) === 1,

      owner:
        Number(user.owner || 0) === 1,

      admin:
        Number(user.admin || 0) === 1,

      adsKeyUnlocked:
        Number(user.ads_key_unlocked || 0) === 1,

      freeKeyAt:
        user.free_key_at
          ? Number(user.free_key_at)
          : null,
    };
  } catch (error) {
    console.error(
      "[KEYFREE SQLITE GET USER]",
      error
    );

    return {};
  }
}

async function saveUser(db, chatId, data) {
  const current = ensureUser(db, chatId);

  const fields = [];
  const values = [];

  // ----------------------------------------------------------
  // ROLE
  // ----------------------------------------------------------

  if (Object.prototype.hasOwnProperty.call(data, "role")) {
    fields.push("role = ?");
    values.push(data.role);
  }

  // ----------------------------------------------------------
  // OWNER
  // ----------------------------------------------------------

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "isOwner"
    )
  ) {
    fields.push("is_owner = ?");
    values.push(data.isOwner ? 1 : 0);
  }

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "owner"
    )
  ) {
    fields.push("owner = ?");
    values.push(data.owner ? 1 : 0);
  }

  // ----------------------------------------------------------
  // ADMIN
  // ----------------------------------------------------------

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "isAdmin"
    )
  ) {
    fields.push("is_admin = ?");
    values.push(data.isAdmin ? 1 : 0);
  }

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "admin"
    )
  ) {
    fields.push("admin = ?");
    values.push(data.admin ? 1 : 0);
  }

  // ----------------------------------------------------------
  // ANUNCIOS
  // ----------------------------------------------------------

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "adsKeyUnlocked"
    )
  ) {
    fields.push("ads_key_unlocked = ?");
    values.push(
      data.adsKeyUnlocked ? 1 : 0
    );
  }

  // ----------------------------------------------------------
  // COOLDOWN
  // ----------------------------------------------------------

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "freeKeyAt"
    )
  ) {
    fields.push("free_key_at = ?");
    values.push(
      data.freeKeyAt
        ? Number(data.freeKeyAt)
        : null
    );
  }

  if (fields.length === 0) {
    return;
  }

  values.push(String(chatId));

  db.prepare(`
    UPDATE users
    SET ${fields.join(", ")}
    WHERE chat_id = ?
  `).run(...values);
}

// ============================================================
// SQLITE KEY HELPERS
// ============================================================

async function getUserKeys(db, chatId) {
  try {
    return db
      .prepare(`
        SELECT
          key,
          type,
          chat_id AS chatId,
          username,
          created_at AS createdAt,
          expires_at AS expiresAt,
          active,
          revoked_at AS revokedAt
        FROM keys
        WHERE chat_id = ?
          AND type = 'free'
      `)
      .all(String(chatId))
      .map((item) => ({
        ...item,
        active: Number(item.active) === 1,
      }));
  } catch (error) {
    console.error(
      "[KEYFREE SQLITE GET KEYS]",
      error
    );

    return [];
  }
}

// ============================================================
// GENERAR KEY
// ============================================================

async function generateKey(db, bot, chatId) {
  const user = await getUser(db, chatId);

  const isOwner =
    user.role === "owner" ||
    user.isOwner === true ||
    user.owner === true;

  const isAdmin =
    user.role === "admin" ||
    user.isAdmin === true ||
    user.admin === true;

  const isStaff = isOwner || isAdmin;

  // ----------------------------------------------------------
  // CONTROL DE COOLDOWN
  // ----------------------------------------------------------

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

    // --------------------------------------------------------
    // CONTROL DE ANUNCIOS
    // --------------------------------------------------------

    if (!user.adsKeyUnlocked) {
      return {
        success: false,
        reason: "ads",
      };
    }
  }

  // ----------------------------------------------------------
  // GENERAR KEY
  // ----------------------------------------------------------

  const key = generateRandomKey();

  const telegramName =
    await getTelegramName(bot, chatId);

  const now = Date.now();
  const expiresAt =
    now + KEY_LIFETIME;

  // ----------------------------------------------------------
  // GUARDAR KEY EN SQLITE
  // ----------------------------------------------------------

  db.prepare(`
    INSERT INTO keys (
      key,
      type,
      chat_id,
      username,
      created_at,
      expires_at,
      active,
      revoked_at
    )
    VALUES (?, 'free', ?, ?, ?, ?, 1, NULL)
  `).run(
    key,
    String(chatId),
    telegramName,
    now,
    expiresAt
  );

  // ----------------------------------------------------------
  // CONSUMIR ACCESO DE ANUNCIOS
  // ----------------------------------------------------------

  if (!isStaff) {
    await saveUser(db, chatId, {
      adsKeyUnlocked: false,
      freeKeyAt: now,
    });
  }

  // ----------------------------------------------------------
  // HISTORIAL
  // ----------------------------------------------------------

  try {
    db.prepare(`
      INSERT INTO key_history (
        key,
        type,
        chat_id,
        username,
        action,
        created_at,
        expires_at,
        revoked_at
      )
      VALUES (?, 'free', ?, ?, 'created', ?, ?, NULL)
    `).run(
      key,
      String(chatId),
      telegramName,
      now,
      expiresAt
    );
  } catch (error) {
    console.error(
      "[KEYFREE HISTORY CREATED]",
      error
    );
  }

  // ----------------------------------------------------------
  // CONTADOR
  // ----------------------------------------------------------

  let activeCount = 0;

  try {
    const row = db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM keys
        WHERE type = 'free'
          AND active = 1
          AND expires_at > ?
      `)
      .get(now);

    activeCount = Number(
      row?.count || 0
    );
  } catch {
    activeCount = 0;
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
// MENÚ KEYFREE
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
            callback_data:
              "free_key_revoke_menu",
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
// MOSTRAR ANUNCIOS
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
              callback_data:
                "free_ads_completed",
            },
          ],
        ],
      },
    }
  );
}

// ============================================================
// CREAR KEY SEGÚN MODO
// ============================================================

async function createKeyForMode({
  bot,
  db,
  chatId,
  mode,
}) {
  try {
    const result =
      await generateKey(
        db,
        bot,
        chatId
      );

    // --------------------------------------------------------
    // COOLDOWN
    // --------------------------------------------------------

    if (
      !result.success &&
      result.reason === "cooldown"
    ) {
      await bot.sendMessage(
        chatId,
        "⏳ <b>KEY FREE NO DISPONIBLE</b>\n\n" +
          "Ya utilizaste tu key gratuita.\n\n" +
          `🕐 Podrás solicitar otra en:\n<b>${formatRemainingTime(
            result.remaining
          )}</b>`,
        {
          parse_mode: "HTML",
        }
      );

      return;
    }

    // --------------------------------------------------------
    // ANUNCIOS
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // AUTO
    // --------------------------------------------------------

    if (mode === "auto") {
      const command =
        `export INSTALL_KEY="${safeKey}"; ` +
        `bash &lt;(curl -fsSL ${INSTALL_URL})`;

      await bot.sendMessage(
        chatId,
        "🤖 <b>INSTALACIÓN AUTOMÁTICA</b>\n\n" +
          "Tu key fue generada correctamente.\n\n" +
          "📋 <b>Comando:</b>\n\n" +
          `<code>${command}</code>\n\n` +
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

    // --------------------------------------------------------
    // NORMAL
    // --------------------------------------------------------

    if (mode === "normal") {
      const command =
        `bash &lt;(curl -fsSL ${INSTALL_URL})`;

      await bot.sendMessage(
        chatId,
        "📦 <b>INSTALACIÓN NORMAL</b>\n\n" +
          "🔑 <b>Tu Key:</b>\n" +
          `<code>${safeKey}</code>\n\n` +
          "📋 <b>Comando de instalación:</b>\n\n" +
          `<code>${command}</code>\n\n` +
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

    // --------------------------------------------------------
    // ACTUALIZAR
    // --------------------------------------------------------

    if (mode === "update") {
      const command =
        `bash &lt;(curl -fsSL ${UPDATE_URL})`;

      await bot.sendMessage(
        chatId,
        "🔄 <b>ACTUALIZACIÓN MULTI SCRIPT</b>\n\n" +
          "🔑 <b>Tu Key:</b>\n" +
          `<code>${safeKey}</code>\n\n` +
          "📋 <b>Comando de actualización:</b>\n\n" +
          `<code>${command}</code>\n\n` +
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

      return;
    }
  } catch (error) {
    console.error(
      "[KEYFREE CREATE]",
      error
    );

    await bot.sendMessage(
      chatId,
      "❌ Ocurrió un error al generar la Key Free."
    );
  }
}

// ============================================================
// MENÚ REVOCAR
// ============================================================

async function showRevokeMenu(
  bot,
  db,
  chatId
) {
  const keys =
    await getUserKeys(
      db,
      chatId
    );

  const now = Date.now();

  const activeKeys =
    keys.filter((item) => {
      return (
        item.active === true &&
        Number(item.expiresAt || 0) >
          now
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
    activeKeys.map((item) => {
      return [
        {
          text: `🚫 ${item.key}`,
          callback_data:
            `free_revoke_${item.key}`,
        },
      ];
    });

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
// REGISTRO DEL MÓDULO
// ============================================================

export default function registerFreeKey(
  bot,
  db
) {
  // ----------------------------------------------------------
  // INICIALIZAR SQLITE
  // ----------------------------------------------------------

  try {
    initDatabase(db);

    console.log(
      "🔑 Sistema Key Free SQLite iniciado."
    );
  } catch (error) {
    console.error(
      "[KEYFREE INIT]",
      error
    );
  }

  // ----------------------------------------------------------
  // /keyfree
  // ----------------------------------------------------------

  bot.onText(
    /^\/keyfree(?:@\w+)?$/i,
    async (msg) => {
      const chatId =
        msg.chat.id;

      try {
        const user =
          await getUser(
            db,
            chatId
          );

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

        // ----------------------------------------------------
        // STAFF
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // COOLDOWN
        // ----------------------------------------------------

        const remaining =
          getRemainingTime(
            user.freeKeyAt
          );

        if (remaining > 0) {
          await bot.sendMessage(
            chatId,
            "⏳ <b>KEY FREE EN COOLDOWN</b>\n\n" +
              `Podrás solicitar otra key en:\n\n` +
              `<b>${formatRemainingTime(
                remaining
              )}</b>`,
            {
              parse_mode: "HTML",
            }
          );

          return;
        }

        // ----------------------------------------------------
        // ANUNCIOS
        // ----------------------------------------------------

        if (!user.adsKeyUnlocked) {
          await sendAdRequired(
            bot,
            chatId
          );

          return;
        }

        // ----------------------------------------------------
        // MENÚ
        // ----------------------------------------------------

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

  // ----------------------------------------------------------
  // CALLBACKS
  // ----------------------------------------------------------

  bot.on(
    "callback_query",
    async (query) => {
      if (!query.data) return;

      const chatId =
        query.message?.chat?.id;

      if (!chatId) return;

      // ------------------------------------------------------
      // AUTO
      // ------------------------------------------------------

      if (
        query.data ===
        "free_key_auto"
      ) {
        await bot.answerCallbackQuery(
          query.id
        );

        await createKeyForMode({
          bot,
          db,
          chatId,
          mode: "auto",
        });

        return;
      }

      // ------------------------------------------------------
      // NORMAL
      // ------------------------------------------------------

      if (
        query.data ===
        "free_key_normal"
      ) {
        await bot.answerCallbackQuery(
          query.id
        );

        await createKeyForMode({
          bot,
          db,
          chatId,
          mode: "normal",
        });

        return;
      }

      // ------------------------------------------------------
      // UPDATE
      // ------------------------------------------------------

      if (
        query.data ===
        "free_key_update"
      ) {
        await bot.answerCallbackQuery(
          query.id
        );

        await createKeyForMode({
          bot,
          db,
          chatId,
          mode: "update",
        });

        return;
      }

      // ------------------------------------------------------
      // REVOCAR MENÚ
      // ------------------------------------------------------

      if (
        query.data ===
        "free_key_revoke_menu"
      ) {
        await bot.answerCallbackQuery(
          query.id
        );

        await showRevokeMenu(
          bot,
          db,
          chatId
        );

        return;
      }

      // ------------------------------------------------------
      // CANCELAR
      // ------------------------------------------------------

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

      // ------------------------------------------------------
      // ANUNCIOS COMPLETADOS
      // ------------------------------------------------------

      if (
        query.data ===
        "free_ads_completed"
      ) {
        await bot.answerCallbackQuery(
          query.id
        );

        try {
          await saveUser(
            db,
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
            "[KEYFREE ADS]",
            error
          );

          await bot.sendMessage(
            chatId,
            "❌ No se pudo desbloquear la Key Free."
          );
        }

        return;
      }

      // ------------------------------------------------------
      // REVOCAR KEY
      // ------------------------------------------------------

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
          const keyData =
            db.prepare(`
              SELECT *
              FROM keys
              WHERE key = ?
            `).get(key);

          if (!keyData) {
            await bot.sendMessage(
              chatId,
              "❌ La key ya no existe."
            );

            return;
          }

          // --------------------------------------------------
          // SEGURIDAD
          // --------------------------------------------------

          if (
            String(
              keyData.chat_id
            ) !== String(chatId) ||
            keyData.type !== "free"
          ) {
            await bot.sendMessage(
              chatId,
              "❌ No puedes revocar esta key."
            );

            return;
          }

          // --------------------------------------------------
          // REVOCAR
          // --------------------------------------------------

          const revokedAt =
            Date.now();

          db.prepare(`
            UPDATE keys
            SET
              active = 0,
              revoked_at = ?
            WHERE key = ?
          `).run(
            revokedAt,
            key
          );

          // --------------------------------------------------
          // HISTORIAL
          // --------------------------------------------------

          try {
            db.prepare(`
              INSERT INTO key_history (
                key,
                type,
                chat_id,
                username,
                action,
                revoked_at
              )
              VALUES (
                ?,
                'free',
                ?,
                ?,
                'revoked',
                ?
              )
            `).run(
              key,
              String(chatId),
              keyData.username || "",
              revokedAt
            );
          } catch (error) {
            console.error(
              "[KEYFREE HISTORY REVOKED]",
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

  // ----------------------------------------------------------
  // /start adscompleted
  // ----------------------------------------------------------

  bot.onText(
    /^\/start\s+adscompleted$/i,
    async (msg) => {
      const chatId =
        msg.chat.id;

      try {
        await saveUser(
          db,
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
