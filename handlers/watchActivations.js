import { getDatabase, ref, onChildAdded, update } from "firebase/database";
import { app } from "../firebase.js"; // o el archivo donde inicializas Firebase

export default function registerActivations(bot) {

    const db = getDatabase(app);

    onChildAdded(ref(db, "activations"), async (snap) => {

        const data = snap.val();

        if (!data || data.notified) return;

        const text = `🔔 NOTIFICACIÓN DE USO 🔔

✅ Tu Token ha sido activado.

👤 Reseller: ${data.reseller}

🔑 Token: ${data.token}

🌐 IP Cliente: ${data.ip}

🖥 Host: ${data.hostname}

🐧 Sistema: ${data.os}

📅 Fecha: ${data.date}`;

        try {

            await bot.sendMessage(data.owner, text);

            await update(snap.ref, {
                notified: true
            });

        } catch (err) {

            console.log(err);

        }

    });

}
