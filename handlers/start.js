import db from "../db.js";
import config from "../config.js";

// ============================================================
// /START
// ============================================================

export default function registerStart(bot) {

    /*
     * IMPORTANTE:
     *
     * Este /start NO debe capturar:
     *
     * /start adscompleted
     *
     * porque ese comando es manejado por
     * handlers/key free.js
     *
     * Por eso usamos negative lookahead.
     */

    bot.onText(
        /^\/start(?:@\w+)?(?!\s+adscompleted\b)(?:\s.*)?$/i,
        async (msg) => {

            try {

                const chatId =
                    String(msg.chat.id);

                const name =
                    msg.from.first_name ||
                    "Usuario";

                const username =
                    msg.from.username ||
                    "Sin username";


                // ====================================================
                // USUARIO
                // ====================================================

                const userRef =
                    db.ref(`users/${chatId}`);

                let snapshot =
                    await userRef.get();


                // ====================================================
                // CREAR USUARIO
                // ====================================================

                if (!snapshot.exists()) {

                    await userRef.set({

                        id: chatId,

                        name,

                        username,

                        role: "user",

                        approved: false,

                        banned: false,

                        reseller: "",

                        expire: "",

                        createdAt: Date.now()

                    });

                }


                // ====================================================
                // RECARGAR DATOS
                // ====================================================

                snapshot =
                    await userRef.get();

                const data =
                    snapshot.val() || {};


                // ====================================================
                // USUARIO BANEADO
                // ====================================================

                if (
                    data.banned &&
                    chatId !== String(config.OWNER_ID)
                ) {

                    return bot.sendMessage(
                        chatId,

                        `🚫 <b>ACCESO BLOQUEADO</b>

━━━━━━━━━━━━━━━━━━

👤 ${data.name || "Usuario"}

🆔 <code>${chatId}</code>

⛔ Tu cuenta ha sido baneada por el propietario.

Si crees que se trata de un error, comunícate con el dueño del bot.`,

                        {
                            parse_mode: "HTML"
                        }
                    );
                }


                // ====================================================
                // DUEÑO
                // ====================================================

                if (
                    chatId === String(config.OWNER_ID)
                ) {

                    await userRef.update({

                        role: "owner",

                        approved: true

                    });


                    return showOwnerPanel(
                        bot,
                        chatId,
                        {
                            ...data,
                            role: "owner",
                            approved: true
                        }
                    );
                }


                // ====================================================
                // ADMIN
                // ====================================================

                if (
                    data.role === "admin" &&
                    data.approved
                ) {

                    // -----------------------------------------------
                    // COMPROBAR EXPIRACIÓN
                    // -----------------------------------------------

                    if (
                        data.expire &&
                        data.expire !== "" &&
                        data.expire !== "Ilimitado"
                    ) {

                        const expireTime =
                            new Date(
                                data.expire
                            ).getTime();


                        if (
                            Number.isFinite(expireTime) &&
                            Date.now() >= expireTime
                        ) {

                            await userRef.update({

                                role: "user",

                                approved: false,

                                reseller: "",

                                expire: ""

                            });


                            const newSnapshot =
                                await userRef.get();

                            const newData =
                                newSnapshot.val() || {};


                            return showUserPanel(
                                bot,
                                chatId,
                                newData
                            );
                        }
                    }


                    return showAdminPanel(
                        bot,
                        chatId,
                        data
                    );
                }


                // ====================================================
                // USUARIO NORMAL
                // ====================================================

                return showUserPanel(
                    bot,
                    chatId,
                    data
                );

            } catch (error) {

                console.error(
                    "[START]",
                    error
                );

            }

        }
    );
}


// ============================================================
// PANEL DUEÑO
// ============================================================

