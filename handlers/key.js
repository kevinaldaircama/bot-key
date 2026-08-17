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
    // GENERAR KEY
    // =========================================================

    async function generateKey(chatId) {

        const snap =
            await db.ref(`users/${chatId}`).get();

        if (!snap.exists()) {

            return {
                ok: false,
                message: "❌ Usuario no registrado."
            };

        }

        const user = snap.val();


        // =====================================================
        // ACCESO
        // =====================================================

        const normalAccess =
            user.approved === true;

        const adAccess =
            user.adsKeyUnlocked === true;


        if (!normalAccess && !adAccess) {

            return {
                ok: false,
                noAccess: true
            };

        }


        // =====================================================
        // ROL
        // =====================================================

        if (
            user.role !== "owner" &&
            user.role !== "admin" &&
            !adAccess
        ) {

            return {
                ok: false,
                message: "❌ No autorizado."
            };

        }


        // =====================================================
        // RESELLER
        // =====================================================

        if (
            !user.reseller ||
            user.reseller.trim() === ""
        ) {

            return {
                ok: false,
                resellerMissing: true
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
                : user.role === "admin"
                    ? "🛡️ Admin"
                    : "🎁 Acceso por anuncios";


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

    async function showKey(chatId) {

        try {

            const result =
                await generateKey(chatId);


            // =================================================
            // SIN ACCESO
            // =================================================

            if (result.noAccess) {

                return sendAdRequired(chatId);

            }


            // =================================================
            // RESELLER FALTANTE
            // =================================================

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

👤 <b>Reseller</b>

${result.user.reseller}

━━━━━━━━━━━━━━━━━━

🔑 <b>Key</b>

<code>${result.key}</code>

━━━━━━━━━━━━━━━━━━

⏳ <b>Expira</b>

🗑️ Eliminación automática

La Key será eliminada después de 2 horas
o al primer uso.

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

🔗 <b>Instalación con protocolos automáticos</b>

🌐 Configura un subdominio apuntando a la IP de tu VPS mediante un registro <b>A</b>.

⚠️ Proxy:

<b>DNS Only</b>`,

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
    // MOSTRAR WEBAPP DE ANUNCIOS
    // =========================================================

    async function sendAdRequired(chatId) {

        return bot.sendMessage(

            chatId,

`<b>🔐 ACCESO POR ANUNCIOS</b>

━━━━━━━━━━━━━━━━━━

No tienes acceso Premium actualmente.

Para generar una Key gratuita debes completar:

<b>5 anuncios</b>

━━━━━━━━━━━━━━━━━━

🎁 <b>Recompensa</b>

Al completar los 5 anuncios podrás generar tu Key.

⚡ No necesitas ser Admin.

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
                                    url: WEBAPP_URL
                                }
                            }
                        ]

                    ]

                }

            }

        );

    }


    // =========================================================
    // /START
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


            // Solo procesar:
            // /start adscompleted

            if (
                startParam !==
                "adscompleted"
            ) {

                return;

            }


            try {

                // =============================================
                // VERIFICAR USUARIO
                // =============================================

                const userRef =
                    db.ref(`users/${chatId}`);

                const snap =
                    await userRef.get();


                if (!snap.exists()) {

                    return bot.sendMessage(

                        chatId,

                        "❌ Usuario no registrado."

                    );

                }


                // =============================================
                // DESBLOQUEAR
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

`<b>🎉 ¡ACCESO DESBLOQUEADO!</b>

━━━━━━━━━━━━━━━━━━

✅ Anuncios completados:

<b>5 / 5</b>

━━━━━━━━━━━━━━━━━━

🎁 <b>Recompensa</b>

Tu acceso gratuito ha sido desbloqueado.

Ahora puedes generar tu Key.

━━━━━━━━━━━━━━━━━━

🔑 Pulsa el botón:

<b>GENERAR KEY</b>`,

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
                    "ADS START ERROR:",
                    error
                );

                await bot.sendMessage(

                    chatId,

                    "❌ Ocurrió un error al desbloquear el acceso."

                );

            }

        }

    );


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
    // BOTÓN menu_key
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


            await bot.answerCallbackQuery(
                query.id
            );


            try {

                const result =
                    await generateKey(
                        chatId
                    );


                // =============================================
                // SIN ACCESO
                // =============================================

                if (result.noAccess) {

                    return sendAdRequired(
                        chatId
                    );

                }


                // =============================================
                // RESELLER
                // =============================================

                if (
                    result.resellerMissing
                ) {

                    return bot.editMessageText(

`❌ <b>Debes configurar primero tu nombre de Reseller.</b>

Pulsa:

👥 <b>Resellers</b>`,

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
                                                "👥 Resellers",

                                            callback_data:
                                                "menu_reseller"
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

${result.user.reseller}

━━━━━━━━━━━━━━━━━━

🔑 <b>Key</b>

<code>${result.key}</code>

━━━━━━━━━━━━━━━━━━

⏳ <b>Expira</b>

🗑️ Eliminación automática

La Key será eliminada después de 2 horas
o al primer uso.

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
                    "menu_key:",
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
                // VALIDAR 5 ANUNCIOS
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
                // GUARDAR DESBLOQUEO
                // =============================================

                await db
                    .ref(`users/${chatId}`)
                    .update({

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
                // AVISAR
                // =============================================

                await bot.sendMessage(

                    chatId,

`<b>🎉 ¡ACCESO DESBLOQUEADO!</b>

━━━━━━━━━━━━━━━━━━

✅ Anuncios completados:

<b>5 / 5</b>

━━━━━━━━━━━━━━━━━━

🎁 <b>Recompensa</b>

Tu acceso gratuito ha sido desbloqueado.

Ahora puedes generar tu Key.

━━━━━━━━━━━━━━━━━━

🔑 Pulsa el botón:

<b>GENERAR KEY</b>`,

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


                if (!snap.exists()) {

                    return bot.answerCallbackQuery(

                        query.id,

                        {

                            text:
                                "❌ La key ya fue eliminada.",

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
                                "❌ No puedes revocar esta key.",

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
                    "REVOKE ERROR:",
                    error
                );

            }

        }

    );

}