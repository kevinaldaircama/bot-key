import db from "../firebase.js";

export default function registerUsage(bot){

bot.on("message",async(msg)=>{

if(msg.text!="📈 Mi Uso") return;

const chatId=String(msg.chat.id);

const snap=await db.ref("keys").get();

let total=0;
let usadas=0;
let disponibles=0;

if(snap.exists()){

snap.forEach(item=>{

const key=item.val();

if(key.owner==chatId){

total++;

if(key.used){

usadas++;

}else{

disponibles++;

}

}

});

}

bot.sendMessage(chatId,

`📈 *Mi Uso*

🔑 Keys creadas: ${total}

✅ Keys usadas: ${usadas}

🟢 Keys disponibles: ${disponibles}`,

{

parse_mode:"Markdown"

});

});

  }
