export default function registerPlans(bot) {

    bot.onText(/\/planes/, async (msg) => {

        const chatId = msg.chat.id;

        await bot.sendMessage(

            chatId,

`🚀 <b>MULTI SCRIPT VPN PREMIUM</b>

━━━━━━━━━━━━━━━━━━

💎 <b>PLANES DISPONIBLES</b>

🥉 <b>Plan Básico</b>

• 30 días
• 1 VPS
• Soporte básico

💰 S/ XX

━━━━━━━━━━━━━━━━━━

🥈 <b>Plan Pro</b>

• 90 días
• 5 VPS
• Soporte prioritario

💰 S/ XX

━━━━━━━━━━━━━━━━━━

🥇 <b>Plan Premium</b>

• 365 días
• VPS ilimitados
• Actualizaciones
• Soporte Premium

💰 S/ XX

━━━━━━━━━━━━━━━━━━

📩 Elige un plan y contáctanos.`,

            {

                parse_mode: "HTML",

                reply_markup: {

                    inline_keyboard: [

                        [

                            {

                                text: "🥉 Plan Básico",

                                url: "https://t.me/senseicamachito"

                            }

                        ],

                        [

                            {

                                text: "🥈 Plan Pro",

                                url: "https://t.me/senseicamachito"

                            }

                        ],

                        [

                            {

                                text: "🥇 Plan Premium",

                                url: "https://t.me/senseicamachito"

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

    });

}
