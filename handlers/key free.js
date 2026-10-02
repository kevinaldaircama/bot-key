import db from "../db.js";
import { randomUUID } from "crypto";

export default function registerFreeKey(bot) {

    // =========================================================
    // CONFIGURACIÓN
    // =========================================================

    const WEBAPP_URL =
        "https://kevinaldaircama.github.io/bot-key";

    const INSTALL_URL =
        "https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/install.sh";

    const UPDATE_URL =
        "https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/update.sh";

    const REQUIRED_ADS = 5;

    const KEY_LIFETIME =
        2 * 60 * 60 * 1000;


    // =========================================================
    // ESCAPAR HTML
    // =========================================================

    function escapeHtml(text) {

        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

    }


    // =========================================================
    // OBTENER NOMBRE
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
                message: "❌ Usuario no registrado."
            };

        }


        const user =
            snap.val();


        const isOwner =
            user.role === "owner";

        const isAdmin =
            user.role === "admin";

        const isStaff =
            isOwner ||
            isAdmin;


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
        // CONSUMIR DESBLOQUEO
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


        if (keysSnapshot.exists()) {

            keysSnapshot.forEach(
                item => {

                    const keyData =
                        item.val();

                    if (

                        keyData.owner ===
                            chatId &&

                        Number(
                            keyData.deleteAt || 0
                        ) >
                            Date.now() &&

                        keyData.used !== true

                    ) {

                        totalKeys++;

                    }

                }
            );

        }


        // =====================================================
        // PLAN
        // =====================================================

        const planName =
            isOwner
                ? "👑 OWNER"
                : isAdmin
                    ? "🛡️ ADMIN"
                    : "🎁 FREE";


        return {

            ok:
                true,

            key,

            user,

            username,

            reseller,

            planName,

            totalKeys

        };

    }


    // =========================================================
    // ANUNCIOS
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

🔑 <b>1 Key FREE</b>

━━━━━━━━━━━━━━━━━━

♻️ <b>SIN LÍMITE DE 24 HORAS</b>

Puedes volver a obtener otra Key cuando quieras.

