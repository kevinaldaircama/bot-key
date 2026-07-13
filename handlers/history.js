import db from "../firebase.js";

export default function registerHistory(bot){

bot.on("message",async(msg)=>{

if(msg.text!="📜 Historial") return;

const chatId=String(msg.chat.id);

const snap=await db.ref("keys").get();

if(!snap.exists()){

return bot.sendMessage(chatId,"No hay historial.");

}

let text="📜 Historial\n\n";

let total=0;

snap.forEach(item=>{

const k=item.val();

if(k.owner==chatId){

total++;

text+=`🔑 ${k.key}

👤 ${k.reseller}

${k.used?"✅ Usada":"🟢 Disponible"}

\n`;

}

});

if(total==0){

text+="No tienes registros.";

}

bot.sendMessage(chatId,text);

});

}
