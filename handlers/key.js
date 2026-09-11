import db from "../db.js";
import { randomUUID } from "crypto";

const INSTALL_URL =
    "https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/install.sh";

const UPDATE_URL =
    "https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/update.sh";


// ============================================================
// ESCAPAR TEXTO PARA TELEGRAM HTML
// ============================================================

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}


// ============================================================
// GENERAR KEY
// ============================================================

async function generateKey(chatId, user) {

    const key =
        "kevintechmulti-script-" +
        randomUUID()
            .replace(/-/g, "")
            .substring(0, 10)
            .toUpperCase();

    const created = Date.now();

    // Expira después de 2 horas
    const deleteAt = created + (2 * 60 * 60 * 1000);

    await db.ref(`keys/${key}`).set({

        key,
        owner: chatId,
        reseller: user.reseller,

        used: false,

        created,
        deleteAt,

        usedBy: "",
        usedAt: ""

    });

    return key;
}


// ============================================================
// OBTENER USUARIO AUTORIZADO
// ============================================================

async function getAuthorizedUser(chatId) {

    const snap = await db.ref(`users/${chatId}`).get();

    if (!snap.exists()) {
        return null;
    }

    const user = snap.val();

    if (!user.approved) {
        return {
            error: "No tienes acceso."
        };
    }

    if (user.role !== "owner" && user.role !== "admin") {
        return {
            error: "No autorizado."
        };
    }

    if (!user.reseller || user.reseller.trim() === "") {
        return {
            resellerMissing: true
        };
    }

    return {
        user
    };
}


// ============================================================
// OBTENER KEYS DEL USUARIO
// ============================================================

async function getUserKeys(chatId) {

    const snapshot = await db.ref("keys").get();

    const keys = [];

    if (snapshot.exists()) {

        snapshot.forEach(item => {

            const data = item.val();

            if (data.owner === chatId) {
                keys.push(data);
            }

        });

    }

    return keys;
}


// ============================================================
// MENÚ PRINCIPAL DE KEY
// ============================================================

