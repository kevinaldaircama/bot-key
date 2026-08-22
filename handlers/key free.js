import db from "../firebase.js";
import { randomUUID } from "crypto";

export default function registerFreeKey(bot) {

    // =========================================================
    // CONFIGURACIÓN
    // =========================================================

    const WEBAPP_URL =
        "https://kevinaldaircama.github.io/bot-key/";

    const REQUIRED_ADS = 5;

    // Duración de la Key: 2 horas
    const KEY_LIFETIME =
        2 * 60 * 60 * 1000;

    // Límite FREE: 1 Key cada 24 horas
    const FREE_KEY_COOLDOWN =
        24 * 60 * 60 * 1000;


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


        // =====================================================
        // ROL
        // =====================================================

        const isOwner =
            user.role === "owner";

        const isAdmin =
            user.role === "admin";


        // =====================================================
        // OWNER / ADMIN
        // Sin límite FREE
        // =====================================================

        // Los administradores pueden generar
        // sin completar anuncios y sin cooldown.


        // =====================================================
        // USUARIO NORMAL
        // =====================================================

        if (!isOwner && !isAdmin) {


            // =================================================
            // COMPROBAR LÍMITE DE 24 HORAS
            // =================================================

            const lastFreeKeyAt =
                Number(user.lastFreeKeyAt || 0);

            const now =
                Date.now();


            if (
                lastFreeKeyAt > 0 &&
                now - lastFreeKeyAt < FREE_KEY_COOLDOWN
            ) {

                const remaining =
                    FREE_KEY_COOLDOWN -
                    (now - lastFreeKeyAt);


                const hours =
                    Math.floor(
                        remaining /
                        (60 * 60 * 1000)
                    );


                const minutes =
                    Math.floor(
                        (
                            remaining %
                            (60 * 60 * 1000)
                        ) /
                        (60 * 1000)
                    );


                return {

                    ok: false,

                    cooldown: true,

                    message:
                        `⏳ <b>LÍMITE DE KEY FREE</b>\n\n` +
                        `━━━━━━━━━━━━━━━━━━\n\n` +
                        `❌ Ya generaste tu Key FREE durante las últimas 24 horas.\n\n` +
                        `⏰ Podrás generar otra Key en aproximadamente:\n\n` +
                        `<b>${hours}h ${minutes}min</b>\n\n` +
                        `━━━━━━━━━━━━━━━━━━\n\n` +
                        `🎁 Límite: <b>1 Key FREE cada 24 horas</b>`

                };

            }


            // =================================================
            // COMPROBAR ANUNCIOS
            // =================================================

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
        // NOMBRE DE USUARIO
        // =====================================================

        const username =
            user.username ||
            user.telegramUsername ||
            user.firstName ||
            user.name ||
            `user_${chatId}`;


        // =====================================================
        // RESELLER
        // =====================================================

        const reseller =
            user.reseller &&
            typeof user.reseller === "string" &&
            user.reseller.trim() !== ""
                ? user.reseller.trim()
                : "Desconocido";


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

                // IMPORTANTE:
                // Igual que la Key de pago
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
        // ACTUALIZAR USUARIO
        // =====================================================

        if (!isOwner && !isAdmin) {

            await userRef.update({

                // Consumir acceso de anuncios
                adsKeyUnlocked:
                    false,

                adsCompleted:
                    0,

                adsCompletedAt:
                    null,

                // Registrar última Key FREE
                lastFreeKeyAt:
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
                    "KEY_GENERADA_FREE",

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

                        data.deleteAt >
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

            reseller,

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

Para obtener tu Key FREE debes completar:

🎬 <b>5 anuncios</b>

━━━━━━━━━━━━━━━━━━

🎁 <b>RECOMPENSA</b>

Después de completar los 5 anuncios podrás generar:

🔑 <b>1 Key FREE</b>

━━━━━━━━━━━━━━━━━━

⏰ <b>LÍMITE</b>

Solo puedes obtener:

<b>1 Key FREE cada 24 horas.</b>

━━━━━━━━━━━━━━━━━━

Después de completar los anuncios utiliza:

<code>/key</code>

━━━━━━━━━━━━━━━━━━`,

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

👥 <b>Reseller</b>

${result.reseller}

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

⏰ <b>Próxima Key FREE</b>

Disponible después de 24 horas.

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
                chatId
            );

        }

    );


    // =========================================================
    // /START ADSCOMPLETED
    // =========================================================

    bot.onText(

        /^\/start(?:@\w+)?(?:\s+(.+))?$/i,

        async (msg, match) => {

            const chatId =
                String(
                    msg.chat.id
                );


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


                // =============================================
                // OWNER / ADMIN
                // =============================================

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


                // =============================================
                // COMPROBAR COOLDOWN
                // =============================================

                const lastFreeKeyAt =
                    Number(
                        user.lastFreeKeyAt ||
                        0
                    );


                const now =
                    Date.now();


                if (

                    lastFreeKeyAt > 0 &&

                    now -
                    lastFreeKeyAt <
                    FREE_KEY_COOLDOWN

                ) {

                    const remaining =
                        FREE_KEY_COOLDOWN -
                        (
                            now -
                            lastFreeKeyAt
                        );


                    const hours =
                        Math.floor(
                            remaining /
                            (
                                60 *
                                60 *
                                1000
                            )
                        );


                    const minutes =
                        Math.floor(
                            (
                                remaining %
                                (
                                    60 *
                                    60 *
                                    1000
                                )
                            ) /
                            (
                                60 *
                                1000
                            )
                        );


                    return bot.sendMessage(

                        chatId,

`⏳ <b>KEY FREE NO DISPONIBLE</b>

━━━━━━━━━━━━━━━━━━

❌ Ya obtuviste una Key FREE durante las últimas 24 horas.

⏰ Podrás obtener otra en:

<b>${hours}h ${minutes}min</b>

━━━━━━━━━━━━━━━━━━

🎁 Límite:

<b>1 Key FREE cada 24 horas</b>`,

                        {

                            parse_mode:
                                "HTML"

                        }

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
                        now

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
                            now

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

🔑 Has desbloqueado:

<b>1 Key FREE</b>

━━━━━━━━━━━━━━━━━━

Ahora puedes generar tu Key escribiendo:

<code>/key</code>

━━━━━━━━━━━━━━━━━━

⏰ Recuerda:

<b>1 Key FREE cada 24 horas.</b>

━━━━━━━━━━━━━━━━━━

⚠️ Después de generar esta Key no podrás generar otra hasta que pasen 24 horas.`,

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

✅ La Key fue eliminada correctamente.

⏰ Tu límite de Key FREE sigue activo.`,

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