async function showOwnerPanel(
    bot,
    chatId,
    user
) {

    const keys =
        await db.ref("keys").get();

    let totalKeys = 0;


    if (keys.exists()) {

        keys.forEach(
            (item) => {

                const value =
                    item.val() || {};

                if (
                    String(value.owner) ===
                    String(chatId)
                ) {

                    totalKeys++;
                }

            }
        );
    }


    return bot.sendMessage(
        chatId,

`👑 <b>MULTI SCRIPT VPN</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Usuario</b>
${user.name || "Usuario"}

🆔 <b>ID</b>
<code>${chatId}</code>

🎖️ <b>Rango</b>
Dueño

📅 <b>Acceso</b>
Ilimitado

👥 <b>Reseller</b>
${user.reseller || "Sin configurar"}

🔑 <b>Keys Generadas</b>
${totalKeys}

━━━━━━━━━━━━━━━━━━

Seleccione una opción.`,

        {

            parse_mode: "HTML",

            reply_markup: {

                inline_keyboard: [

                    [
                        {
                            text: "🔑 Crear Key",
                            callback_data: "menu_key"
                        },
                        {
                            text: "📁 Mis Dominios",
                            callback_data: "menu_domains"
                        }
                    ],

                    [
                        {
                            text: "🌐 Dominio A",
                            callback_data: "menu_domain_a"
                        },
                        {
                            text: "🧩 Dominio NS",
                            callback_data: "menu_domain_ns"
                        }
                    ],

                    [
                        {
                            text: "👥 Resellers",
                            callback_data: "menu_reseller"
                        },
                        {
                            text: "📊 Estadísticas",
                            callback_data: "menu_stats"
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
                            text: "⚙️ Configuración",
                            callback_data: "menu_settings"
                        }
                    ]

                ]

            }

        }
    );
}


// ============================================================
// PANEL ADMIN
// ============================================================