Solo tendrás que completar nuevamente los
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
                await generateKey(chatId);


            if (result.noAccess) {

                return sendAdRequired(
                    chatId
                );

            }


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


            return bot.sendMessage(

                chatId,

`<b>🎉 ¡BIENVENIDO A KEVIN TECH!</b>

━━━━━━━━━━━━━━━━━━

👋 <b>Tu Key fue generada correctamente.</b>

🎁 <b>PLAN: ${result.planName}</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Usuario</b>

${escapeHtml(result.reseller)}

━━━━━━━━━━━━━━━━━━

🔑 <b>TU KEY</b>

<code>${escapeHtml(result.key)}</code>

━━━━━━━━━━━━━━━━━━

⏳ <b>DURACIÓN</b>

La Key estará disponible durante:

<b>2 HORAS</b>

🗑️ También será eliminada automáticamente
cuando sea utilizada.

━━━━━━━━━━━━━━━━━━

📊 <b>KEYS ACTIVAS</b>

${result.totalKeys}

━━━━━━━━━━━━━━━━━━

⚙️ <b>SELECCIONA TU INSTALADOR</b>

🤖 Auto
⚙️ Normal
🔄 Actualizar`,

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
                String(msg.chat.id);

            await showKey(chatId);

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


            if (
                startParam !==
                "adscompleted"
            ) {

                return;

            }


            try {

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


                const user =
                    snap.val();


                // =================================================
                // OWNER / ADMIN
                // =================================================

                if (

                    user.role === "owner" ||
                    user.role === "admin"

                ) {

                    return bot.sendMessage(

                        chatId,

                        "👑 Tu cuenta tiene acceso administrativo. No necesitas completar anuncios."

                    );

                }


                // =================================================
                // YA DESBLOQUEADO
                // =================================================

                if (
                    user.adsKeyUnlocked === true
                ) {

                    return bot.sendMessage(

                        chatId,

`<b>⚠️ YA TIENES UNA KEY DESBLOQUEADA</b>

━━━━━━━━━━━━━━━━━━

Ya completaste los anuncios.

🔑 Usa:

<code>/keyfree</code>

━━━━━━━━━━━━━━━━━━

No necesitas volver a ver los anuncios.`,

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
                    .ref(`history/${chatId}`)
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

━━━━━━━━━━━━━━━━━━

🎬 Anuncios:

<b>5 / 5</b>

━━━━━━━━━━━━━━━━━━

🔓 <b>KEY DESBLOQUEADA</b>

Ya puedes generar tu Key FREE.

━━━━━━━━━━━━━━━━━━

🔑 Usa:

<code>/keyfree</code>

━━━━━━━━━━━━━━━━━━

♻️ No existe límite de 24 horas.

Cuando quieras otra Key, vuelve a completar
los 5 anuncios.`,

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

            if (!query.data) {
                return;
            }


            const callbackData =
                query.data;


            // =================================================
            // AUTO
            // =================================================

            if (
                callbackData.startsWith(
                    "free_mode_auto_"
                )
            ) {

                const key =
                    callbackData.replace(
                        "free_mode_auto_",
                        ""
                    );


                const command =
                    `export INSTALL_KEY="${key}"; bash <(curl -fsSL ${INSTALL_URL})`;


                try {

                    await bot.answerCallbackQuery(
                        query.id
                    );


                    const safeKey =
                        escapeHtml(key);

                    const safeCommand =
                        escapeHtml(command);


                    return bot.sendMessage(

                        query.message.chat.id,

`<b>🤖 INSTALACIÓN AUTOMÁTICA</b>

━━━━━━━━━━━━━━━━━━

⚡ <b>Instalador automático</b>

La Key ya está incluida dentro del comando.

<code>${safeCommand}</code>

━━━━━━━━━━━━━━━━━━

🐧 <b>Ubuntu recomendado</b>

✅ Compatible con versiones LTS

━━━━━━━━━━━━━━━━━━

🌐 <b>Antes de instalar</b>

Configura un subdominio apuntando a la IP de tu VPS mediante un registro A.

⚠️ Cloudflare debe estar en DNS Only.

━━━━━━━━━━━━━━━━━━`,

                        {

                            parse_mode:
                                "HTML"

                        }

                    );

                } catch (error) {

                    console.error(
                        "AUTO BUTTON ERROR:",
                        error
                    );

                }

                return;

            }


            // =================================================
            // NORMAL
            // =================================================

            if (
                callbackData.startsWith(
                    "free_mode_normal_"
                )
            ) {

                const key =
                    callbackData.replace(
                        "free_mode_normal_",
                        ""
                    );


                const command =
                    `bash <(curl -fsSL ${INSTALL_URL})`;


                try {

                    await bot.answerCallbackQuery(
                        query.id
                    );


                    const safeKey =
                        escapeHtml(key);

                    const safeCommand =
                        escapeHtml(command);


                    return bot.sendMessage(

                        query.message.chat.id,

`<b>📦 INSTALACIÓN NORMAL</b>

━━━━━━━━━━━━━━━━━━

🔑 <b>KEY</b>

<code>${safeKey}</code>

━━━━━━━━━━━━━━━━━━

💻 <b>INSTALADOR</b>

<code>${safeCommand}</code>

━━━━━━━━━━━━━━━━━━

📌 Introduce la Key cuando el instalador la solicite.

━━━━━━━━━━━━━━━━━━`,

                        {

                            parse_mode:
                                "HTML"

                        }

                    );

                } catch (error) {

                    console.error(
                        "NORMAL BUTTON ERROR:",
                        error
                    );

                }

                return;

            }


            // =================================================
            // ACTUALIZAR
            // =================================================

            if (
                callbackData.startsWith(
                    "free_update_"
                )
            ) {

                const key =
                    callbackData.replace(
                        "free_update_",
                        ""
                    );


                const command =
                    `bash <(curl -fsSL ${UPDATE_URL})`;


                try {

                    await bot.answerCallbackQuery(
                        query.id
                    );


                    const safeKey =
                        escapeHtml(key);

                    const safeCommand =
                        escapeHtml(command);


                    return bot.sendMessage(

                        query.message.chat.id,

`<b>🔄 ACTUALIZAR MULTI SCRIPT</b>

━━━━━━━━━━━━━━━━━━

🔑 <b>KEY</b>

<code>${safeKey}</code>

━━━━━━━━━━━━━━━━━━

⚡ <b>COMANDO DE ACTUALIZACIÓN</b>

<code>${safeCommand}</code>

━━━━━━━━━━━━━━━━━━

📌 Introduce la Key cuando el actualizador la solicite.

━━━━━━━━━━━━━━━━━━

⚠️ No cierres la conexión SSH durante la actualización.

━━━━━━━━━━━━━━━━━━`,

                        {

                            parse_mode:
                                "HTML"

                        }

                    );

                } catch (error) {

                    console.error(
                        "UPDATE BUTTON ERROR:",
                        error
                    );

                }

                return;

            }


            // =================================================
            // REVOCAR KEY
            // =================================================

            if (
                !callbackData.startsWith(
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
                callbackData.replace(
                    "key_revoke_",
                    ""
                );


            try {

                const ref =
                    db.ref(`keys/${key}`);

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


                const keyData =
                    snap.val();


                // =================================================
                // VERIFICAR PROPIETARIO
                // =================================================

                if (
                    String(keyData.owner) !==
                    String(chatId)
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
                // ELIMINAR KEY
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

                await bot.answerCallbackQuery(

                    query.id,

                    {

                        text:
                            "🗑 Key revocada correctamente.",

                        show_alert:
                            false

                    }

                );


                await bot.editMessageText(

`<b>🗑 KEY REVOCADA</b>

━━━━━━━━━━━━━━━━━━

🔑 <code>${escapeHtml(key)}</code>

━━━━━━━━━━━━━━━━━━

✅ La Key fue eliminada correctamente.

━━━━━━━━━━━━━━━━━━

♻️ Puedes obtener otra Key cuando quieras.

Solo debes volver a completar los
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
