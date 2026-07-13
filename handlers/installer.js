import db from "../firebase.js";

export default function registerInstaller(bot) {

    bot.on("message", async (msg) => {

        if (!msg.text) return;

        if (msg.text !== "🚀 Instalador") return;

        const chatId = String(msg.chat.id);

        const snap = await db.ref(`users/${chatId}`).get();

        if (!snap.exists()) return;

        const user = snap.val();

        if (!user.approved) return;

        if (user.role !== "owner" && user.role !== "admin") return;

        bot.sendMessage(chatId,

`🚀 *Instalador Oficial*

Utiliza el siguiente comando para instalar el Multi Script VPN.

\`\`\`bash
bash <(curl -fsSL https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/install.sh)
\`\`\`

⚠️ Recuerda que durante la instalación se solicitará una KEY válida.

`,{

parse_mode:"Markdown"

});

    });

}
