import axios from "axios";

export default function registerPlans(bot) {

    bot.onText(/\/planes/, async (msg) => {

        const chatId = msg.chat.id;

        try {

            // Obtener el tipo de cambio USD -> PEN
            const { data } = await axios.get("https://open.er-api.com/v6/latest/USD");

            const tc = data.rates.PEN;

            const s5   = (5 * tc).toFixed(2);
            const s10  = (10 * tc).toFixed(2);
            const s18  = (18 * tc).toFixed(2);
            const s20  = (20 * tc).toFixed(2);
            const s30  = (30 * tc).toFixed(2);
            const s100 = (100 * tc).toFixed(2);

            await bot.sendMessage(
                chatId,
`🚀 <b>MULTI SCRIPT VPN PREMIUM</b>

━━━━━━━━━━━━━━━━━━

💎 <b>PRECIOS PARA ADMIN</b>

📅 <b>7 Días</b>
💵 USD $5 | 🇵🇪 S/ ${s5}

📅 <b>30 Días</b>
💵 USD $10 | 🇵🇪 S/ ${s10}

📅 <b>60 Días</b>
💵 USD $18 | 🇵🇪 S/ ${s18}

📅 <b>90 Días</b>
💵 USD $20 | 🇵🇪 S/ ${s20}

📅 <b>365 Días (1 Año)</b>
💵 USD $30 | 🇵🇪 S/ ${s30}

♾️ <b>Acceso Ilimitado</b>
💵 USD $100 | 🇵🇪 S/ ${s100}

━━━━━━━━━━━━━━━━━━

💱 <b>Tipo de cambio:</b> 1 USD = S/ ${tc.toFixed(2)}

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
                                    text: "📩 Unirme al grupo",
                                    url: "https://t.me/multiscriptofi"
                                }
                            ]
                        ]
                    }
                }
            );

        } catch (err) {

            bot.sendMessage(chatId, "❌ No se pudo obtener el tipo de cambio.");

        }

    });

}
