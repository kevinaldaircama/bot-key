import db from "../firebase.js";
import { randomUUID } from "crypto";

export default function registerFreeKey(bot) {

    // =========================================================
    // CONFIGURACIÓN
    // =========================================================

    const WEBAPP_URL =
        "https://kevinaldaircama.github.io/bot-key";

    // Cantidad de anuncios necesarios
    const REQUIRED_ADS = 5;

    // Duración de la Key
    // 2 horas
    const KEY_LIFETIME =
        2 * 60 * 60 * 1000;

    // Límite FREE
    // 1 Key cada 24 horas
    const FREE_KEY_COOLDOWN =
        24 * 60 * 60 * 1000;


    // =========================================================
    // CALCULAR TIEMPO RESTANTE
    // =========================================================

    function getRemainingTime(targetTime) {

        const remaining =
            Math.max(
                0,
                targetTime - Date.now()
            );


        const hours =
            Math.floor(
                remaining /
                (60 * 60 * 1000)
            );


        const minutes =
            Math.floor(
                (remaining %
                    (60 * 60 * 1000)) /
                (60 * 1000)
            );


        return {
            remaining,
            hours,
            minutes
        };

    }


    // =========================================================
    // GENERAR KEY FREE
    // =========================================================

    async function generateKey(chatId) {

        const userRef =
            db.ref(
                `users/${chatId}`
            );


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
        // CONTROL 24 HORAS
        // =====================================================

        if (!isStaff) {

            const freeKeyAt =
                Number(
                    user.freeKeyAt || 0
                );


            if (freeKeyAt > 0) {

                const nextFreeKeyAt =
                    freeKeyAt +
                    FREE_KEY_COOLDOWN;


                if (
                    Date.now() <
                    nextFreeKeyAt
                ) {

                    const time =
                        getRemainingTime(
                            nextFreeKeyAt
                        );


                    return {

                        ok: false,

                        cooldown: true,

                        message:

`<b>⏳ KEY FREE EN COOLDOWN</b>

━━━━━━━━━━━━━━━━━━

🔐 Ya generaste tu Key FREE de hoy.

📌 <b>Límite:</b>

1 Key FREE cada 24 horas

━━━━━━━━━━━━━━━━━━

⏱️ <b>Tiempo restante:</b>

<b>${time.hours}h ${time.minutes}min</b>

━━━━━━━━━━━━━━━━━━

🔄 Cuando termine el tiempo podrás volver a completar los 5 anuncios.`

                    };

                }

            }

        }


        // =====================================================
        // VERIFICAR ACCESO POR ANUNCIOS
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

                owner:
                    chatId,

                username,

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
        // Y ACTIVAR COOLDOWN DE 24 HORAS
        // =====================================================

        if (!isStaff) {

            await userRef.update({

                adsKeyUnlocked:
                    false,

                adsCompleted:
                    0,

                adsCompletedAt:
                    null,

                // Momento exacto de generación
                freeKeyAt:
                    created

            });

        }


        // =====================================================
        // HISTORIAL
        // =====================================================

        await db
            .ref(
                `history/${chatId}`
            )
            .push({

                type:
                    "KEY_GENERADA_FREE",

                value:
                    key,

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
        // ROL MOSTRADO
        // =====================================================

        const roleName =
            isOwner
                ? "👑 Dueño"
                : isAdmin
                    ? "🛡️ Admin"
                    : "🎁 Key FREE";


        // =====================================================
        // RESULTADO
        // =====================================================

        return {

            ok:
                true,

            key,

            user,

            username,

            roleName,

            totalKeys

        };

    }


    // =========================================================
    // MOSTRAR WEBAPP DE ANUNCIOS
    // =========================================================

    async function sendAdRequired(
        chatId
    ) {

        return bot.sendMessage(

            chatId,

`<b>🔐 KEY FREE</b>

━━━━━━━━━━━━━━━━━━

Para obtener tu Key FREE debes completar:

🎬 <b>5 anuncios</b>

━━━━━━━━━━━━━━━━━━

🎁 <b>RECOMPENSA</b>

Después de completar los 5 anuncios podrás generar:

🔑 <b>1 Key FREE</b>

━━━━━━━━━━━━━━━━━━

📌 <b>Límite:</b>

1 Key FREE cada <b>24 horas</b>.

━━━━━━━━━━━━━━━━━━

⚠️ Después de generar tu Key tendrás que esperar 24 horas antes de poder obtener otra.`,

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

    async function showKey(
        chatId
    ) {

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
            // COOLDOWN 24 HORAS
            // =================================================

            if (
                result.cooldown
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
            // MOSTRAR KEY
            // =================================================

            return bot.sendMessage(

                chatId,

`<b>🔑 KEY FREE GENERADA</b>

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

⏱️ <b>Próxima Key FREE</b>

Disponible después de <b>24 horas</b>.

━━━━━━━━━━━━━━━━━━

💻 <b>Instalador Multi Script</b>

<code>export INSTALL_KEY="${result.key}"; bash &lt;(curl -fsSL https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/install.sh)</code>

━━━━━━━━━━━━━━━━━━

⚡ <b>Instalador @sshprivanoxbot</b>

<code>export INSTALL_KEY="${result.key}"; bash &lt;(curl -fsSL https://raw.githubusercontent.com/kevinaldaircama/privanox-code/main/install_go.sh)</code>`,

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
    // ÚNICA FORMA DE GENERAR KEY FREE
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


            // Solo procesamos:
            // /start adscompleted

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
                // OWNER / ADMIN
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
                // VERIFICAR COOLDOWN 24 HORAS
                // =================================================

                const freeKeyAt =
                    Number(
                        user.freeKeyAt || 0
                    );


                if (
                    freeKeyAt > 0
                ) {

                    const nextFreeKeyAt =
                        freeKeyAt +
                        FREE_KEY_COOLDOWN;


                    if (
                        Date.now() <
                        nextFreeKeyAt
                    ) {

                        const time =
                            getRemainingTime(
                                nextFreeKeyAt
                            );


                        return bot.sendMessage(

                            chatId,

`<b>⏳ KEY FREE EN COOLDOWN</b>

━━━━━━━━━━━━━━━━━━

🔐 Ya utilizaste tu Key FREE de hoy.

📌 <b>Límite:</b>

1 Key FREE cada 24 horas.

━━━━━━━━━━━━━━━━━━

⏱️ <b>Tiempo restante:</b>

<b>${time.hours}h ${time.minutes}min</b>

━━━━━━━━━━━━━━━━━━

🚫 No puedes desbloquear otra Key todavía.

━━━━━━━━━━━━━━━━━━

🔄 Cuando termine el tiempo podrás volver a completar los 5 anuncios.`,

                            {

                                parse_mode:
                                    "HTML"

                            }

                        );

                    }

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
                // DESBLOQUEAR UNA KEY
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

`<b>🎉 ANUNCIOS COMPLETADOS</b>

━━━━━━━━━━━━━━━━━━

✅ Anuncios:

<b>5 / 5</b>

━━━━━━━━━━━━━━━━━━

🔑 Has desbloqueado:

<b>1 KEY FREE</b>

━━━━━━━━━━━━━━━━━━

Ahora puedes generar tu Key escribiendo:

<code>/keyfree</code>

━━━━━━━━━━━━━━━━━━

⚠️ Recuerda:

Solo puedes generar <b>1 Key FREE cada 24 horas</b>.`,

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
    // REVOCAR KEY
    // =========================================================

    bot.on(

        "callback_query",

        async query => {

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


                const data =
                    snap.val();


                // =================================================
                // VERIFICAR PROPIETARIO
                // =================================================

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


                // =================================================
                // ELIMINAR KEY
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


                // =================================================
                // CONFIRMACIÓN
                // =================================================

                await bot.editMessageText(

`<b>🗑 KEY REVOCADA</b>

━━━━━━━━━━━━━━━━━━

🔑 <code>${key}</code>

━━━━━━━━━━━━━━━━━━

✅ La Key fue eliminada correctamente.

⏳ El límite de 24 horas sigue activo.`,

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