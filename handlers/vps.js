import db from "../firebase.js";

export default function registerVPS(bot){

bot.on("message",async(msg)=>{

if(!msg.text) return;

if(msg.text!="🖥 Mis VPS") return;

const chatId=String(msg.chat.id);

const snap=await db.ref(`vps/${chatId}`).get();

if(!snap.exists()){

return bot.sendMessage(chatId,

`🖥 <b>Mis VPS</b>

━━━━━━━━━━━━━━

No tienes VPS registrados.

Los VPS aparecerán automáticamente cuando una KEY sea utilizada.

━━━━━━━━━━━━━━`,

{

parse_mode:"HTML"

});

}

let text=`🖥 <b>Mis VPS</b>

━━━━━━━━━━━━━━

`;

let total=0;

snap.forEach(item=>{

const vps=item.val();

total++;

text+=`💻 ${vps.name || "Sin nombre"}

🌐 ${vps.ip || "-"}

🖥 ${vps.os || "-"}

📅 ${new Date(vps.created).toLocaleString("es-PE")}

━━━━━━━━━━━━━━

`;

});

text+=`📊 Total VPS: <b>${total}</b>`;

bot.sendMessage(chatId,text,{

parse_mode:"HTML"

});

});

}
