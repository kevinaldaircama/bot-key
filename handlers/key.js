import db from "../firebase.js";
import { randomUUID } from "crypto";

export default function registerKey(bot) {

    // =========================================================
    // CONFIGURACIÓN
    // =========================================================

    const WEBAPP_URL =
        "https://kevinaldaircama.github.io/bot-key/";

    const REQUIRED_ADS = 5;

    const KEY_LIFETIME =
        2 * 60 * 60 * 1000;


    // =========================================================
    // OBTENER NOMBRE DE TELEGRAM
    // =========================================================

    function getTelegramName(msg) {

        const user = msg.from || {};

        if (user.username) {
            return `@${user.username}`;
        }

        const fullName = [
            user.first_name,
            user.last_name
        ]
            .filter(Boolean)
            .join(" ")
            .trim();

        return fullName || "Usuario";
    }


    // =========================================================
    // OBTENER RESELLER
    // =========================================================

    async function getReseller(chatId) {

        const snap =
            await db.ref(`users/${chatId}`).get();

        if (!snap.exists()) {
            return "Usuario";
        }

        const user =
            snap.val();

        return (
            user.reseller ||
            user.username ||
            user.firstName ||
            "Usuario"
        );
    }


    // =========================================================
    // VERIFICAR USUARIO
    // =========================================================

    async function getUser(chatId) {

        const snap =
            await db.ref(`users/${chatId}`).get();

        if (!snap.exists()) {
            return null;
        }

        return snap.val();
    }


    // =========================================================
    // GENERAR KEY
    // =========================================================

    async function generateKey(chatId) {

        const user =
            await getUser(chatId);

        if (!user) {

            return {
                ok: false,
                message: "❌ Usuario no registrado."
            };

        }


        // =====================================================
        // ADS OBLIGATORIO
        // =====================================================

        if (user.adsKeyUnlocked !== true) {

            return {
                ok: false,
                noAccess: true
            };

        }


        // =====================================================
        // OBTENER RESELLER AUTOMÁTICAMENTE
        // =====================================================

        const reseller =
            await getReseller(chatId);


        // =====================================================
        // GENERAR KEY
        // =====================================================

        const key =
            "kevintechmulti-script-" +
            randomUUID()
                .replace(/-/g, "")
                .substring(0, 10)
                .toUpperCase();


        const created =
            Date.now();


        const deleteAt =
            created + KEY_LIFETIME;


        // =====================================================
        // GUARDAR KEY
        // =====================================================

        await db
            .ref(`keys/${key}`)
            .set({

                key,

                owner:
                    chatId,

                reseller,

                used:
                    false,

                created,

                deleteAt,

                usedBy:
                    "",

                usedAt:
                    ""

            });


        // =====================================================
        // HISTORIAL
        // =====================================================

        await db
            .ref(`history/${chatId}`)
            .push({

                type:
                    "KEY_GENERADA",

                value:
                    key,

                reseller,

                time:
                    created

            });


        // =====================================================
        // CONTAR KEYS ACTIVAS
        // =====================================================

        const keysSnapshot =
            await db.ref("keys").get();


        let totalKeys = 0;


        if (keysSnapshot.exists()) {

            keysSnapshot.forEach(item => {

                const data =
                    item.val();

                if (
                    data.owner === chatId &&
                    data.deleteAt > Date.now()
                ) {

                    totalKeys++;

                }

            });

        }


        // =====================================================
        // ROL
        // =====================================================

        const roleName =
            user.role === "owner"
                ? "👑 Dueño"
                : user.role === "admin"
                    ? "🛡️ Admin"
                    : "🎁 Acceso por anuncios";


        return {

            ok:
                true,

            key,

            user,

            reseller,

            roleName,

            totalKeys

        };

    }


    // =========================================================
    // MOSTRAR ADS
    // =========================================================

    async function sendAdRequired(chatId) {

        return bot.sendMessage(

            chatId,

`<b>🔐 ACCESO POR ANUNCIOS</b>

━━━━━━━━━━━━━━━━━━

Para generar una Key gratuita debes completar:

🎬 <b>5 anuncios</b>

━━━━━━━━━━━━━━━━━━

🎁 <b>Recompensa</b>

Al completar los 5 anuncios podrás generar tu Key.

━━━━━━━━━━━━━━━━━━

⚠️ Debes completar los 5 anuncios antes de continuar.`,

            {

                parse_mode:
                    "HTML",

                reply_markup: {

                    inline_keyboard: [

                        [

                            {

                                text:
                                    "🎬 VER 5 ANUNCIOS",

                                web_app: {

                                    url:
                                        WEBAPP_URL

                                }

                            }

                        ]

                    ]

                }

            }

        );

    }


    // =========================================================
    // MOSTRAR KEY
    // =========================================================

    async function showKey(chatId) {

        try {

            const result =
                await generateKey(chatId);


            // =================================================
            // ADS NO COMPLETADO
            // =================================================

            if (result.noAccess) {

                return sendAdRequired(
                    chatId
                );

            }


            // =================================================
            // ERROR
            // =================================================

            if (!result.ok) {

                return bot.sendMessage(

                    chatId,

                    result.message,

                    {
                        parse_mode:
                            "HTML"
                    }

                );

            }


            // =================================================
            // MOSTRAR KEY
            // =================================================

            return bot.sendMessage(

                chatId,

`<b>🔑 KEY GENERADA CORRECTAMENTE</b>

━━━━━━━━━━━━━━━━━━

${result.roleName}

👤 <b>Reseller</b>

${result.reseller}

━━━━━━━━━━━━━━━━━━

🔑 <b>Key</b>

<code>${result.key}</code>

━━━━━━━━━━━━━━━━━━

⏳ <b>Expira</b>

La Key será eliminada automáticamente después de:

<b>2 horas</b>

━━━━━━━━━━━━━━━━━━

📊 <b>Total de Keys activas</b>

${result.totalKeys}

━━━━━━━━━━━━━━━━━━

💻 <b>Instalador Multi Script</b>

<code>export INSTALL_KEY="${result.key}"; bash &lt;(curl -fsSL https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/install.sh)</code>

━━━━━━━━━━━━━━━━━━

⚡ <b>Instalador @sshprivanoxbot</b>

<code>export INSTALL_KEY="${result.key}"; bash &lt;(curl -fsSL https://raw.githubusercontent.com/kevinaldaircama/privanox-code/main/install_go.sh)</code>

━━━━━━━━━━━━━━━━━━

🐧 <b>Ubuntu recomendado</b>

✅ Compatible con versiones LTS

━━━━━━━━━━━━━━━━━━

🌐 <b>Configuración del dominio</b>

Configura un subdominio apuntando a la IP de tu VPS mediante un registro <b>A</b>.

⚠️ Proxy:

<b>DNS Only</b>`,

                {

                    parse_mode:
                        "HTML",

                    reply_markup: {

                        inline_keyboard: [

                            [

                                {

                                    text:
                                        "🗑 Revocar Key",

                                    callback_data:
                                        `key_revoke_${result.key}`

                                }

                            ],

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

                            ]

                        ]

                    }

                }

            );

        }

        catch (error) {

            console.error(
                "ERROR GENERANDO KEY:",
                error
            );

            return bot.sendMessage(

                chatId,

                "❌ Error interno al generar la Key."

            );

        }

    }


    // =========================================================
    // /KEY
    // =========================================================

    bot.onText(

        /^\/key(?:@\w+)?$/i,

        async (msg) => {

            const chatId =
                String(msg.chat.id);

            await showKey(chatId);

        }

    );


    // =========================================================
    // BOTÓN GENERAR KEY
    // =========================================================

    bot.on(

        "callback_query",

        async (query) => {

            if (
                query.data !==
                "menu_key"
            ) {
                return;
            }


            const chatId =
                String(
                    query.message.chat.id
                );


            try {

                await bot.answerCallbackQuery(
                    query.id
                );


                const result =
                    await generateKey(
                        chatId
                    );


                // =============================================
                // ADS
                // =============================================

                if (result.noAccess) {

                    return sendAdRequired(
                        chatId
                    );

                }


                // =============================================
                // ERROR
                // =============================================

                if (!result.ok) {

                    return bot.answerCallbackQuery(

                        query.id,

                        {

                            text:
                                result.message,

                            show_alert:
                                true

                        }

                    );

                }


                // =============================================
                // MOSTRAR KEY
                // =============================================

                await bot.editMessageText(

`<b>🔑 KEY GENERADA CORRECTAMENTE</b>

━━━━━━━━━━━━━━━━━━

${result.roleName}

👤 <b>Reseller</b>

${result.reseller}

━━━━━━━━━━━━━━━━━━

🔑 <b>Key</b>

<code>${result.key}</code>

━━━━━━━━━━━━━━━━━━

⏳ <b>Expira</b>

La Key será eliminada automáticamente después de:

<b>2 horas</b>

━━━━━━━━━━━━━━━━━━

📊 <b>Total de Keys activas</b>

${result.totalKeys}

━━━━━━━━━━━━━━━━━━

💻 <b>Instalador Multi Script</b>

<code>export INSTALL_KEY="${result.key}"; bash &lt;(curl -fsSL https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/install.sh)</code>

━━━━━━━━━━━━━━━━━━

⚡ <b>Instalador @sshprivanoxbot</b>

<code>export INSTALL_KEY="${result.key}"; bash &lt;(curl -fsSL https://raw.githubusercontent.com/kevinaldaircama/privanox-code/main/install_go.sh)</code>`,

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
                                            "🗑 Revocar Key",

                                        callback_data:
                                            `key_revoke_${result.key}`

                                    }

                                ],

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

                                ]

                            ]

                        }

                    }

                );

            }

            catch (error) {

                console.error(
                    "MENU KEY ERROR:",
                    error
                );

            }

        }

    );


    // =========================================================
    // RECIBIR RESULTADO DE WEBAPP
    // =========================================================

    bot.on(

        "message",

        async (msg) => {

            if (!msg.web_app_data) {
                return;
            }


            const chatId =
                String(msg.chat.id);


            try {

                const data =
                    JSON.parse(
                        msg.web_app_data.data
                    );


                // =============================================
                // VERIFICAR ACCIÓN
                // =============================================

                if (
                    data.action !==
                    "ads_completed"
                ) {
                    return;
                }


                // =============================================
                // VERIFICAR CANTIDAD
                // =============================================

                if (
                    Number(data.ads) !==
                    REQUIRED_ADS
                ) {

                    return bot.sendMessage(

                        chatId,

                        "❌ No se completaron los 5 anuncios."

                    );

                }


                // =============================================
                // VERIFICAR USUARIO
                // =============================================

                const userRef =
                    db.ref(
                        `users/${chatId}`
                    );


                const snap =
                    await userRef.get();


                if (!snap.exists()) {

                    return bot.sendMessage(

                        chatId,

                        "❌ Usuario no registrado."

                    );

                }


                // =============================================
                // GUARDAR DESBLOQUEO
                // =============================================

                await userRef.update({

                    adsCompleted:
                        REQUIRED_ADS,

                    adsKeyUnlocked:
                        true,

                    adsCompletedAt:
                        Date.now()

                });


                // =============================================
                // HISTORIAL
                // =============================================

                await db
                    .ref(
                        `history/${chatId}`
                    )
                    .push({

                        type:
                            "ADS_COMPLETADOS",

                        ads:
                            REQUIRED_ADS,

                        time:
                            Date.now()

                    });


                // =============================================
                // CONFIRMACIÓN
                // =============================================

                await bot.sendMessage(

                    chatId,

`<b>🎉 ¡ACCESO DESBLOQUEADO!</b>

━━━━━━━━━━━━━━━━━━

🎬 Anuncios completados:

<b>5 / 5</b>

━━━━━━━━━━━━━━━━━━

🎁 <b>Recompensa</b>

Tu acceso gratuito ha sido desbloqueado.

Ahora puedes generar tu Key.

━━━━━━━━━━━━━━━━━━

🔑 Pulsa el botón para continuar.`,

                    {

                        parse_mode:
                            "HTML",

                        reply_markup: {

                            inline_keyboard: [

                                [

                                    {

                                        text:
                                            "🔑 GENERAR KEY",

                                        callback_data:
                                            "menu_key"

                                    }

                                ]

                            ]

                        }

                    }

                );

            }

            catch (error) {

                console.error(
                    "WEBAPP DATA ERROR:",
                    error
                );

            }

        }

    );


    // =========================================================
    // REVOCAR KEY
    // =========================================================

    bot.on(

        "callback_query",

        async (query) => {

            if (
                !query.data ||
                !query.data.startsWith(
                    "key_revoke_"
                )
            ) {
                return;
            }


            const chatId =
                String(
                    query.message.chat.id
                );


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
                    db.ref(
                        `keys/${key}`
                    );


                const snap =
                    await ref.get();


                // =============================================
                // KEY NO EXISTE
                // =============================================

                if (!snap.exists()) {

                    return bot.answerCallbackQuery(

                        query.id,

                        {

                            text:
                                "❌ La Key ya fue eliminada.",

                            show_alert:
                                true

                        }

                    );

                }


                const data =
                    snap.val();


                // =============================================
                // VERIFICAR PROPIETARIO
                // =============================================

                if (
                    data.owner !==
                    chatId
                ) {

                    return bot.answerCallbackQuery(

                        query.id,

                        {

                            text:
                                "❌ No puedes revocar esta Key.",

                            show_alert:
                                true

                        }

                    );

                }


                // =============================================
                // ELIMINAR
                // =============================================

                await ref.remove();


                // =============================================
                // HISTORIAL
                // =============================================

                await db
                    .ref(
                        `history/${chatId}`
                    )
                    .push({

                        type:
                            "KEY_REVOCADA",

                        value:
                            key,

                        time:
                            Date.now()

                    });


                // =============================================
                // CONFIRMACIÓN
                // =============================================

                await bot.editMessageText(

`<b>🗑 KEY REVOCADA</b>

━━━━━━━━━━━━━━━━━━

🔑 <code>${key}</code>

━━━━━━━━━━━━━━━━━━

✅ La Key fue eliminada correctamente.`,

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

                                ]

                            ]

                        }

                    }

                );

            }

            catch (error) {

                console.error(
                    "REVOKE ERROR:",
                    error
                );

            }

        }

    );

}