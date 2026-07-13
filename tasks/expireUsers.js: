import db from "../firebase.js";

export default function startExpireTask(bot) {

    console.log("🕒 Sistema de licencias iniciado.");

    async function checkUsers() {

        try {

            const snap = await db.ref("users").get();

            if (!snap.exists()) return;

            const now = Date.now();

            snap.forEach(async (item) => {

                const id = item.key;
                const user = item.val();

                if (user.role !== "admin") return;
                if (!user.approved) return;
                if (!user.expire) return;
                if (user.expire === "Ilimitado") return;

                const expire = new Date(user.expire).getTime();

                const diff = expire - now;

                const days = Math.floor(diff / 86400000);
                const hours = Math.floor(diff / 3600000);

                // ===== Aviso 3 días =====

                if (days <= 3 && days > 1 && !user.warn3d) {

                    await bot.sendMessage(id,

`⚠️ <b>Recordatorio</b>

Tu acceso Admin vence en <b>${days} días</b>.

Utiliza /planes para renovarlo antes del vencimiento.`,

{

parse_mode:"HTML"

});

                    await db.ref(`users/${id}`).update({

                        warn3d:true

                    });

                }

                // ===== Aviso 1 día =====

                if (days <= 1 && hours > 1 && !user.warn1d) {

                    await bot.sendMessage(id,

`⚠️ <b>Tu acceso vence mañana.</b>

Renueva tu licencia para evitar perder el panel.`,

{

parse_mode:"HTML"

});

                    await db.ref(`users/${id}`).update({

                        warn1d:true

                    });

                }

                // ===== Aviso 1 hora =====

                if (hours <= 1 && diff > 0 && !user.warn1h) {

                    await bot.sendMessage(id,

`🚨 <b>Último aviso</b>

Tu acceso expirará en menos de 1 hora.

Utiliza /planes para renovarlo.`,

{

parse_mode:"HTML"

});

                    await db.ref(`users/${id}`).update({

                        warn1h:true

                    });

                }

                // ===== Expirar =====

                if (diff <= 0) {

                    await db.ref(`users/${id}`).update({

                        role:"user",

                        approved:false,

                        reseller:"",

                        expire:"",

                        warn3d:false,

                        warn1d:false,

                        warn1h:false

                    });

                    await bot.sendMessage(id,

`⛔ <b>Acceso Expirado</b>

Tu licencia de Administrador ha finalizado.

Si deseas continuar utilizando el panel puedes renovarla con:

/planes`,

{

parse_mode:"HTML"

});

                    console.log(`✔ ${id} expirado`);

                }

            });

        } catch(e){

            console.log(e);

        }

    }

    // Primera revisión al iniciar
    checkUsers();

    // Revisar cada minuto
    setInterval(checkUsers,60000);

}
