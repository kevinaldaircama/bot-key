import db from "../firebase.js";
import { randomUUID } from "crypto";

export default function registerKey(bot) {

    // ==============================
    // GENERAR KEY
    // ==============================

    bot.on("callback_query", async (query) => {

        if (query.data !== "menu_key") return;

        await bot.answerCallbackQuery(query.id);

        const chatId = String(query.message.chat.id);

        const snap = await db.ref(`users/${chatId}`).get();

        if (!snap.exists()) return;

        const user = snap.val();

        if (!user.approved) {
            return bot.answerCallbackQuery(query.id, {
                text: "No tienes acceso.",
                show_alert: true
            });
        }

        if (user.role !== "owner" && user.role !== "admin") {
            return bot.answerCallbackQuery(query.id, {
                text: "No autorizado.",
                show_alert: true
            });
        }

        if (!user.reseller || user.reseller.trim() === "") {

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

        // ==============================
        // GENERAR KEY
        // ==============================

        const key =
            "kevintechmulti-script-" +
            randomUUID()
                .replace(/-/g, "")
                .substring(0, 10)
                .toUpperCase();

        const created = Date.now();

        const deleteAt = created + (2 * 60 * 60 * 1000);

        // ==============================
        // GUARDAR KEY
        // ==============================

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

        // ==============================
        // GUARDAR HISTORIAL
        // ==============================

        await db.ref(`history/${chatId}`).push({

            type: "KEY_GENERADA",

            value: key,

            time: Date.now()

        });

        // ==============================
        // CONTAR KEYS
        // ==============================

        const keysSnapshot = await db.ref("keys").get();

        let totalKeys = 0;

        if (keysSnapshot.exists()) {

            keysSnapshot.forEach(item => {

                if (item.val().owner === chatId) {

                    totalKeys++;

                }

            });

        }

        const roleName =
            user.role === "owner"
                ? "👑 Dueño"
                : "🛡️ Admin";

        // ==============================
        // MOSTRAR KEY
        // ==============================

        await bot.editMessageText(

`<b>🔑 KEY GENERADA CORRECTAMENTE</b>

━━━━━━━━━━━━━━━━━━

${roleName}

👤 <b>Reseller</b>

${user.reseller}

━━━━━━━━━━━━━━━━━━

🔑 <b>Key</b>

<code>${key}</code>

━━━━━━━━━━━━━━━━━━

⏳ <b>Expira</b>

🗑️ Eliminación automática

La Key será eliminada después de 2 horas o al primer uso.

━━━━━━━━━━━━━━━━━━

📊 <b>Total de Keys</b>

${totalKeys}

━━━━━━━━━━━━━━━━━━

💻 <b>Instalador multi script (consola)</b>

<code>export INSTALL_KEY="${key}"; bash &lt;(curl -fsSL https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/install.sh)</code>

━━━━━━━━━━━━━━━━━━

⚡ <b>Instalador @sshprivanoxbot (bot telegram)</b>

<code>export INSTALL_KEY="${key}"; bash &lt;(curl -fsSL https://raw.githubusercontent.com/kevinaldaircama/privanox-code/main/install_go.sh)</code>

━━━━━━━━━━━━━━━━━━

🐧 <b>Ubuntu recomendado</b>

✅ Compatible para todas las versiones LTS

━━━━━━━━━━━━━━━━━━

🔗 <b>Script con instalación con protocolos automáticos</b>

🌐 Antes de instalar la script (Kevin tech multi script), configura un subdominio que apunte a la IP de tu VPS mediante un registro <b>A</b> y asegúrate de que el <b>Proxy esté desactivado (DNS Only)</b>.`,

        {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "HTML",

            reply_markup: {

                inline_keyboard: [

                    [
                        {
                            text: "🗑 Revocar Key",
                            callback_data: `key_revoke_${key}`
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

    });


    // ==============================
    // REVOCAR KEY
    // ==============================

    bot.on("callback_query", async (query) => {

        if (!query.data.startsWith("key_revoke_")) return;

        await bot.answerCallbackQuery(query.id);

        const chatId = String(query.message.chat.id);

        const key = query.data.replace("key_revoke_", "");

        const ref = db.ref(`keys/${key}`);

        const snap = await ref.get();

        // ==============================
        // VERIFICAR SI EXISTE
        // ==============================

        if (!snap.exists()) {

            return bot.answerCallbackQuery(query.id, {

                text: "❌ La key ya fue eliminada."

            });

        }

        const data = snap.val();

        // ==============================
        // VERIFICAR PROPIETARIO
        // ==============================

        if (data.owner !== chatId) {

            return bot.answerCallbackQuery(query.id, {

                text: "❌ No puedes revocar esta key.",

                show_alert: true

            });

        }

        // ==============================
        // ELIMINAR KEY
        // ==============================

        await ref.remove();

        // ==============================
        // GUARDAR HISTORIAL
        // ==============================

        await db.ref(`history/${chatId}`).push({

            type: "KEY_REVOCADA",

            value: key,

            time: Date.now()

        });

        // ==============================
        // CONFIRMACIÓN
        // ==============================

        await bot.editMessageText(

`🗑 <b>KEY REVOCADA</b>

━━━━━━━━━━━━━━━━━━

🔑 <code>${key}</code>

✅ La key fue eliminada correctamente.

━━━━━━━━━━━━━━━━━━`,

        {

            chat_id: chatId,

            message_id: query.message.message_id,

            parse_mode: "HTML",

            reply_markup: {

                inline_keyboard: [

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

        });

    });

}
