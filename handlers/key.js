import db from "../firebase.js";
import { randomUUID } from "crypto";

export default function registerKey(bot) {

    // =========================================================
    // GENERAR KEY
    // =========================================================

    async function generateKey(chatId) {

        const snap = await db.ref(`users/${chatId}`).get();

        if (!snap.exists()) {
            return {
                ok: false,
                message: "❌ Usuario no registrado."
            };
        }

        const user = snap.val();

        // =====================================================
        // VERIFICAR APROBACIÓN
        // =====================================================

        if (!user.approved) {
            return {
                ok: false,
                message: "❌ No tienes acceso."
            };
        }

        // =====================================================
        // VERIFICAR ROL
        // =====================================================

        if (user.role !== "owner" && user.role !== "admin") {
            return {
                ok: false,
                message: "❌ No autorizado."
            };
        }

        // =====================================================
        // VERIFICAR RESELLER
        // =====================================================

        if (!user.reseller || user.reseller.trim() === "") {

            return {
                ok: false,
                resellerMissing: true,
                message: "❌ Debes configurar primero tu nombre de Reseller."
            };
        }

        // =====================================================
        // GENERAR KEY
        // =====================================================

        const key =
            "kevintechmulti-script-" +
            randomUUID()
                .replace(/-/g, "")
                .substring(0, 10)
                .toUpperCase();

        const created = Date.now();

        // 2 HORAS
        const deleteAt = created + (2 * 60 * 60 * 1000);

        // =====================================================
        // GUARDAR KEY
        // =====================================================

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

        // =====================================================
        // HISTORIAL
        // =====================================================

        await db.ref(`history/${chatId}`).push({

            type: "KEY_GENERADA",

            value: key,

            time: created

        });

        // =====================================================
        // CONTAR KEYS
        // =====================================================

        const keysSnapshot = await db.ref("keys").get();

        let totalKeys = 0;

        if (keysSnapshot.exists()) {

            keysSnapshot.forEach(item => {

                const data = item.val();

                if (
                    data.owner === chatId &&
                    data.deleteAt &&
                    data.deleteAt > Date.now()
                ) {
                    totalKeys++;
                }

            });

        }

        // =====================================================
        // NOMBRE DEL ROL
        // =====================================================

        const roleName =
            user.role === "owner"
                ? "👑 Dueño"
                : "🛡️ Admin";

        return {

            ok: true,

            key,

            user,

            roleName,

            totalKeys

        };

    }


    // =========================================================
    // MOSTRAR KEY
    // =========================================================

    async function sendGeneratedKey(chatId) {

        const result = await generateKey(chatId);

        // =====================================================
        // ERROR
        // =====================================================

        if (!result.ok) {

            if (result.resellerMissing) {

                return bot.sendMessage(

                    chatId,

`❌ <b>Debes configurar primero tu nombre de Reseller.</b>

Pulsa el botón:

👥 <b>Resellers</b>`,

                    {
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

                    }

                );

            }

            return bot.sendMessage(
                chatId,
                result.message,
                {
                    parse_mode: "HTML"
                }
            );

        }

        // =====================================================
        // MOSTRAR KEY
        // =====================================================

        return bot.sendMessage(

            chatId,

`<b>🔑 KEY GENERADA CORRECTAMENTE</b>

━━━━━━━━━━━━━━━━━━

${result.roleName}

👤 <b>Reseller</b>

${result.user.reseller}

━━━━━━━━━━━━━━━━━━

🔑 <b>Key</b>

<code>${result.key}</code>

━━━━━━━━━━━━━━━━━━

⏳ <b>Expira</b>

🗑️ Eliminación automática

La Key será eliminada después de 2 horas o al primer uso.

━━━━━━━━━━━━━━━━━━

📊 <b>Total de Keys activas</b>

${result.totalKeys}

━━━━━━━━━━━━━━━━━━

💻 <b>Instalador multi script</b>

<code>export INSTALL_KEY="${result.key}"; bash &lt;(curl -fsSL https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/install.sh)</code>

━━━━━━━━━━━━━━━━━━

⚡ <b>Instalador @sshprivanoxbot</b>

<code>export INSTALL_KEY="${result.key}"; bash &lt;(curl -fsSL https://raw.githubusercontent.com/kevinaldaircama/privanox-code/main/install_go.sh)</code>

━━━━━━━━━━━━━━━━━━

🐧 <b>Ubuntu recomendado</b>

✅ Compatible para todas las versiones LTS

━━━━━━━━━━━━━━━━━━

🔗 <b>Instalación con protocolos automáticos</b>

🌐 Antes de instalar <b>Kevin Tech Multi Script</b>, configura un subdominio que apunte a la IP de tu VPS mediante un registro <b>A</b>.

⚠️ Asegúrate de que el Proxy esté desactivado:

<b>DNS Only</b>`,

            {

                parse_mode: "HTML",

                reply_markup: {

                    inline_keyboard: [

                        [
                            {
                                text: "🗑 Revocar Key",
                                callback_data:
                                    `key_revoke_${result.key}`
                            }
                        ],

                        [
                            {
                                text: "🔄 Crear otra Key",
                                callback_data: "menu_key"
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

            }

        );

    }


    // =========================================================
    // COMANDO /KEY
    // =========================================================

    bot.onText(/^\/key(?:@\w+)?$/i, async (msg) => {

        const chatId = String(msg.chat.id);

        try {

            await sendGeneratedKey(chatId);

        } catch (error) {

            console.error("❌ ERROR /key:", error);

            await bot.sendMessage(
                chatId,
                "❌ Ocurrió un error al generar la Key."
            );

        }

    });


    // =========================================================
    // BOTÓN GENERAR KEY
    // =========================================================

    bot.on("callback_query", async (query) => {

        if (query.data !== "menu_key") return;

        const chatId = String(query.message.chat.id);

        try {

            await bot.answerCallbackQuery(query.id);

            // =================================================
            // GENERAR
            // =================================================

            const result = await generateKey(chatId);

            // =================================================
            // ERROR
            // =================================================

            if (!result.ok) {

                if (result.resellerMissing) {

                    return bot.editMessageText(

`❌ <b>Debes configurar primero tu nombre de Reseller.</b>

Pulsa el botón:

👥 <b>Resellers</b>`,

                        {

                            chat_id: chatId,

                            message_id:
                                query.message.message_id,

                            parse_mode: "HTML",

                            reply_markup: {

                                inline_keyboard: [

                                    [
                                        {
                                            text: "👥 Resellers",
                                            callback_data:
                                                "menu_reseller"
                                        }
                                    ],

                                    [
                                        {
                                            text: "🏠 Inicio",
                                            callback_data:
                                                "menu_home"
                                        }
                                    ]

                                ]

                            }

                        }

                    );

                }

                return bot.answerCallbackQuery(

                    query.id,

                    {

                        text: result.message,

                        show_alert: true

                    }

                );

            }

            // =================================================
            // MOSTRAR RESULTADO
            // =================================================

            await bot.editMessageText(

`<b>🔑 KEY GENERADA CORRECTAMENTE</b>

━━━━━━━━━━━━━━━━━━

${result.roleName}

👤 <b>Reseller</b>

${result.user.reseller}

━━━━━━━━━━━━━━━━━━

🔑 <b>Key</b>

<code>${result.key}</code>

━━━━━━━━━━━━━━━━━━

⏳ <b>Expira</b>

🗑️ Eliminación automática

La Key será eliminada después de 2 horas o al primer uso.

━━━━━━━━━━━━━━━━━━

📊 <b>Total de Keys activas</b>

${result.totalKeys}

━━━━━━━━━━━━━━━━━━

💻 <b>Instalador multi script</b>

<code>export INSTALL_KEY="${result.key}"; bash &lt;(curl -fsSL https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/install.sh)</code>

━━━━━━━━━━━━━━━━━━

⚡ <b>Instalador @sshprivanoxbot</b>

<code>export INSTALL_KEY="${result.key}"; bash &lt;(curl -fsSL https://raw.githubusercontent.com/kevinaldaircama/privanox-code/main/install_go.sh)</code>

━━━━━━━━━━━━━━━━━━

🐧 <b>Ubuntu recomendado</b>

✅ Compatible para todas las versiones LTS

━━━━━━━━━━━━━━━━━━

🔗 <b>Instalación con protocolos automáticos</b>

🌐 Configura un subdominio apuntando a la IP de tu VPS mediante un registro <b>A</b>.

⚠️ Proxy desactivado:

<b>DNS Only</b>`,

                {

                    chat_id: chatId,

                    message_id:
                        query.message.message_id,

                    parse_mode: "HTML",

                    reply_markup: {

                        inline_keyboard: [

                            [
                                {
                                    text: "🗑 Revocar Key",
                                    callback_data:
                                        `key_revoke_${result.key}`
                                }
                            ],

                            [
                                {
                                    text: "🔄 Crear otra Key",
                                    callback_data:
                                        "menu_key"
                                }
                            ],

                            [
                                {
                                    text: "📜 Historial",
                                    callback_data:
                                        "menu_history"
                                },

                                {
                                    text: "📈 Mi Uso",
                                    callback_data:
                                        "menu_usage"
                                }
                            ],

                            [
                                {
                                    text: "🏠 Inicio",
                                    callback_data:
                                        "menu_home"
                                }
                            ]

                        ]

                    }

                }

            );

        } catch (error) {

            console.error(
                "❌ ERROR menu_key:",
                error
            );

            await bot.answerCallbackQuery(

                query.id,

                {

                    text: "❌ Error al generar la Key.",

                    show_alert: true

                }

            );

        }

    });


    // =========================================================
    // REVOCAR KEY
    // =========================================================

    bot.on("callback_query", async (query) => {

        if (
            !query.data ||
            !query.data.startsWith("key_revoke_")
        ) {
            return;
        }

        const chatId =
            String(query.message.chat.id);

        const key =
            query.data.replace(
                "key_revoke_",
                ""
            );

        try {

            await bot.answerCallbackQuery(
                query.id
            );

            const ref =
                db.ref(`keys/${key}`);

            const snap =
                await ref.get();

            // =================================================
            // KEY NO EXISTE
            // =================================================

            if (!snap.exists()) {

                return bot.answerCallbackQuery(

                    query.id,

                    {
                        text:
                            "❌ La key ya fue eliminada.",
                        show_alert: true
                    }

                );

            }

            const data = snap.val();

            // =================================================
            // VERIFICAR PROPIETARIO
            // =================================================

            if (data.owner !== chatId) {

                return bot.answerCallbackQuery(

                    query.id,

                    {
                        text:
                            "❌ No puedes revocar esta key.",
                        show_alert: true
                    }

                );

            }

            // =================================================
            // ELIMINAR
            // =================================================

            await ref.remove();

            // =================================================
            // HISTORIAL
            // =================================================

            await db
                .ref(`history/${chatId}`)
                .push({

                    type:
                        "KEY_REVOCADA",

                    value:
                        key,

                    time:
                        Date.now()

                });

            // =================================================
            // CONFIRMACIÓN
            // =================================================

            await bot.editMessageText(

`🗑 <b>KEY REVOCADA</b>

━━━━━━━━━━━━━━━━━━

🔑 <code>${key}</code>

━━━━━━━━━━━━━━━━━━

✅ La key fue eliminada correctamente.`,

                {

                    chat_id:
                        chatId,

                    message_id:
                        query.message.message_id,

                    parse_mode:
                        "HTML",

                    reply_markup: {

                        inline_keyboard: [

                            [
                                {
                                    text:
                                        "🔄 Crear otra Key",

                                    callback_data:
                                        "menu_key"
                                }
                            ],

                            [
                                {
                                    text:
                                        "📜 Historial",

                                    callback_data:
                                        "menu_history"
                                },

                                {
                                    text:
                                        "📈 Mi Uso",

                                    callback_data:
                                        "menu_usage"
                                }
                            ],

                            [
                                {
                                    text:
                                        "🏠 Inicio",

                                    callback_data:
                                        "menu_home"
                                }
                            ]

                        ]

                    }

                }

            );

        } catch (error) {

            console.error(
                "❌ ERROR revocando key:",
                error
            );

            await bot.answerCallbackQuery(

                query.id,

                {

                    text:
                        "❌ Error al revocar la Key.",

                    show_alert:
                        true

                }

            );

        }

    });

}