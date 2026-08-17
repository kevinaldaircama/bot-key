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
    // OBTENER RESELLER AUTOMÁTICAMENTE
    // =========================================================

    function getReseller(msg) {

        const username =
            msg?.from?.username;

        const firstName =
            msg?.from?.first_name;

        const lastName =
            msg?.from?.last_name;

        if (username && username.trim() !== "") {

            return `@${username}`;

        }

        const fullName =
            `${firstName || ""} ${lastName || ""}`
                .trim();

        if (fullName !== "") {

            return fullName;

        }

        return String(msg?.from?.id || "");

    }


    // =========================================================
    // OBTENER USUARIO
    // =========================================================

    async function getUser(chatId) {

        const snap =
            await db
                .ref(`users/${chatId}`)
                .get();

        if (!snap.exists()) {

            return null;

        }

        return snap.val();

    }


    // =========================================================
    // VERIFICAR SI ES OWNER / ADMIN
    // =========================================================

    function isAdmin(user) {

        return (
            user?.role === "owner" ||
            user?.role === "admin"
        );

    }


    // =========================================================
    // GENERAR KEY
    // =========================================================

    async function generateKey(chatId, msg) {

        const snap =
            await db
                .ref(`users/${chatId}`)
                .get();


        if (!snap.exists()) {

            return {

                ok: false,

                message:
                    "❌ Usuario no registrado."

            };

        }


        const user =
            snap.val();


        // =====================================================
        // OWNER / ADMIN
        // =====================================================

        const adminAccess =
            isAdmin(user);


        // =====================================================
        // USUARIO NORMAL
        // =====================================================

        const adAccess =
            user.adsKeyUnlocked === true;


        // =====================================================
        // SI NO ES ADMIN Y NO COMPLETÓ ADS
        // =====================================================

        if (!adminAccess && !adAccess) {

            return {

                ok: false,

                noAccess: true

            };

        }


        // =====================================================
        // RESELLER AUTOMÁTICO
        // =====================================================

        const reseller =
            getReseller(msg);


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
        // ACTUALIZAR RESELLER AUTOMÁTICAMENTE
        // =====================================================

        await db
            .ref(`users/${chatId}`)
            .update({

                reseller

            });


        // =====================================================
        // SI ES USUARIO NORMAL
        // BLOQUEAR NUEVAMENTE LOS ADS
        // =====================================================

        if (!adminAccess) {

            await db
                .ref(`users/${chatId}`)
                .update({

                    adsKeyUnlocked:
                        false,

                    adsCompleted:
                        0,

                    lastKeyGenerated:
                        created

                });

        }


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
            await db
                .ref("keys")
                .get();


        let totalKeys =
            0;


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
        // NOMBRE DEL ROL
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

            totalKeys,

            adminAccess

        };

    }


    // =========================================================
    // MENSAJE PARA PEDIR ANUNCIOS
    // =========================================================

    async function sendAdRequired(chatId) {

        return bot.sendMessage(

            chatId,

`<b>🔐 ACCESO POR ANUNCIOS</b>

━━━━━━━━━━━━━━━━━━

No tienes acceso Premium.

Para generar una Key debes completar:

<b>🎬 5 anuncios</b>

━━━━━━━━━━━━━━━━━━

🎁 <b>RECOMPENSA</b>

Al completar los 5 anuncios podrás generar <b>1 Key</b>.

⚠️ Cada nueva Key requiere completar nuevamente los 5 anuncios.

━━━━━━━━━━━━━━━━━━

👇 Pulsa el botón para comenzar:`,

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

    async function showKey(chatId, msg) {

        try {

            const result =
                await generateKey(
                    chatId,
                    msg
                );


            // =================================================
            // NECESITA ADS
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
            // MENSAJE KEY
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
                String(
                    msg.chat.id
                );


            await showKey(
                chatId,
                msg
            );

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


                // =============================================
                // OBTENER USUARIO
                // =============================================

                const user =
                    await getUser(
                        chatId
                    );


                if (!user) {

                    return bot.answerCallbackQuery(

                        query.id,

                        {

                            text:
                                "❌ Usuario no registrado.",

                            show_alert:
                                true

                        }

                    );

                }


                // =============================================
                // SI ES NORMAL Y NO TIENE ADS
                // =============================================

                if (
                    !isAdmin(user) &&
                    user.adsKeyUnlocked !== true
                ) {

                    await bot.answerCallbackQuery(

                        query.id,

                        {

                            text:
                                "🎬 Debes completar los 5 anuncios primero.",

                            show_alert:
                                true

                        }

                    );


                    return sendAdRequired(
                        chatId
                    );

                }


                // =============================================
                // GENERAR
                // =============================================

                const result =
                    await generateKey(

                        chatId,

                        {

                            from:
                                query.from

                        }

                    );


                if (result.noAccess) {

                    return sendAdRequired(
                        chatId
                    );

                }


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
                String(
                    msg.chat.id
                );


            try {

                const data =
                    JSON.parse(
                        msg.web_app_data.data
                    );


                if (
                    data.action !==
                    "ads_completed"
                ) {

                    return;

                }


                // =============================================
                // VALIDAR CANTIDAD
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


                const user =
                    snap.val();


                // =============================================
                // OWNER / ADMIN
                // =============================================

                if (isAdmin(user)) {

                    return bot.sendMessage(

                        chatId,

                        "👑 Tu cuenta tiene acceso directo. No necesitas completar anuncios."

                    );

                }


                // =============================================
                // DESBLOQUEAR 1 KEY
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

`<b>🎉 ¡ANUNCIOS COMPLETADOS!</b>

━━━━━━━━━━━━━━━━━━

✅ Anuncios:

<b>5 / 5</b>

━━━━━━━━━━━━━━━━━━

🎁 <b>ACCESO DESBLOQUEADO</b>

Ya puedes generar <b>1 Key</b>.

⚠️ Después de generar la Key,
deberás completar nuevamente los 5 anuncios para obtener otra.`,

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
                // COMPROBAR PROPIETARIO
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
                // ELIMINAR KEY
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