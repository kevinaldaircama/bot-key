import db from "../firebase.js";      
import { randomUUID } from "crypto";      
import { Client } from "ssh2";      
      
const INSTALLER_URL =      
    "https://raw.githubusercontent.com/kevinaldaircama/multi-script/main/install.sh";      
      
const installerState = {};      
      
function generateKey() {      
    return (      
        "kevintechmulti-script-" +      
        randomUUID()      
            .replace(/-/g, "")      
            .substring(0, 10)      
            .toUpperCase()      
    );      
}      
      
function escapeHtml(text = "") {      
    return String(text)      
        .replace(/&/g, "&amp;")      
        .replace(/</g, "&lt;")      
        .replace(/>/g, "&gt;")      
        .replace(/"/g, "&quot;");      
}      
      
function sshExec({ host, username, password, command }) {      
    return new Promise((resolve, reject) => {      
        const conn = new Client();      
      
        let output = "";      
        let errorOutput = "";      
      
        conn      
            .on("ready", () => {      
                conn.exec(command, (err, stream) => {      
                    if (err) {      
                        conn.end();      
                        return reject(err);      
                    }      
      
                    stream.on("data", (data) => {      
                        output += data.toString();      
                    });      
      
                    stream.stderr.on("data", (data) => {      
                        errorOutput += data.toString();      
                    });      
      
                    stream.on("close", (code) => {      
                        conn.end();      
      
                        resolve({      
                            code,      
                            output,      
                            errorOutput      
                        });      
                    });      
                });      
            })      
            .on("error", (err) => {      
                reject(err);      
            })      
            .connect({      
                host,      
                port: 22,      
                username,      
                password,      
                readyTimeout: 15000,      
                keepaliveInterval: 10000      
            });      
    });      
}      
      
export default function registerInstaller(bot) {      
      
    // =====================================================      
    // MENU INSTALADOR      
    // =====================================================      
      
    bot.on("callback_query", async (query) => {      
      
        if (query.data !== "menu_install") return;      
      
        await bot.answerCallbackQuery(query.id);      
      
        const chatId = String(query.message.chat.id);      
      
        try {      
      
            const snap = await db.ref(`users/${chatId}`).get();      
      
            if (!snap.exists()) {      
                return;      
            }      
      
            const user = snap.val();      
      
            if (!user.approved) {      
                return bot.answerCallbackQuery(query.id, {      
                    text: "No tienes acceso.",      
                    show_alert: true      
                });      
            }      
      
            if (user.role !== "owner" && user.role !== "admin") {      
                return bot.answerCallbackQuery(query.id, {      
                    text: "No autorizado.",      
                    show_alert: true      
                });      
            }      
      
            const keysSnap = await db.ref("keys").get();      
      
            let disponibles = 0;      
      
            if (keysSnap.exists()) {      
      
                keysSnap.forEach(item => {      
      
                    const key = item.val();      
      
                    if (      
                        key.owner === chatId &&      
                        !key.used &&      
                        key.deleteAt &&      
                        key.deleteAt > Date.now()      
                    ) {      
                        disponibles++;      
                    }      
      
                });      
            }      
      
            const role = user.role === "owner"      
                ? "👑 Dueño"      
                : "🛡️ Admin";      
      
            await bot.editMessageText(      
      
`🚀 <b>MULTI SCRIPT VPN</b>      
      
━━━━━━━━━━━━━━━━━━      
      
${role}      
      
👤 <b>Reseller</b>      
      
${escapeHtml(user.reseller || "Sin configurar")}      
      
━━━━━━━━━━━━━━━━━━      
      
🔑 <b>Keys Disponibles:</b> ${disponibles}      
      
━━━━━━━━━━━━━━━━━━      
      
🌐 <b>Instalación automática de VPS</b>      
      
El bot solicitará:      
      
1️⃣ IP de la VPS      
2️⃣ Usuario SSH      
3️⃣ Contraseña SSH      
      
Después conectará por SSH y ejecutará automáticamente:      
      
<code>${INSTALLER_URL}</code>      
      
━━━━━━━━━━━━━━━━━━      
      
⚠️ La contraseña se mantiene solamente en memoria durante la conexión y no se guarda en Firebase.`,      
      
                {      
                    chat_id: chatId,      
                    message_id: query.message.message_id,      
                    parse_mode: "HTML",      
                    reply_markup: {      
                        inline_keyboard: [      
                            [      
                                {      
                                    text: "🚀 Instalar VPS",      
                                    callback_data: "installer_start"      
                                }      
                            ],      
                            [      
                                {      
                                    text: "🔑 Crear Key",      
                                    callback_data: "menu_key"      
                                }      
                            ],      
                            [      
                                {      
                                    text: "🏠 Inicio",      
                                    callback_data: "menu_home"      
                                }      
                            ]      
                        ]      
                    }      
                }      
            );      
      
        } catch (err) {      
      
            console.log("INSTALLER MENU ERROR:", err);      
      
        }      
      
    });      
      
      
    // =====================================================      
    // INICIAR INSTALACIÓN      
    // =====================================================      
      
    bot.on("callback_query", async (query) => {      
      
        if (query.data !== "installer_start") return;      
      
        await bot.answerCallbackQuery(query.id);      
      
        const chatId = String(query.message.chat.id);      
      
        const snap = await db.ref(`users/${chatId}`).get();      
      
        if (!snap.exists()) return;      
      
        const user = snap.val();      
      
        if (      
            !user.approved ||      
            (user.role !== "owner" && user.role !== "admin")      
        ) {      
            return bot.answerCallbackQuery(query.id, {      
                text: "No autorizado.",      
                show_alert: true      
            });      
        }      
      
        installerState[chatId] = {      
            step: "WAIT_IP"      
        };      
      
        await bot.sendMessage(      
            chatId,      
`🌐 <b>INSTALACIÓN DE VPS</b>      
      
━━━━━━━━━━━━━━━━━━      
      
Escribe la <b>IP o dominio SSH</b> de tu VPS.      
      
Ejemplo:      
      
<code>123.123.123.123</code>      
      
o      
      
<code>vps.midominio.com</code>      
      
━━━━━━━━━━━━━━━━━━      
      
❌ /cancel para cancelar.`,      
            {      
                parse_mode: "HTML"      
            }      
        );      
      
    });      
      
      
    // =====================================================      
    // RECIBIR DATOS      
    // =====================================================      
      
    bot.on("message", async (msg) => {      
      
        const chatId = String(msg.chat.id);      
      
        if (!msg.text) return;      
      
        const state = installerState[chatId];      
      
        if (!state) return;      
      
        const input = msg.text.trim();      
      
        // =================================================      
        // CANCELAR      
        // =================================================      
      
        if (input === "/cancel") {      
      
            delete installerState[chatId];      
      
            return bot.sendMessage(      
                chatId,      
                "❌ Instalación cancelada."      
            );      
        }      
      
      
        // =================================================      
        // IP      
        // =================================================      
      
        if (state.step === "WAIT_IP") {      
      
            state.host = input;      
      
            state.step = "WAIT_USER";      
      
            return bot.sendMessage(      
                chatId,      
`👤 <b>Usuario SSH</b>      
      
Escribe el usuario de la VPS.      
      
Por defecto:      
      
<code>root</code>      
      
Si quieres usar root, simplemente escribe:      
      
<code>root</code>`,      
                {      
                    parse_mode: "HTML"      
                }      
            );      
        }      
      
      
        // =================================================      
        // USUARIO      
        // =================================================      
      
        if (state.step === "WAIT_USER") {      
      
            state.username = input || "root";      
      
            state.step = "WAIT_PASSWORD";      
      
            return bot.sendMessage(      
                chatId,      
`🔐 <b>Contraseña SSH</b>      
      
Escribe la contraseña actual de la VPS.      
      
⚠️ No se guardará en Firebase.      
⚠️ Solo permanecerá en memoria mientras se realiza la conexión.      
      
━━━━━━━━━━━━━━━━━━      
      
Escribe /cancel para cancelar.`,      
                {      
                    parse_mode: "HTML"      
                }      
            );      
        }      
      
      
        // =================================================      
        // CONTRASEÑA      
        // =================================================      
      
   if (state.step === "WAIT_PASSWORD") {
    state.password = input;

    state.step = "WAIT_DOMAIN";

    return bot.sendMessage(
        chatId,
`🌐 <b>Dominio de la VPS</b>

━━━━━━━━━━━━━━━━━━

Escribe el dominio que apunta a esta VPS.

Ejemplo:

<code>vpn.midominio.com</code>

━━━━━━━━━━━━━━━━━━

❌ /cancel para cancelar.`,
        {
            parse_mode: "HTML"
        }
    );
}


if (state.step === "WAIT_DOMAIN") {

    state.domain = input;

    const host = state.host;
    const username = state.username || "root";
    const password = state.password;
    const domain = state.domain;

    delete installerState[chatId];

    await bot.sendMessage(
        chatId,
`⏳ <b>Preparando instalación...</b>

🌐 VPS: <code>${escapeHtml(host)}</code>
👤 Usuario: <code>${escapeHtml(username)}</code>
🌐 Dominio: <code>${escapeHtml(domain)}</code>

━━━━━━━━━━━━━━━━━━

🔐 Conectando por SSH...`,
        {
            parse_mode: "HTML"
        }
    );

    try {

        const userSnap = await db.ref(`users/${chatId}`).get();

        if (!userSnap.exists()) {
            return bot.sendMessage(chatId, "❌ Usuario no encontrado.");
        }

        const user = userSnap.val();

        const key = generateKey();
        const created = Date.now();
        const deleteAt = created + (2 * 60 * 60 * 1000);

        await db.ref(`keys/${key}`).set({
            key,
            owner: chatId,
            reseller: user.reseller || "",
            used: false,
            created,
            deleteAt,
            usedBy: "",
            usedAt: ""
        });

        await db.ref(`history/${chatId}`).push({
            type: "KEY_GENERADA",
            value: key,
            time: Date.now()
        });

        await bot.sendMessage(
            chatId,
`🔑 <b>KEY GENERADA</b>

<code>${key}</code>

🌐 Dominio:
<code>${escapeHtml(domain)}</code>

━━━━━━━━━━━━━━━━━━

🚀 Instalando...`,
            {
                parse_mode: "HTML"
            }
        );

        const command =
`export INSTALL_KEY='${key}';
export SERVER_DOMAIN='${domain}';
bash <(curl -fsSL '${INSTALLER_URL}')`;

        const result = await sshExec({
            host,
            username,
            password,
            command
        });

        if (result.code !== 0) {

            await db.ref(`history/${chatId}`).push({
                type: "INSTALACION_ERROR",
                value: host,
                domain,
                key,
                time: Date.now(),
                error: result.errorOutput || result.output
            });

            return bot.sendMessage(
                chatId,
`❌ <b>La instalación falló.</b>

🌐 VPS:
<code>${escapeHtml(host)}</code>

🌐 Dominio:
<code>${escapeHtml(domain)}</code>

🔑 Key:
<code>${escapeHtml(key)}</code>

Código:
<code>${result.code}</code>`,
                {
                    parse_mode: "HTML"
                }
            );
        }

        const installationRef =
            db.ref(`installations/${chatId}`).push();

        await installationRef.set({
            id: installationRef.key,
            owner: chatId,
            reseller: user.reseller || "",
            host,
            username,
            domain,
            key,
            status: "COMPLETED",
            createdAt: created,
            completedAt: Date.now()
        });

        await db.ref(`history/${chatId}`).push({
            type: "INSTALACION_COMPLETADA",
            value: host,
            domain,
            key,
            time: Date.now()
        });

        await bot.sendMessage(
            chatId,
`✅ <b>INSTALACIÓN COMPLETADA</b>

━━━━━━━━━━━━━━━━━━

🌐 VPS:
<code>${escapeHtml(host)}</code>

👤 Usuario:
<code>${escapeHtml(username)}</code>

🌐 Dominio:
<code>${escapeHtml(domain)}</code>

🔑 Key:
<code>${escapeHtml(key)}</code>

━━━━━━━━━━━━━━━━━━

🟢 KevinTech Multi Script instalado.

Escribe <code>menu</code> en la VPS.`,
            {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "📜 Historial",
                                callback_data: "menu_history"
                            }
                        ],
                        [
                            {
                                text: "🏠 Inicio",
                                callback_data: "menu_home"
                            }
                        ]
                    ]
                }
            }
        );

        await db.ref(`keys/${key}`).remove();

    } catch (err) {

        console.log("INSTALLER ERROR:", err);

        await db.ref(`history/${chatId}`).push({
            type: "INSTALACION_ERROR",
            value: host,
            domain,
            time: Date.now(),
            error: err.message
        });

        await bot.sendMessage(
            chatId,
`❌ <b>No se pudo instalar la VPS.</b>

🌐 VPS:
<code>${escapeHtml(host)}</code>

🌐 Dominio:
<code>${escapeHtml(domain)}</code>

Error:
<code>${escapeHtml(err.message)}</code>`,
            {
                parse_mode: "HTML"
            }
        );
    }
}
