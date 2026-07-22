export default function registerPlans(bot) {

    bot.onText(/\/planes/, async (msg) => {

        const chatId = msg.chat.id;

        await bot.sendMessage(

            chatId,

`🚀 <b>MULTI SCRIPT VPN PREMIUM</b>

━━━━━━━━━━━━━━━━━━

💎 <b>PRECIOS PARA ADMIN</b>

👑 Obtén acceso al panel de administración y genera tus propias Keys.

━━━━━━━━━━━━━━━━━━

📅 <b>7 Días</b>
💵 <b>USD $5</b>

📅 <b>30 Días</b>
💵 <b>USD $10</b>

📅 <b>60 Días</b>
💵 <b>USD $18</b>

📅 <b>90 Días</b>
💵 <b>USD $20</b>

📅 <b>365 Días (1 Año)</b>
💵 <b>USD $30</b>

♾️ <b>Acceso Ilimitado</b>
💵 <b>USD $100</b>

━━━━━━━━━━━━━━━━━━

✅ Todos los planes incluyen:

• Panel de Administración
• Generación de Keys
• Configuración de Reseller
• Instalador Oficial
• Gestión de Dominios
• Soporte durante la vigencia

━━━━━━━━━━━━━━━━━━

📩 ¿Deseas comprar un acceso Admin?`,

            {

                parse_mode: "HTML",

                reply_markup: {

                    inline_keyboard: [

                        [

                            {

                                text: "💳 Comprar Acceso",

                                url: "https://t.me/senseicamachito"

                            }

                        ],

                        [

                            {

                                text: "📩 unirme al grupo",

                                url: "https://t.me/multiscriptofi"

                            }

                        ]

                    ]

                }

            }

        );

    });

}
