import db from "../firebase.js";
import config from "../config.js";

export default function registerStart(bot) {

bot.onText(/\/start/, async (msg) => {

try {

const chatId = String(msg.chat.id);
const name = msg.from.first_name || "";
const username = msg.from.username || "";

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


// ==========================
// DUEÑO
// ==========================

if (chatId === config.OWNER_ID) {

await userRef.update({
role: "owner",
approved: true
});

return bot.sendMessage(chatId,

`👑 *Panel del Dueño*

Bienvenido *${name}*.

Seleccione una opción.`,

{
parse_mode: "Markdown",

reply_markup: {
keyboard: [

["🔑 Crear Key"],

["🚀 Instalador"],

["🖥 Mis VPS"],

["🌐 Dominio A","🧩 Dominio NS"],

["📁 Mis Dominios"],

["👥 Resellers"],

["📊 Estadísticas"],

["📜 Historial","📈 Mi Uso"]

],
resize_keyboard:true
}

});

}


// ==========================
// ADMIN
// ==========================

if (data.role === "admin" && data.approved) {

return bot.sendMessage(chatId,

`👨‍💻 *Panel Admin*

Bienvenido *${name}*.`,

{

parse_mode:"Markdown",

reply_markup:{
keyboard:[

["🔑 Crear Key"],

["🚀 Instalador"],

["🖥 Mis VPS"],

["🌐 Dominio A","🧩 Dominio NS"],

["📁 Mis Dominios"],

["👥 Resellers"],

["📜 Historial","📈 Mi Uso"]

],
resize_keyboard:true
}

});

}


// ==========================
// USUARIO
// ==========================

if (!data.approved) {

return bot.sendMessage(chatId,

`🚀 *Multi Script VPN Premium*

Bienvenido.

Este bot es de acceso privado para la creación de licencias VPN de alto rendimiento.

Si deseas adquirir acceso al sistema, ser revendedor o comprar una llave, solicita acceso.`,

{

parse_mode:"Markdown",

reply_markup:{

inline_keyboard:[

[
{text:"📨 Solicitar acceso",callback_data:"request_access"}
],

[
{text:"👤 Contactarme",url:"https://t.me/senseicamachito"}
]

]

}

});

}


// ==========================
// RESELLER
// ==========================

if (data.role === "reseller") {

return bot.sendMessage(chatId,

`👤 *Panel Reseller*

Reseller:

${data.reseller}`,

{

parse_mode:"Markdown",

reply_markup:{

keyboard:[

["🔑 Crear Key"],

["📜 Historial"],

["📈 Mi Uso"]

],

resize_keyboard:true

}

});

}

} catch(err){

console.log(err);

}

});

}
