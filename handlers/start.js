import db from "../firebase.js";
import config from "../config.js";

export default function registerStart(bot) {

    bot.onText(/\/start/, async (msg) => {

        try {

            const chatId = String(msg.chat.id);
            const name = msg.from.first_name || "Usuario";
            const username = msg.from.username || "Sin username";

            const userRef = db.ref(`users/${chatId}`);

            const snapshot = await userRef.get();

            if (!snapshot.exists()) {

                await userRef.set({

                    id: chatId,
                    name,
                    username,

                    role: "user",

                    approved: false,

                    reseller: "",

                    expire: "",

                    createdAt: Date.now()

                });

            }

            const data = (await userRef.get()).val();

            // =============================
            // DUEÑO
            // =============================

            if (chatId === config.OWNER_ID) {

                await userRef.update({

                    role: "owner",

                    approved: true

                });

                return showOwnerPanel(bot, chatId, data);

            }

            // =============================
            // ADMIN
            // =============================

            // =============================
// ADMIN
// =============================

if (data.role === "admin" && data.approved) {

    // Verificar si el acceso venció
    if (
        data.expire &&
        data.expire !== "" &&
        data.expire !== "Ilimitado"
    ) {

        const expireTime = new Date(data.expire).getTime();

        if (Date.now() >= expireTime) {

            await userRef.update({

                role: "user",

                approved: false,

                reseller: "",

                expire: ""

            });

            const newData = (await userRef.get()).val();

            return showUserPanel(bot, chatId, newData);

        }

    }

    return showAdminPanel(bot, chatId, data);

}

            // =============================
            // USUARIO
            // =============================

            return showUserPanel(bot, chatId, data);

        } catch (e) {

            console.log(e);

        }

    });

}
// ==========================================
// PANEL DUEÑO
// ==========================================

async function showOwnerPanel(bot, chatId, user) {

    const keys = await db.ref("keys").get();

    let totalKeys = 0;

    if (keys.exists()) {

        keys.forEach(item => {

            if (item.val().owner === chatId) {

                totalKeys++;

            }

        });

    }

    return bot.sendMessage(chatId,

`👑 <b>MULTI SCRIPT VPN</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Usuario</b>
${user.name}

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

parse_mode:"HTML",

reply_markup:{

inline_keyboard:[

[
{text:"🔑 Crear Key",callback_data:"menu_key"},
{text:"🚀 Instalador",callback_data:"menu_install"}
],

[
{text:"🖥 Mis VPS",callback_data:"menu_vps"},
{text:"📁 Mis Dominios",callback_data:"menu_domains"}
],

[
{text:"🌐 Dominio A",callback_data:"menu_domain_a"},
{text:"🧩 Dominio NS",callback_data:"menu_domain_ns"}
],

[
{text:"👥 Resellers",callback_data:"menu_reseller"},
{text:"📊 Estadísticas",callback_data:"menu_stats"}
],

[
{text:"📜 Historial",callback_data:"menu_history"},
{text:"📈 Mi Uso",callback_data:"menu_usage"},
{text:"⚙️ Configuración",callback_data:"menu_settings"}
]

]

}

});

}



// ==========================================
// PANEL ADMIN
// ==========================================

async function showAdminPanel(bot, chatId, user){

const keys=await db.ref("keys").get();

let totalKeys=0;

if(keys.exists()){

keys.forEach(item=>{

if(item.val().owner===chatId){

totalKeys++;

}

});

}

let expire = "♾️ Ilimitado";

if (
    user.expire &&
    user.expire !== "" &&
    user.expire !== "Ilimitado"
) {

    const fecha = new Date(user.expire);

    const dias = Math.ceil(
        (fecha.getTime() - Date.now()) / 86400000
    );

    expire = `${fecha.toLocaleDateString("es-PE")}
⏳ Restan ${dias} día${dias === 1 ? "" : "s"}`;

}

return bot.sendMessage(chatId,

`🛡️ <b>MULTI SCRIPT VPN</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Usuario</b>

${user.name}

🆔 <b>ID</b>

<code>${chatId}</code>

🎖️ <b>Rango</b>

Admin

📅 <b>Expira</b>

${expire}

👥 <b>Reseller</b>

${user.reseller||"Sin configurar"}

🔑 <b>Keys</b>

${totalKeys}

━━━━━━━━━━━━━━━━━━`,

{

parse_mode:"HTML",

reply_markup:{

inline_keyboard:[

[
{text:"🔑 Crear Key",callback_data:"menu_key"},
{text:"🚀 Instalador",callback_data:"menu_install"}
],

[
{text:"🖥 Mis VPS",callback_data:"menu_vps"},
{text:"📁 Mis Dominios",callback_data:"menu_domains"}
],

[
{text:"🌐 Dominio A",callback_data:"menu_domain_a"},
{text:"🧩 Dominio NS",callback_data:"menu_domain_ns"}
],

[
{text:"👥 Resellers",callback_data:"menu_reseller"}
],

[
{text:"📜 Historial",callback_data:"menu_history"},
{text:"📈 Mi Uso",callback_data:"menu_usage"}
]

]

}

});

               }
// ==========================================
// PANEL USUARIO
// ==========================================

async function showUserPanel(bot, chatId, user) {

    if (user.approved) return;

    return bot.sendMessage(chatId,

`🚀 <b>MULTI SCRIPT VPN PREMIUM</b>

━━━━━━━━━━━━━━━━━━

👋 Bienvenido

<b>${user.name}</b>

🆔 <b>ID</b>

<code>${chatId}</code>

🔒 <b>Estado</b>

Sin acceso

━━━━━━━━━━━━━━━━━━

Este bot es privado.

Para utilizar el sistema debes solicitar acceso al administrador.

Una vez aprobada tu solicitud podrás generar Keys, administrar dominios y utilizar todas las funciones del panel.

━━━━━━━━━━━━━━━━━━`,

{

parse_mode:"HTML",

reply_markup:{

inline_keyboard:[

[
{
text:"📨 Solicitar acceso",
callback_data:"request_access"
}
],

[
{
text:"👤 Contactarme",
url:"https://t.me/senseicamachito"
}
]

]

}

});

}


// ==========================================
// CALLBACK DEL PANEL
// ==========================================

export function registerMenuCallbacks(bot){

bot.on("callback_query",async(query)=>{

const chatId=String(query.message.chat.id);

switch(query.data){

case "menu_key":

await bot.answerCallbackQuery(query.id,{
text:"Generadon key esperé un momento..."
});

break;

case "menu_install":

await bot.answerCallbackQuery(query.id,{
text:"Abriendo Instalador..."
});

break;

case "menu_vps":

await bot.answerCallbackQuery(query.id,{
text:"Abriendo Mis VPS..."
});

break;

case "menu_domains":

await bot.answerCallbackQuery(query.id,{
text:"Abriendo Mis Dominios..."
});

break;

case "menu_domain_a":

await bot.answerCallbackQuery(query.id,{
text:"Abriendo Dominio A..."
});

break;

case "menu_domain_ns":

await bot.answerCallbackQuery(query.id,{
text:"Abriendo Dominio NS..."
});

break;

case "menu_reseller":

await bot.answerCallbackQuery(query.id,{
text:"Abriendo Reseller..."
});

break;

case "menu_stats":

await bot.answerCallbackQuery(query.id,{
text:"Abriendo Estadísticas..."
});

break;

case "menu_history":

await bot.answerCallbackQuery(query.id,{
text:"Abriendo Historial..."
});

break;

case "menu_usage":

await bot.answerCallbackQuery(query.id,{
text:"Abriendo Mi Uso..."
});

break;

}

});

  }
