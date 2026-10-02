import db from "../db.js";
import { randomUUID } from "crypto";

export default function registerFreeKey(bot) {

    // =========================================================
    // CONFIGURACIÓN
    // =========================================================

    const WEBAPP_URL =
        "https://kevinaldaircama.github.io/bot-key";

    const REQUIRED_ADS = 5;

    // Duración de la Key: 2 horas
    const KEY_LIFETIME =
        2 * 60 * 60 * 1000;


    // =========================================================
    // URLS DE INSTALADORES
    // =========================================================

    const INSTALL_URL =
        "https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/install.sh";

    const UPDATE_URL =
        "https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/update.sh";


    // =========================================================
    // OBTENER NOMBRE / USUARIO TELEGRAM
    // =========================================================

    function getTelegramName(user, chatId) {

        return (
            user.username ||
            user.telegramUsername ||
            user.firstName ||
            user.name ||
            `user_${chatId}`
        );

    }


    // =========================================================
    // GENERAR KEY FREE
    // =========================================================

    async function generateKey(chatId) {

        const userRef =
            db.ref(`users/${chatId}`);

        const snap =
            await userRef.get();

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
        // ROLES
        // =====================================================

        const isOwner =
            user.role === "owner";

        const isAdmin =
            user.role === "admin";

        const isStaff =
            isOwner ||
            isAdmin;


        // =====================================================
        // USUARIO / RESELLER
        // =====================================================

        const reseller =
            getTelegramName(
                user,
                chatId
            );

        const username =
            reseller;


        // =====================================================
        // VERIFICAR ANUNCIOS
        // =====================================================

        if (!isStaff) {

            if (
                user.adsKeyUnlocked !== true
            ) {

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
            created +
            KEY_LIFETIME;


        // =====================================================
        // GUARDAR KEY
        // =====================================================

        await db
            .ref(`keys/${key}`)
            .set({

                key,

                owner:
                    chatId,

                username:
                    username,

                reseller:
                    reseller,

                type:
                    "free",

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
        // CONSUMIR ACCESO DE ANUNCIOS
        //
        // NO EXISTE COOLDOWN DE 24 HORAS
        // =====================================================

        if (!isStaff) {

            await userRef.update({

                adsKeyUnlocked:
                    false,

                adsCompleted:
                    0,

                adsCompletedAt:
                    null

            });

        }


        // =====================================================
        // HISTORIAL
        // =====================================================

        await db
            .ref(`history/${chatId}`)
            .push({

                type:
                    "KEY_GENERADA_FREE",

                value:
                    key,

                reseller:
                    reseller,

                time:
                    created

            });


        // =====================================================
        // CONTAR KEYS ACTIVAS
        // =====================================================

        const keysSnapshot =
            await db.ref("keys").get();

        let totalKeys =
            0;


        if (
            keysSnapshot.exists()
        ) {

            keysSnapshot.forEach(
                item => {

                    const data =
                        item.val();

                    if (

                        data.owner ===
                            chatId &&

                        Number(
                            data.deleteAt || 0
                        ) >
                            Date.now() &&

                        data.used !== true

                    ) {

                        totalKeys++;

                    }

                }
            );

        }


        // =====================================================
        // RESULTADO
        // =====================================================

        return {

            ok:
                true,

            key,

            user,

            username,

            reseller,

            totalKeys

        };

    }


    // =========================================================
    // MOSTRAR ANUNCIOS
    // =========================================================

    async function sendAdRequired(chatId) {

        return bot.sendMessage(

            chatId,

`<b>🔐 OBTENER KEY FREE</b>

━━━━━━━━━━━━━━━━━━

🎁 <b>PLAN FREE</b>

Para obtener una nueva Key debes completar:

🎬 <b>5 anuncios</b>

━━━━━━━━━━━━━━━━━━

🎁 <b>RECOMPENSA</b>

Al completar los 5 anuncios podrás generar:

🔑 <b>1 KEY FREE</b>

━━━━━━━━━━━━━━━━━━

♻️ <b>SIN LÍMITE DE 24 HORAS</b>

Puedes obtener otra Key cuando quieras.

Solo debes completar nuevamente los
<b>5 anuncios</b>.`,

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
                await generateKey(
                    chatId
                );


            // =================================================
            // NECESITA ANUNCIOS
            // =================================================

            if (
                result.noAccess
            ) {

                return sendAdRequired(
                    chatId
                );

            }


            // =================================================
            // ERROR
            // =================================================

            if (
                !result.ok
            ) {

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
            // MENSAJE PRINCIPAL
            // =================================================

            return bot.sendMessage(

                chatId,

`<b>🎉 ¡BIENVENIDO A KEVIN TECH!</b>

━━━━━━━━━━━━━━━━━━

👋 <b>Tu Key fue generada correctamente.</b>

🎁 <b>PLAN: FREE</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Usuario</b>

${result.reseller}

━━━━━━━━━━━━━━━━━━

🔑 <b>TU KEY</b>

<code>${result.key}</code>

━━━━━━━━━━━━━━━━━━

⏳ <b>DURACIÓN</b>

<b>2 HORAS</b>

🗑️ La Key será eliminada automáticamente
al utilizarse o cuando expire.

━━━━━━━━━━━━━━━━━━

📊 <b>KEYS ACTIVAS</b>

${result.totalKeys}

━━━━━━━━━━━━━━━━━━

♻️ <b>NUEVA KEY</b>

No existe límite de 24 horas.

Cuando quieras otra Key,
vuelve a completar los <b>5 anuncios</b>.

━━━━━━━━━━━━━━━━━━

⚙️ <b>SELECCIONA UNA OPCIÓN</b>

🤖 Auto — instalador automático
⚙️ Normal — instalador normal
🔄 Actualizar — actualizar instalación`,

                {

                    parse_mode:
                        "HTML",

                    reply_markup: {

                        inline_keyboard: [

                            [

                                {

                                    text:
                                        "🤖 Auto",

                                    callback_data:
                                        `free_mode_auto_${result.key}`

                                },

                                {

                                    text:
                                        "⚙️ Normal",

                                    callback_data:
                                        `free_mode_normal_${result.key}`

                                }

                            ],

                            [

                                {

                                    text:
                                        "🔄 Actualizar",

                                    callback_data:
                                        `free_update_${result.key}`

                                }

                            ],

                            [

                                {

                                    text:
                                        "🗑 Revocar Key",

                                    callback_data:
                                        `key_revoke_${result.key}`

                                }

                            ]

                        ]

                    }

                }

            );

        } catch (error) {

            console.error(
                "ERROR GENERANDO KEY FREE:",
                error
            );

            return bot.sendMessage(

                chatId,

                "❌ Error interno al generar la Key."

            );

        }

    }


    // =========================================================
    // /KEYFREE
    // =========================================================

    bot.onText(

        /^\/keyfree(?:@\w+)?$/i,

        async msg => {

            const chatId =
                String(
                    msg.chat.id
                );

            await showKey(
                chatId
            );

        }

    );


    // =========================================================
    // /START ADSCOMPLETED
    // =========================================================

    bot.onText(

        /^\/start(?:@\w+)?(?:\s+(.+))?$/i,

        async (
            msg,
            match
        ) => {

            const chatId =
                String(
                    msg.chat.id
                );


            const startParam =
                match &&
                match[1]
                    ? match[1].trim()
                    : "";


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


                if (
                    !snap.exists()
                ) {

                    return bot.sendMessage(

                        chatId,

                        "❌ Usuario no registrado."

                    );

                }


                const user =
                    snap.val();


                // =================================================
                // CUENTAS STAFF
                // =================================================

                if (

                    user.role ===
                        "owner" ||

                    user.role ===
                        "admin"

                ) {

                    return bot.sendMessage(

                        chatId,

                        "👑 Tu cuenta tiene acceso administrativo. No necesitas completar anuncios."

                    );

                }


                // =================================================
                // EVITAR DOBLE DESBLOQUEO
                // =================================================

                if (
                    user.adsKeyUnlocked ===
                    true
                ) {

                    return bot.sendMessage(

                        chatId,

`<b>⚠️ YA TIENES UNA KEY DESBLOQUEADA</b>

━━━━━━━━━━━━━━━━━━

Ya completaste los anuncios.

🔑 Usa:

<code>/keyfree</code>`,

                        {
                            parse_mode:
                                "HTML"
                        }

                    );

                }


                // =================================================
                // DESBLOQUEAR
                // =================================================

                const completedAt =
                    Date.now();


                await userRef.update({

                    adsCompleted:
                        REQUIRED_ADS,

                    adsKeyUnlocked:
                        true,

                    adsCompletedAt:
                        completedAt

                });


                // =================================================
                // HISTORIAL
                // =================================================

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
                            completedAt

                    });


                // =================================================
                // CONFIRMACIÓN
                // =================================================

                await bot.sendMessage(

                    chatId,

`<b>🎉 ¡ANUNCIOS COMPLETADOS!</b>

━━━━━━━━━━━━━━━━━━

🎁 <b>PLAN FREE</b>

🎬 Anuncios:

<b>5 / 5</b>

━━━━━━━━━━━━━━━━━━

🔓 <b>KEY DESBLOQUEADA</b>

Ya puedes generar tu Key.

━━━━━━━━━━━━━━━━━━

🔑 Usa:

<code>/keyfree</code>

━━━━━━━━━━━━━━━━━━

♻️ Puedes volver a obtener otra Key cuando quieras.

Solo debes completar nuevamente los
<b>5 anuncios</b>.`,

                    {
                        parse_mode:
                            "HTML"
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
    // BOTONES
    // =========================================================

    bot.on(

        "callback_query",

        async query => {

            if (
                !query.data
            ) {

                return;

            }


            const data =
                query.data;


            const chatId =
                String(
                    query.message.chat.id
                );


            // =====================================================
            // AUTO
            // =====================================================

            if (
                data.startsWith(
                    "free_mode_auto_"
                )
            ) {

                const key =
                    data.replace(
                        "free_mode_auto_",
                        ""
                    );


                const command =
                    `export INSTALL_KEY="${key}"; bash <(curl -fsSL ${INSTALL_URL})`;


                await bot.answerCallbackQuery(

                    query.id,

                    {
                        text:
                            "🤖 Instalador Auto generado.",
                        show_alert:
                            false
                    }

                );


                return bot.sendMessage(

                    chatId,

`<b>🤖 INSTALADOR AUTO</b>

━━━━━━━━━━━━━━━━━━

🔑 Key:

<code>${key}</code>

━━━━━━━━━━━━━━━━━━

📥 <b>COMANDO</b>

<code>${command}</code>

━━━━━━━━━━━━━━━━━━

✅ La Key ya está incluida automáticamente.`,

                    {
                        parse_mode:
                            "HTML"
                    }

                );

            }


            // =====================================================
            // NORMAL
            // =====================================================

            if (
                data.startsWith(
                    "free_mode_normal_"
                )
            ) {

                const key =
                    data.replace(
                        "free_mode_normal_",
                        ""
                    );


                const command =
                    `export INSTALL_KEY="${key}"; bash <(curl -fsSL ${INSTALL_URL})`;


                await bot.answerCallbackQuery(

                    query.id,

                    {
                        text:
                            "⚙️ Instalador Normal generado.",
                        show_alert:
                            false
                    }

                );


                return bot.sendMessage(

                    chatId,

`<b>⚙️ INSTALADOR NORMAL</b>

━━━━━━━━━━━━━━━━━━

🔑 <b>Key</b>

<code>${key}</code>

━━━━━━━━━━━━━━━━━━

📥 <b>INSTALADOR</b>

<code>${command}</code>

━━━━━━━━━━━━━━━━━━

✅ Tu Key ya está incluida.`,

                    {
                        parse_mode:
                            "HTML"
                    }

                );

            }


            // =====================================================
            // ACTUALIZAR
            // =====================================================

            if (
                data.startsWith(
                    "free_update_"
                )
            ) {

                const key =
                    data.replace(
                        "free_update_",
                        ""
                    );


                const command =
                    `export INSTALL_KEY="${key}"; bash <(curl -fsSL ${UPDATE_URL})`;


                await bot.answerCallbackQuery(

                    query.id,

                    {
                        text:
                            "🔄 Actualizador generado.",
                        show_alert:
                            false
                    }

                );


                return bot.sendMessage(

                    chatId,

`<b>🔄 ACTUALIZAR</b>

━━━━━━━━━━━━━━━━━━

🔑 <b>Key</b>

<code>${key}</code>

━━━━━━━━━━━━━━━━━━

📥 <b>COMANDO DE ACTUALIZACIÓN</b>

<code>${command}</code>

━━━━━━━━━━━━━━━━━━

✅ Tu Key ya está incluida automáticamente.`,

                    {
                        parse_mode:
                            "HTML"
                    }

                );

            }


            // =====================================================
            // REVOCAR
            // =====================================================

            if (
                !data.startsWith(
                    "key_revoke_"
                )
            ) {

                return;

            }


            const key =
                data.replace(
                    "key_revoke_",
                    ""
                );


            try {

                const ref =
                    db.ref(
                        `keys/${key}`
                    );


                const snap =
                    await ref.get();


                if (
                    !snap.exists()
                ) {

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


                const keyData =
                    snap.val();


                // =================================================
                // PROPIETARIO
                // =================================================

                if (
                    keyData.owner !==
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


                // =================================================
                // ELIMINAR
                // =================================================

                await ref.remove();


                // =================================================
                // HISTORIAL
                // =================================================

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


                await bot.answerCallbackQuery(

                    query.id,

                    {

                        text:
                            "🗑 Key revocada correctamente.",

                        show_alert:
                            false

                    }

                );


                // =================================================
                // MENSAJE FINAL
                // =================================================

                return bot.editMessageText(

`<b>🗑 KEY REVOCADA</b>

━━━━━━━━━━━━━━━━━━

🔑 <code>${key}</code>

━━━━━━━━━━━━━━━━━━

✅ La Key fue eliminada correctamente.

━━━━━━━━━━━━━━━━━━

♻️ Puedes obtener otra cuando quieras.

Completa nuevamente los
<b>5 anuncios</b>.`,

                    {

                        chat_id:
                            chatId,

                        message_id:
                            query.message.message_id,

                        parse_mode:
                            "HTML"

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
