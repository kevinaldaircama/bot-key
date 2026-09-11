import db from "../db.js";

export default function deleteExpiredKeys() {

    console.log("🗑️ Sistema de eliminación de keys iniciado.");

    setInterval(async () => {

        try {

            const snap = await db.ref("keys").get();

            if (!snap.exists()) return;

            const now = Date.now();

            for (const child of Object.entries(snap.val())) {

                const key = child[0];
                const data = child[1];

                if (data.deleteAt && data.deleteAt <= now) {

                    await db.ref(`keys/${key}`).remove();

                    console.log(`🗑️ Key eliminada: ${key}`);

                }

            }

        } catch (err) {

            console.error(err);

        }

    }, 60000);

              }