export default function registerKey(bot) {


    // ========================================================
    // MENU KEY
    // NO GENERA KEY
    // ========================================================

    bot.on("callback_query", async (query) => {

        if (query.data !== "menu_key") return;

        try {

            await bot.answerCallbackQuery(query.id);

            const chatId = String(query.message.chat.id);

            const auth = await getAuthorizedUser(chatId);

            if (!auth) return;


            if (auth.error) {

                return bot.answerCallbackQuery(query.id, {
                    text: auth.error,
                    show_alert: true
                });

            }


            if (auth.resellerMissing) {

                return bot.editMessageText(

`❌ <b>Debes configurar primero tu nombre de Reseller.</b>

Pulsa el botón:

👥 <b>Resellers</b>`,

                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: "HTML",

                    reply_markup: {

                        inline_keyboard: [

                            [
                                {
                                    text: "👥 Resellers",
                                    callback_data: "menu_reseller"
                                }
                            ],

                            [
                                {
                                    text: "🏠 Inicio",
                                    callback_data: "menu_home"
                                }
                            ]

                        ]

                    }

                });

            }


            const roleName =
                auth.user.role === "owner"
                    ? "👑 Dueño"
                    : "🛡️ Admin";


            return bot.editMessageText(

`<b>🔑 GESTOR DE KEY</b>

━━━━━━━━━━━━━━━━━━

${roleName}

👤 <b>Reseller</b>

${escapeHtml(auth.user.reseller)}

━━━━━━━━━━━━━━━━━━

👇 <b>Selecciona una opción:</b>`,

            {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "HTML",

                reply_markup: {

                    inline_keyboard: [

                        [
                            {
                                text: "🤖 Auto",
                                callback_data: "key_auto"
                            },

                            {
                                text: "📦 Normal",
                                callback_data: "key_normal"
                            }
                        ],

                        [
                            {
                                text: "🔄 Actualizar",
                                callback_data: "key_update"
                            }
                        ],

                        [
                            {
                                text: "🚫 Revocar Key",
                                callback_data: "key_revoke_menu"
                            }
                        ],

                        [
                            {
                                text: "📜 Historial",
                                callback_data: "menu_history"
                            },

                            {
                                text: "📈 Mi Uso",
                                callback_data: "menu_usage"
                            }
                        ],

                        [
                            {
                                text: "🏠 Inicio",
                                callback_data: "menu_home"
                            }
                        ]

                    ]

                }

            });

        } catch (error) {

            console.error("❌ Error menu_key:", error);

        }

    });


    // ========================================================
    // 🤖 AUTO
    // ========================================================

    bot.on("callback_query", async (query) => {

        if (query.data !== "key_auto") return;

        try {

            await bot.answerCallbackQuery(query.id);

            const chatId = String(query.message.chat.id);

            const auth = await getAuthorizedUser(chatId);

            if (!auth || !auth.user) return;


            const key = await generateKey(chatId, auth.user);


            // IMPORTANTE:
            // Escapamos < para que Telegram HTML no lo interprete
            const command =
                `export INSTALL_KEY="${key}"; bash &lt;(curl -fsSL ${INSTALL_URL})`;


            return bot.editMessageText(

`<b>🤖 INSTALACIÓN AUTOMÁTICA</b>

━━━━━━━━━━━━━━━━━━

⚡ <b>Instalador automático</b>

La Key ya está incluida dentro del comando.

<code>${command}</code>

━━━━━━━━━━━━━━━━━━

🐧 <b>Ubuntu recomendado</b>

✅ Compatible con versiones LTS

━━━━━━━━━━━━━━━━━━

🌐 <b>Antes de instalar</b>

Configura un subdominio apuntando a la IP de tu VPS mediante un registro <b>A</b>.

⚠️ Cloudflare debe estar en <b>DNS Only</b>.

━━━━━━━━━━━━━━━━━━`,

            {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "HTML",

                reply_markup: {

                    inline_keyboard: [

                        [
                            {
                                text: "🔙 Volver",
                                callback_data: "menu_key"
                            }
                        ],

                        [
                            {
                                text: "🚫 Revocar Key",
                                callback_data: `key_revoke:${key}`
                            }
                        ],

                        [
                            {
                                text: "🏠 Inicio",
                                callback_data: "menu_home"
                            }
                        ]

                    ]

                }

            });

        } catch (error) {

            console.error("❌ Error key_auto:", error);

        }

    });


    // ========================================================
    // 📦 NORMAL
    // ========================================================

    bot.on("callback_query", async (query) => {

        if (query.data !== "key_normal") return;

        try {

            await bot.answerCallbackQuery(query.id);

            const chatId = String(query.message.chat.id);

            const auth = await getAuthorizedUser(chatId);

            if (!auth || !auth.user) return;


            const key = await generateKey(chatId, auth.user);


            const command =
                `bash &lt;(curl -fsSL ${INSTALL_URL})`;


            return bot.editMessageText(

`<b>📦 INSTALACIÓN NORMAL</b>

━━━━━━━━━━━━━━━━━━

🔑 <b>KEY</b>

<code>${key}</code>

━━━━━━━━━━━━━━━━━━

💻 <b>INSTALADOR</b>

<code>${command}</code>

━━━━━━━━━━━━━━━━━━

📌 Introduce la Key cuando el instalador la solicite.

━━━━━━━━━━━━━━━━━━`,

            {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "HTML",

                reply_markup: {

                    inline_keyboard: [

                        [
                            {
                                text: "🔙 Volver",
                                callback_data: "menu_key"
                            }
                        ],

                        [
                            {
                                text: "🚫 Revocar Key",
                                callback_data: `key_revoke:${key}`
                            }
                        ],

                        [
                            {
                                text: "🏠 Inicio",
                                callback_data: "menu_home"
                            }
                        ]

                    ]

                }

            });

        } catch (error) {

            console.error("❌ Error key_normal:", error);

        }

    });


    // ========================================================
    // 🔄 ACTUALIZAR
    // ========================================================

    bot.on("callback_query", async (query) => {

        if (query.data !== "key_update") return;

        try {

            await bot.answerCallbackQuery(query.id);

            const chatId = String(query.message.chat.id);

            const auth = await getAuthorizedUser(chatId);

            if (!auth || !auth.user) return;


            const key = await generateKey(chatId, auth.user);


            const command =
                `bash &lt;(curl -fsSL ${UPDATE_URL})`;


            return bot.editMessageText(

`<b>🔄 ACTUALIZAR MULTI SCRIPT</b>

━━━━━━━━━━━━━━━━━━

🔑 <b>KEY</b>

<code>${key}</code>

━━━━━━━━━━━━━━━━━━

⚡ <b>COMANDO DE ACTUALIZACIÓN</b>

<code>${command}</code>

━━━━━━━━━━━━━━━━━━

📌 Introduce la Key cuando el actualizador la solicite.

━━━━━━━━━━━━━━━━━━

⚠️ No cierres la conexión SSH durante la actualización.

━━━━━━━━━━━━━━━━━━`,

            {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "HTML",

                reply_markup: {

                    inline_keyboard: [

                        [
                            {
                                text: "🔙 Volver",
                                callback_data: "menu_key"
                            }
                        ],

                        [
                            {
                                text: "🚫 Revocar Key",
                                callback_data: `key_revoke:${key}`
                            }
                        ],

                        [
                            {
                                text: "🏠 Inicio",
                                callback_data: "menu_home"
                            }
                        ]

                    ]

                }

            });

        } catch (error) {

            console.error("❌ Error key_update:", error);

        }

    });


    // ========================================================
    // 🚫 MENÚ REVOCAR
    // ========================================================

    bot.on("callback_query", async (query) => {

        if (query.data !== "key_revoke_menu") return;

        try {

            await bot.answerCallbackQuery(query.id);

            const chatId = String(query.message.chat.id);

            const auth = await getAuthorizedUser(chatId);

            if (!auth || !auth.user) return;


            const keys = await getUserKeys(chatId);


            if (keys.length === 0) {

                return bot.editMessageText(

`<b>🚫 REVOCAR KEY</b>

━━━━━━━━━━━━━━━━━━

❌ No tienes Keys activas para revocar.

━━━━━━━━━━━━━━━━━━`,

                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: "HTML",

                    reply_markup: {

                        inline_keyboard: [

                            [
                                {
                                    text: "🔙 Volver",
                                    callback_data: "menu_key"
                                }
                            ],

                            [
                                {
                                    text: "🏠 Inicio",
                                    callback_data: "menu_home"
                                }
                            ]

                        ]

                    }

                });

            }


            const buttons = [];


            for (const item of keys) {

                buttons.push([

                    {
                        text: `🚫 ${item.key}`,
                        callback_data: `key_revoke:${item.key}`
                    }

                ]);

            }


            buttons.push([

                {
                    text: "🔙 Volver",
                    callback_data: "menu_key"
                }

            ]);


            buttons.push([

                {
                    text: "🏠 Inicio",
                    callback_data: "menu_home"
                }

            ]);


            return bot.editMessageText(

`<b>🚫 REVOCAR KEY</b>

━━━━━━━━━━━━━━━━━━

Selecciona la Key que deseas revocar.

📊 <b>Keys activas:</b> ${keys.length}

━━━━━━━━━━━━━━━━━━`,

            {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "HTML",

                reply_markup: {
                    inline_keyboard: buttons
                }

            });

        } catch (error) {

            console.error("❌ Error key_revoke_menu:", error);

        }

    });


    // ========================================================
    // 🚫 REVOCAR KEY
    // ========================================================

    bot.on("callback_query", async (query) => {

        if (!query.data.startsWith("key_revoke:")) return;

        try {

            await bot.answerCallbackQuery(query.id);

            const key = query.data
                .split(":")
                .slice(1)
                .join(":");

            const chatId = String(query.message.chat.id);

            const snap = await db.ref(`keys/${key}`).get();


            if (!snap.exists()) {

                return bot.answerCallbackQuery(query.id, {

                    text: "❌ Esta Key ya no existe.",
                    show_alert: true

                });

            }


            const data = snap.val();


            if (data.owner !== chatId) {

                return bot.answerCallbackQuery(query.id, {

                    text: "❌ Esta Key no te pertenece.",
                    show_alert: true

                });

            }


            await db.ref(`keys/${key}`).remove();


            return bot.editMessageText(

`<b>🚫 KEY REVOCADA</b>

━━━━━━━━━━━━━━━━━━

🔑 <code>${escapeHtml(key)}</code>

━━━━━━━━━━━━━━━━━━

✅ La Key fue revocada correctamente.

❌ Ya no podrá utilizarse.

━━━━━━━━━━━━━━━━━━`,

            {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "HTML",

                reply_markup: {

                    inline_keyboard: [

                        [
                            {
                                text: "🔑 Gestor de Key",
                                callback_data: "menu_key"
                            }
                        ],

                        [
                            {
                                text: "🏠 Inicio",
                                callback_data: "menu_home"
                            }
                        ]

                    ]

                }

            });

        } catch (error) {

            console.error("❌ Error key_revoke:", error);

        }

    });

}