async function showAdminPanel(
    bot,
    chatId,
    user
) {

    const keys =
        await db.ref("keys").get();

    let totalKeys = 0;


    if (keys.exists()) {

        keys.forEach(
            (item) => {

                const value =
                    item.val() || {};

                if (
                    String(value.owner) ===
                    String(chatId)
                ) {

                    totalKeys++;
                }

            }
        );
    }


    let expire =
        "♾️ Ilimitado";


    if (
        user.expire &&
        user.expire !== "" &&
        user.expire !== "Ilimitado"
    ) {

        const fecha =
            new Date(user.expire);


        const dias =
            Math.ceil(
                (
                    fecha.getTime() -
                    Date.now()
                ) / 86400000
            );


        expire =
            `${fecha.toLocaleDateString("es-PE")}
⏳ Restan ${dias} día${dias === 1 ? "" : "s"}`;
    }


    return bot.sendMessage(
        chatId,

`🛡️ <b>MULTI SCRIPT VPN</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Usuario</b>

${user.name || "Usuario"}

🆔 <b>ID</b>

<code>${chatId}</code>

🎖️ <b>Rango</b>

Admin

📅 <b>Expira</b>

${expire}

👥 <b>Reseller</b>

${user.reseller || "Sin configurar"}

🔑 <b>Keys</b>

${totalKeys}

━━━━━━━━━━━━━━━━━━`,

        {

            parse_mode: "HTML",

            reply_markup: {

                inline_keyboard: [

                    [
                        {
                            text: "🔑 Crear Key",
                            callback_data: "menu_key"
                        },
                        {
                            text: "🚀 Instalador",
                            callback_data: "menu_install"
                        }
                    ],

                    [
                        {
                            text: "🖥 Mis VPS",
                            callback_data: "menu_vps"
                        },
                        {
                            text: "📁 Mis Dominios",
                            callback_data: "menu_domains"
                        }
                    ],

                    [
                        {
                            text: "🌐 Dominio A",
                            callback_data: "menu_domain_a"
                        },
                        {
                            text: "🧩 Dominio NS",
                            callback_data: "menu_domain_ns"
                        }
                    ],

                    [
                        {
                            text: "👥 Resellers",
                            callback_data: "menu_reseller"
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
                    ]

                ]

            }

        }
    );
}


// ============================================================
// PANEL USUARIO
// ============================================================

async function showUserPanel(
    bot,
    chatId,
    user
) {

    /*
     * Si ya tiene acceso aprobado,
     * no mostrar el panel de usuario
     * sin acceso.
     */

    if (user.approved) {
        return;
    }


    return bot.sendMessage(
        chatId,

`🚀 <b>MULTI SCRIPT VPN PREMIUM</b>

━━━━━━━━━━━━━━━━━━

👋 Bienvenido

<b>${user.name || "Usuario"}</b>

🆔 <b>ID</b>

<code>${chatId}</code>

🔒 <b>Estado</b>

Sin acceso

━━━━━━━━━━━━━━━━━━

Este bot es privado.

Para utilizar el sistema debes ver los /planes si te interesa concuerda con el dueño y solicita acceso al administrador y espera que te acepten.

Una vez aprobada tu solicitud podrás generar Keys, administrar dominios y utilizar todas las funciones del panel hasta el tiempo contratado.

━━━━━━━━━━━━━━━━━━`,

        {

            parse_mode: "HTML",

            reply_markup: {

                inline_keyboard: [

                    [
                        {
                            text: "📨 Solicitar acceso",
                            callback_data: "request_access"
                        }
                    ],

                    [
                        {
                            text: "ℹ️ Información",
                            callback_data: "user_info"
                        },
                        {
                            text: "🆔 Mi ID",
                            callback_data: "user_id"
                        }
                    ],

                    [
                        {
                            text: "🎟 Canjear Cupón",
                            callback_data: "redeem_coupon"
                        }
                    ],

                    [
                        {
                            text: "👤 Contactarme",
                            url: "https://t.me/senseicamachito"
                        }
                    ]

                ]

            }

        }
    );
}


// ============================================================
// CALLBACK DEL PANEL
// ============================================================

export function registerMenuCallbacks(bot) {

    bot.on(
        "callback_query",
        async (query) => {

            if (!query.data) {
                return;
            }


            const chatId =
                String(
                    query.message?.chat?.id
                );


            switch (query.data) {


                // ================================================
                // MENÚ KEY
                // ================================================

                case "menu_key":

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text:
                                "Generando key, espere un momento..."
                        }
                    );

                    break;


                // ================================================
                // INSTALADOR
                // ================================================

                case "menu_install":

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text:
                                "Abriendo Instalador..."
                        }
                    );

                    break;


                // ================================================
                // VPS
                // ================================================

                case "menu_vps":

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text:
                                "Abriendo VPS..."
                        }
                    );

                    break;


                // ================================================
                // DOMINIOS
                // ================================================

                case "menu_domains":

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text:
                                "Abriendo lista de Dominios..."
                        }
                    );

                    break;


                // ================================================
                // DOMINIO A
                // ================================================

                case "menu_domain_a":

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text:
                                "Generando sistema de dominio A..."
                        }
                    );

                    break;


                // ================================================
                // DOMINIO NS
                // ================================================

                case "menu_domain_ns":

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text:
                                "Abriendo Dominio NS..."
                        }
                    );

                    break;


                // ================================================
                // RESELLER
                // ================================================

                case "menu_reseller":

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text:
                                "Abriendo Reseller..."
                        }
                    );

                    break;


                // ================================================
                // ESTADÍSTICAS
                // ================================================

                case "menu_stats":

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text:
                                "Abriendo Estadísticas..."
                        }
                    );

                    break;


                // ================================================
                // HISTORIAL
                // ================================================

                case "menu_history":

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text:
                                "Abriendo Historial..."
                        }
                    );

                    break;


                // ================================================
                // USO
                // ================================================

                case "menu_usage":

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text:
                                "Abriendo Mi Uso..."
                        }
                    );

                    break;


                // ================================================
                // INFORMACIÓN
                // ================================================

                case "user_info":

                    await bot.answerCallbackQuery(
                        query.id
                    );


                    await bot.sendMessage(
                        chatId,

`🤖 <b>BOT DE ADMINISTRACIÓN VPS</b>

━━━━━━━━━━━━━━━━━━

🚀 <b>FUNCIONES INCLUIDAS</b>

🔹 <b>Gestión de Subdominios</b>
• Crear, editar y eliminar subdominios.
• Cambiar IP y gestión de NS (SlowDNS).

🔹 <b>Generación de Keys</b>
• Creación automática de accesos.

🔹 <b>Instalador oficial</b>
• Tendrás el instalador oficial.

🔹 <b>Multi Script</b>
• Instalación incluida con puertos automáticos.
• Protocolos: SSH, VMESS, VLESS.

🔹 <b>Control & Alertas</b>
• Control total y notificaciones desde Telegram.

━━━━━━━━━━━━━━━━━━`,

                        {
                            parse_mode: "HTML"
                        }
                    );

                    break;


                // ================================================
                // MI ID
                // ================================================

                case "user_id":

                    await bot.answerCallbackQuery(
                        query.id
                    );


                    await bot.sendMessage(
                        chatId,

`🆔 <b>TU ID DE TELEGRAM</b>

━━━━━━━━━━━━━━━━━━

<code>${chatId}</code>

━━━━━━━━━━━━━━━━━━`,

                        {
                            parse_mode: "HTML"
                        }
                    );

                    break;


                // ================================================
                // CUPÓN
                // ================================================

                case "redeem_coupon":

                    await bot.answerCallbackQuery(
                        query.id
                    );


                    await bot.sendMessage(
                        chatId,

`🎟 <b>CANJEAR CUPÓN</b>

━━━━━━━━━━━━━━━━━━

Escribe el código del cupón.

🎁 Nuevo usuario:

<code>ktt</code> = 1 día gratis`,

                        {
                            parse_mode: "HTML"
                        }
                    );

                    break;


                // ================================================
                // SOLICITAR ACCESO
                // ================================================

                case "request_access":

                    await bot.answerCallbackQuery(
                        query.id
                    );


                    await bot.sendMessage(
                        chatId,

`📨 <b>SOLICITUD DE ACCESO</b>

━━━━━━━━━━━━━━━━━━

Tu solicitud fue enviada correctamente.

⏳ Espera a que el propietario o un administrador apruebe tu acceso.

Recibirás acceso una vez seas autorizado.`,

                        {
                            parse_mode: "HTML"
                        }
                    );

                    break;

            }

        }
    );


    // ============================================================
    // CANJEAR CUPÓN
    // ============================================================

    bot.on(
        "message",
        async (msg) => {

            const chatId =
                String(msg.chat.id);


            if (!msg.text) {
                return;
            }


            /*
             * No procesar comandos como cupones.
             */

            if (
                msg.text.startsWith("/")
            ) {
                return;
            }


            const code =
                msg.text
                    .trim()
                    .toLowerCase();


            /*
             * Solo códigos simples.
             */

            if (
                !/^[a-z0-9_-]{3,30}$/.test(code)
            ) {

                return;
            }


            const couponRef =
                db.ref(
                    `coupons/${code}`
                );


            const couponSnap =
                await couponRef.get();


            if (!couponSnap.exists()) {
                return;
            }


            const coupon =
                couponSnap.val() || {};


            if (!coupon.enabled) {

                return bot.sendMessage(
                    chatId,
                    "❌ Este cupón está desactivado."
                );
            }


            if (
                (coupon.used || 0) >=
                (coupon.uses || 1)
            ) {

                return bot.sendMessage(
                    chatId,
                    "❌ Este cupón ya fue utilizado."
                );
            }


            const userRef =
                db.ref(
                    `users/${chatId}`
                );


            const expireDate =
                new Date();


            expireDate.setDate(
                expireDate.getDate() +
                Number(coupon.days || 0)
            );


            await userRef.update({

                approved: true,

                banned: false,

                role: "admin",

                expire:
                    expireDate.toISOString()

            });


            await couponRef.update({

                used:
                    (coupon.used || 0) + 1

            });


            await bot.sendMessage(
                chatId,

                "🎉 Cupón canjeado correctamente. Ahora eres administrador."
            );

        }
    );
}
