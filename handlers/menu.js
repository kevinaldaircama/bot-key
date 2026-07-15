export default function registerMenu(bot) {

    bot.on("callback_query", async (query) => {

        const chatId = query.message.chat.id;

        switch (query.data) {

            case "menu_key":

                bot.emit("menu:key", chatId, query);

            break;

            case "menu_install":

                bot.emit("menu:install", chatId, query);

            break;

            case "menu_vps":

                bot.emit("menu:vps", chatId, query);

            break;

            case "menu_domains":

                bot.emit("menu:domains", chatId, query);

            break;

            case "menu_domain_a":

                bot.emit("menu:domain_a", chatId, query);

            break;

            case "menu_domain_ns":

                bot.emit("menu:domain_ns", chatId, query);

            break;

            case "menu_reseller":

                bot.emit("menu:reseller", chatId, query);

            break;

            case "menu_stats":

                bot.emit("menu:stats", chatId, query);

            break;

            case "menu_history":

                bot.emit("menu:history", chatId, query);

            break;

            case "menu_usage":

                bot.emit("menu:usage", chatId, query);

            break;
                case "menu_settings":

                bot.emit("menu:settings", chatId, query);

            break;

        }

    });

    }
