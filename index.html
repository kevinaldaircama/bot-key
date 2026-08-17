import db from "../firebase.js";
import { randomUUID } from "crypto";

export default function registerKey(bot) {

    // =========================================================
    // CONFIGURACIÓN
    // =========================================================

    const WEBAPP_URL =
        "https://kevinaldaircama.github.io/bot-key/";

    const BOT_USERNAME =
        "multiscriptkeygen_bot";

    const REQUIRED_ADS = 5;

    const KEY_LIFETIME =
        2 * 60 * 60 * 1000;


    // =========================================================
    // GENERAR KEY
    // =========================================================

    async function generateKey(chatId) {

        const userRef =
            db.ref(`users/${chatId}`);

        const snap =
            await userRef.get();

        if (!snap.exists()) {

            return {
                ok: false,
                message: "❌ Usuario no registrado."
            };

        }

        const user =
            snap.val();


        // =====================================================
        // ROL
        // =====================================================

        const isOwner =
            user.role === "owner";

        const isAdmin =
            user.role === "admin";


        // =====================================================
        // USUARIO NORMAL
        // =====================================================

        if (!isOwner && !isAdmin) {

            /*
             * Los usuarios normales solamente pueden
             * generar una Key después de completar
             * los 5 anuncios.
             */

            if (user.adsKeyUnlocked !== true) {

                return {
                    ok: false,
                    noAccess: true
                };

            }

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


        const created =
            Date.now();


        const deleteAt =
            created + KEY_LIFETIME;


        // =====================================================
        // NOMBRE DEL USUARIO
        // =====================================================

        const username =
            user.username ||
            user.telegramUsername ||
            user.firstName ||
            user.name ||
            `user_${chatId}`;


        // =====================================================
        // GUARDAR KEY
        // =====================================================

        await db
            .ref(`keys/${key}`)
            .set({

                key,

                owner: chatId,

                username,

                used: false,

                created,

                deleteAt,

                usedBy: "",

                usedAt: ""

            });


        // =====================================================
        // CONSUMIR ACCESO DE ANUNCIOS
        // =====================================================

        if (!isOwner && !isAdmin) {

            await userRef.update({

                adsKeyUnlocked: false,

                adsCompleted: 0,

                adsCompletedAt: null

            });

        }


        // =====================================================
        // HISTORIAL
        // =====================================================

        await db
            .ref(`history/${chatId}`)
            .push({

                type: "KEY_GENERADA",

                value: key,

                time: created

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
                    data.deleteAt > Date.now() &&
                    data.used !== true
                ) {

                    totalKeys++;

                }

            });

        }


        // =====================================================
        // ROL MOSTRADO
        // =====================================================

        const roleName =
            isOwner
                ? "👑 Dueño"
                : isAdmin
                    ? "🛡️ Admin"
                    : "🎁 Acceso por anuncios";


        return {

            ok: true,

            key,

            user,

            username,

            roleName,

            totalKeys

        };

    }


    // =========================================================
    // MOSTRAR WEBAPP
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

Después de completar los 5 anuncios podrás generar <b>1 Key</b>.

🔄 Para generar otra Key tendrás que completar nuevamente los 5 anuncios.

━━━━━━━━━━━━━━━━━━`,

            {

                parse_mode: "HTML",

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
            // NECESITA ANUNCIOS
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
                        parse_mode: "HTML"
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

👤 <b>Usuario</b>

${result.username}

━━━━━━━━━━━━━━━━━━

🔑 <b>Key</b>

<code>${result.key}</code>

━━━━━━━━━━━━━━━━━━

⏳ <b>Expira</b>

🗑️ La Key será eliminada automáticamente después de 2 horas o al primer uso.

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

                    parse_mode: "HTML",

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

                            ]

                        ]

                    }

                }

            );

        } catch (error) {

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
                // NECESITA ANUNCIOS
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

👤 <b>Usuario</b>

${result.username}

━━━━━━━━━━━━━━━━━━

🔑 <b>Key</b>

<code>${result.key}</code>

━━━━━━━━━━━━━━━━━━

⏳ <b>Expira</b>

🗑️ Eliminación automática después de 2 horas o al primer uso.

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

                                ]

                            ]

                        }

                    }

                );

            } catch (error) {

                console.error(
                    "MENU KEY ERROR:",
                    error
                );

            }

        }

    );


    // =========================================================
    // /START ADSCOMPLETED
    // =========================================================

    bot.onText(

        /^\/start(?:@\w+)?(?:\s+(.+))?$/i,

        async (msg, match) => {

            const chatId =
                String(msg.chat.id);


            const startParam =
                match && match[1]
                    ? match[1].trim()
                    : "";


            // Solo procesamos nuestro parámetro

            if (
                startParam !==
                "adscompleted"
            ) {

                return;

            }


            try {

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


                const user =
                    snap.val();


                // =============================================
                // OWNER / ADMIN
                // =============================================

                if (
                    user.role === "owner" ||
                    user.role === "admin"
                ) {

                    return bot.sendMessage(

                        chatId,

                        "👑 Tu cuenta tiene acceso administrativo. No necesitas completar anuncios."

                    );

                }


                // =============================================
                // DESBLOQUEAR UNA KEY
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
                    .ref(`history/${chatId}`)
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

`<b>🎉 ANUNCIOS COMPLETADOS</b>

━━━━━━━━━━━━━━━━━━

✅ Anuncios:

<b>5 / 5</b>

━━━━━━━━━━━━━━━━━━

🔑 Has desbloqueado <b>1 Key</b>.

⚠️ Después de generar esta Key, tendrás que volver a completar 5 anuncios para generar otra.`,

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

            } catch (error) {

                console.error(
                    "ADS START ERROR:",
                    error
                );

                await bot.sendMessage(

                    chatId,

                    "❌ Ocurrió un error al procesar los anuncios."

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

            } catch (error) {

                console.error(
                    "REVOKE ERROR:",
                    error
                );

            }

        }

    );

}