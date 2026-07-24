import db from "../firebase.js";  
  
export default function registerActivations(bot) {  
    console.log("🕒 Sistema de notificaciones iniciado.");  
  
    db.ref("activations").on("child_added", async (snap) => {  
        const data = snap.val();  
  
        console.log("📥 Activación detectada:", snap.key);  
  
        if (!data || data.notified) return;  
  
if (!data.owner) {  
    console.log("⚠️ Activación sin owner, se omite.");  
  
    await snap.ref.update({  
        notified: true  
    });  
  
    return;  
}  
  
        try {  
            console.log("📤 Enviando mensaje a:", data.owner);  
  
            const text = `🚀 <b>NUEVA ACTIVACIÓN</b>  
  
━━━━━━━━━━━━━━━━━━  
  
🗝️ <b>key</b>  
<code>${data.token || "N/A"}</code>  
  
👤 <b>Reseller</b>  
${data.reseller || "N/A"}  
  
👑 <b>Owner ID</b>
<code>${data.owner || "N/A"}</code>

━━━━━━━━━━━━━━━━━━  
  
🌐 <b>Información de la vps</b>  
  
🖥 <b>Host:</b> ${data.hostname || "N/A"}  
🌍 <b>IP:</b> <code>${data.ip || "N/A"}</code>  
🐧 <b>Sistema:</b> ${data.os || "N/A"}  
  
━━━━━━━━━━━━━━━━━━  
  
📅 <b>Fecha</b>  
  
${data.date || "N/A"}  
  
━━━━━━━━━━━━━━━━━━  
  
✅ <b>La licencia fue activada correctamente.</b>`;  
  
await bot.sendMessage(data.owner, text, {  
    parse_mode: "HTML"  
});  
            await snap.ref.update({ notified: true });  
  
            console.log("✅ Notificación enviada:", data.token);  
  
        } catch (err) {  
            console.error("❌ Error:");  
            console.error(err.response?.body || err);  
        }  
    });  
} 
