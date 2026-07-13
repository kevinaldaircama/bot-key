import db from "../firebase.js";

export default function registerUsage(bot){

bot.on("message",async(msg)=>{

if(!msg.text) return;

if(msg.text!="📈 Mi Uso") return;

const chatId=String(msg.chat.id);

const snap=await db.ref("keys").get();

let total=0;
let usadas=0;
let disponibles=0;
let expiradas=0;

const now=Date.now();

if(snap.exists()){

snap.forEach(item=>{

const key=item.val();

if(key.owner!==chatId) return;

total++;

if(key.used){

usadas++;

}else{

if(key.expires<now){

expiradas++;

}else{

disponibles++;

}

}

});

}

let porcentaje=0;

if(total>0){

porcentaje=Math.round((usadas/total)*100);

}

bot.sendMessage(chatId,

`📈 <b>Mi Uso</b>

━━━━━━━━━━━━━━

🔑 Keys creadas:
<b>${total}</b>

🟢 Disponibles:
<b>${disponibles}</b>

🔴 Usadas:
<b>${usadas}</b>

⌛ Expiradas:
<b>${expiradas}</b>

📊 Uso:
<b>${porcentaje}%</b>

━━━━━━━━━━━━━━`,

{

parse_mode:"HTML"

});

});

}
