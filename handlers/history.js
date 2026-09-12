import db from "../db.js";
import config from "../config.js";
import { getStaffRole } from "./audit.js";

// ============================================================
// FORMATO DE FECHA
// ============================================================

function formatDate(ts) {

const value = Number(ts || 0);

if (!value) {
    return "Fecha desconocida";
}

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
    return "Fecha desconocida";
}

return date.toLocaleString("es-PE", {
    timeZone: "America/Lima",
    hour12: false,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
});

}

// ============================================================
// ESCAPAR HTML
// ============================================================

function escapeHtml(value = "") {

return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

// ============================================================
// OBTENER TIMESTAMP
// ============================================================

function getTime(item = {}) {

return Number(
    item.time ||
    item.createdAt ||
    item.created ||
    item.updatedAt ||
    item.revokedAt ||
    item.deletedAt ||
    item.usedAt ||
    item.timestamp ||
    0
);

}

// ============================================================
// AGREGAR ELEMENTOS DE SNAPSHOT
// ============================================================

function collectSnapshot(snapshot, target, options = {}) {

if (!snapshot || !snapshot.exists()) {
    return;
}

snapshot.forEach((child) => {

    const value = child.val();

    if (
        value === null ||
        value === undefined
    ) {
        return;
    }

    if (
        typeof value !== "object"
    ) {
        return;
    }

    if (
        options.filter &&
        !options.filter(value, child.key)
    ) {
        return;
    }

    target.push({
        id: child.key,

        ...value,

        time: getTime(value),

        source:
            options.source ||
            "unknown"
    });

});

}

// ============================================================
// AGREGAR EVENTO
// ============================================================

function addEvent(
target,
{
id = "",
type = "EVENTO",
action = "",
chatId = "",
username = "",
role = "",
key = "",
domain = "",
targetDomain = "",
details = "",
time = 0,
source = ""
}
) {

target.push({

    id,
    type,
    action,

    chatId:
        String(chatId || ""),

    username:
        username || "",

    role:
        role || "",

    key:
        key || "",

    domain:
        domain || "",

    target:
        targetDomain || "",

    details:
        details || "",

    time:
        Number(time || 0),

    source

});

}

// ============================================================
// NORMALIZAR AUDIT
// ============================================================

function parseAuditEvent(item, target) {

const action =
    String(
        item.action ||
        item.type ||
        "EVENTO"
    ).toUpperCase();

const details =
    String(
        item.details ||
        ""
    );

// --------------------------------------------------------
// KEY REVOCADA
// --------------------------------------------------------

if (
    details.startsWith("key_revoke:")
) {

    const key =
        details
            .substring("key_revoke:".length)
            .trim();

    addEvent(
        target,
        {
            id: item.id,
            type: "KEY_REVOCADA",
            chatId: item.chatId,
            username: item.username,
            role: item.role,
            key,
            details: "Key revocada",
            time: item.createdAt,
            source: "audit"
        }
    );

    return;
}


// --------------------------------------------------------
// DOMINIO ELIMINADO
// --------------------------------------------------------

if (
    details.startsWith("domain_delete_")
) {

    const domainKey =
        details.substring(
            "domain_delete_".length
        );

    addEvent(
        target,
        {
            id: item.id,
            type: "DOMINIO_ELIMINADO",
            chatId: item.chatId,
            username: item.username,
            role: item.role,
            domain: domainKey,
            details: "Dominio eliminado",
            time: item.createdAt,
            source: "audit"
        }
    );

    return;
}


// --------------------------------------------------------
// DOMINIO NS ELIMINADO
// --------------------------------------------------------

if (
    details.startsWith("domain_ns_delete_")
) {

    const ns =
        details.substring(
            "domain_ns_delete_".length
        );

    addEvent(
        target,
        {
            id: item.id,
            type: "NS_ELIMINADO",
            chatId: item.chatId,
            username: item.username,
            role: item.role,
            domain: ns,
            details: "Registro NS eliminado",
            time: item.createdAt,
            source: "audit"
        }
    );

    return;
}


// --------------------------------------------------------
// BOTÓN GENÉRICO
// --------------------------------------------------------

if (
    action === "BOTÓN"
) {

    addEvent(
        target,
        {
            id: item.id,
            type: "BOTON",
            chatId: item.chatId,
            username: item.username,
            role: item.role,
            details,
            time: item.createdAt,
            source: "audit"
        }
    );

    return;
}


// --------------------------------------------------------
// COMANDO
// --------------------------------------------------------

if (
    action === "COMANDO"
) {

    addEvent(
        target,
        {
            id: item.id,
            type: "COMANDO",
            chatId: item.chatId,
            username: item.username,
            role: item.role,
            details,
            time: item.createdAt,
            source: "audit"
        }
    );

    return;
}


// --------------------------------------------------------
// OTRO
// --------------------------------------------------------

addEvent(
    target,
    {
        id: item.id,
        type: action,
        chatId: item.chatId,
        username: item.username,
        role: item.role,
        details,
        time: item.createdAt,
        source: "audit"
    }
);

}

// ============================================================
// CARGAR KEYS
// ============================================================

async function loadKeys(
chatId,
isStaff,
events
) {

try {

    const snapshot =
        await db.ref("keys").get();

    if (
        !snapshot.exists()
    ) {
        return;
    }

    snapshot.forEach((child) => {

        const keyData =
            child.val() || {};

        const owner =
            String(
                keyData.owner ??
                keyData.chatId ??
                ""
            );

        if (
            !isStaff &&
            owner !== chatId
        ) {
            return;
        }

        const key =
            String(
                keyData.key ||
                child.key
            );

        const created =
            Number(
                keyData.createdAt ||
                keyData.created ||
                0
            );

        const used =
            Boolean(
                keyData.used
            );

        const active =
            keyData.active !== false;

        const revoked =
            Boolean(
                keyData.revokedAt ||
                keyData.revoked
            );

        // ------------------------------------------------
        // KEY REVOCADA
        // ------------------------------------------------

        if (
            revoked ||
            !active
        ) {

            addEvent(
                events,
                {
                    id:
                        `key-revoked-${child.key}`,

                    type:
                        "KEY_REVOCADA",

                    chatId:
                        owner,

                    key,

                    details:
                        "Key inactiva/revocada",

                    time:
                        Number(
                            keyData.revokedAt ||
                            keyData.deletedAt ||
                            created
                        ),

                    source:
                        "keys"
                }
            );

            return;
        }


        // ------------------------------------------------
        // KEY CREADA
        // ------------------------------------------------

        addEvent(
            events,
            {
                id:
                    `key-created-${child.key}`,

                type:
                    "KEY_CREADA",

                chatId:
                    owner,

                key,

                details:
                    used
                        ? "Key creada y utilizada"
                        : "Key creada",

                time:
                    created,

                source:
                    "keys"
            }
        );


        // ------------------------------------------------
        // KEY UTILIZADA
        // ------------------------------------------------

        if (
            used &&
            keyData.usedAt
        ) {

            addEvent(
                events,
                {
                    id:
                        `key-used-${child.key}`,

                    type:
                        "KEY_UTILIZADA",

                    chatId:
                        owner,

                    key,

                    details:
                        keyData.usedBy
                            ? `Utilizada por ${keyData.usedBy}`
                            : "Key utilizada",

                    time:
                        Number(
                            keyData.usedAt
                        ),

                    source:
                        "keys"
                }
            );
        }

    });

} catch (error) {

    console.error(
        "History keys:",
        error
    );

}

}

// ============================================================
// CARGAR DOMINIOS
// ============================================================

async function loadDomains(
chatId,
isStaff,
events
) {

try {

    const snapshot =
        await db.ref("domains").get();

    if (
        !snapshot.exists()
    ) {
        return;
    }

    snapshot.forEach((userNode) => {

        const ownerId =
            String(
                userNode.key
            );

        if (
            !isStaff &&
            ownerId !== chatId
        ) {
            return;
        }

        const userDomains =
            userNode.val() || {};


        // =================================================
        // DOMINIOS A
        // =================================================

        const domainsA =
            userDomains;

        for (
            const [key, value]
            of Object.entries(domainsA)
        ) {

            if (
                key === "ns"
            ) {
                continue;
            }

            if (
                !value ||
                typeof value !== "object"
            ) {
                continue;
            }

            const domain =
                value.domain ||
                value.name ||
                key;

            const ip =
                value.ip ||
                value.content ||
                "";

            const created =
                Number(
                    value.createdAt ||
                    value.created ||
                    0
                );

            addEvent(
                events,
                {
                    id:
                        `domain-a-${ownerId}-${key}`,

                    type:
                        "DOMINIO_A",

                    chatId:
                        ownerId,

                    domain,

                    details:
                        ip
                            ? `Apunta a ${ip}`
                            : "Registro A creado",

                    time:
                        created,

                    source:
                        "domains"
                }
            );

        }


        // =================================================
        // DOMINIOS NS
        // =================================================

        const nsRecords =
            userDomains.ns || {};

        for (
            const [key, value]
            of Object.entries(nsRecords)
        ) {

            if (
                !value ||
                typeof value !== "object"
            ) {
                continue;
            }

            const domain =
                value.domain ||
                value.name ||
                key;

            const target =
                value.target ||
                value.content ||
                "";

            const created =
                Number(
                    value.createdAt ||
                    value.created ||
                    0
                );

            addEvent(
                events,
                {
                    id:
                        `domain-ns-${ownerId}-${key}`,

                    type:
                        "DOMINIO_NS",

                    chatId:
                        ownerId,

                    domain,

                    targetDomain:
                        target,

                    details:
                        target
                            ? `Apunta hacia ${target}`
                            : "Registro NS creado",

                    time:
                        created,

                    source:
                        "domains"
                }
            );

        }

    });

} catch (error) {

    console.error(
        "History domains:",
        error
    );

}

}

// ============================================================
// CARGAR HISTORY ANTIGUO
// ============================================================

async function loadLegacyHistory(
chatId,
isStaff,
events
) {

try {

    if (isStaff) {

        const snapshot =
            await db.ref("history").get();

        if (
            snapshot.exists()
        ) {

            snapshot.forEach(
                (userNode) => {

                    const ownerId =
                        String(
                            userNode.key
                        );

                    collectSnapshot(
                        userNode,
                        events,
                        {
                            source:
                                "history",

                            filter:
                                () => true
                        }
                    );

                    // Corregir propietario
                    const lastItems =
                        events.filter(
                            item =>
                                item.source ===
                                "history" &&
                                !item.chatId
                        );

                    for (
                        const item
                        of lastItems
                    ) {

                        item.chatId =
                            ownerId;
                    }

                }
            );

        }

    } else {

        const snapshot =
            await db
                .ref(`history/${chatId}`)
                .get();

        collectSnapshot(
            snapshot,
            events,
            {
                source:
                    "history"
            }
        );

    }

} catch (error) {

    console.error(
        "History legacy:",
        error
    );

}

}

// ============================================================
// CARGAR KEY HISTORY
// ============================================================

async function loadKeyHistory(
chatId,
isStaff,
events
) {

try {

    const snapshot =
        await db.ref("keyHistory").get();

    if (
        !snapshot.exists()
    ) {
        return;
    }

    collectSnapshot(
        snapshot,
        events,
        {
            source:
                "keyHistory",

            filter:
                (value) => {

                    if (
                        isStaff
                    ) {
                        return true;
                    }

                    return (
                        String(
                            value.chatId ||
                            value.owner ||
                            ""
                        ) === chatId
                    );

                }
        }
    );

} catch (error) {

    console.error(
        "History keyHistory:",
        error
    );

}

}

// ============================================================
// CARGAR AUDIT HISTORY
// ============================================================

async function loadAuditHistory(
chatId,
isStaff,
events
) {

if (
    !isStaff
) {
    return;
}

try {

    const snapshot =
        await db
            .ref("auditHistory")
            .get();

    if (
        !snapshot.exists()
    ) {
        return;
    }

    snapshot.forEach(
        (child) => {

            const value =
                child.val();

            if (
                !value ||
                typeof value !== "object"
            ) {
                return;
            }

            parseAuditEvent(
                {
                    id:
                        child.key,

                    ...value
                },
                events
            );

        }
    );

} catch (error) {

    console.error(
        "History audit:",
        error
    );

}

}

// ============================================================
// DEDUPLICAR
// ============================================================

function deduplicate(events) {

const map =
    new Map();

for (
    const event
    of events
) {

    const signature =
        [
            event.type || "",
            event.chatId || "",
            event.key || "",
            event.domain || "",
            event.target || "",
            event.details || "",
            event.time || 0
        ].join("|");

    if (
        !map.has(signature)
    ) {

        map.set(
            signature,
            event
        );

    }

}

return [
    ...map.values()
];

}

// ============================================================
// ICONO DEL EVENTO
// ============================================================

function eventIcon(type) {

const value =
    String(
        type || ""
    ).toUpperCase();

if (
    value.includes("KEY_CREADA")
) {
    return "🔑";
}

if (
    value.includes("KEY_REVOCADA")
) {
    return "🚫";
}

if (
    value.includes("KEY_UTILIZADA")
) {
    return "✅";
}

if (
    value.includes("DOMINIO_NS")
) {
    return "🧩";
}

if (
    value.includes("NS_ELIMINADO")
) {
    return "🗑️";
}

if (
    value.includes("DOMINIO_A")
) {
    return "🌐";
}

if (
    value.includes("DOMINIO_ELIMINADO")
) {
    return "🗑️";
}

if (
    value.includes("COMANDO")
) {
    return "⌨️";
}

if (
    value.includes("BOTON")
) {
    return "🖱️";
}

return "📌";

}

// ============================================================
// TEXTO DEL EVENTO
// ============================================================

function formatEvent(
event,
isStaff
) {

const type =
    String(
        event.type ||
        event.action ||
        "EVENTO"
    ).toUpperCase();

const icon =
    eventIcon(type);

let text =
    `${icon} <b>${escapeHtml(type)}</b>\n`;


// --------------------------------------------------------
// STAFF
// --------------------------------------------------------

if (
    isStaff &&
    event.username
) {

    text +=
        `   👤 ${escapeHtml(
            event.username
        )}`;

    if (
        event.role
    ) {

        text +=
            ` · ${escapeHtml(
                String(
                    event.role
                ).toUpperCase()
            )}`;

    }

    text += "\n";
}


// --------------------------------------------------------
// KEY
// --------------------------------------------------------

if (
    event.key
) {

    text +=
        `   🔑 <code>${escapeHtml(
            event.key
        )}</code>\n`;
}


// --------------------------------------------------------
// DOMINIO NS
// --------------------------------------------------------

if (
    type === "DOMINIO_NS"
) {

    if (
        event.domain
    ) {

        text +=
            `   🧩 ${escapeHtml(
                event.domain
            )}\n`;
    }

    if (
        event.target
    ) {

        text +=
            `   ➡️ ${escapeHtml(
                event.target
            )}\n`;
    }

}

// --------------------------------------------------------
// DOMINIO A
// --------------------------------------------------------

else if (
    type === "DOMINIO_A"
) {

    if (
        event.domain
    ) {

        text +=
            `   🌐 ${escapeHtml(
                event.domain
            )}\n`;
    }

}

// --------------------------------------------------------
// ELIMINADO
// --------------------------------------------------------

else if (
    type ===
    "DOMINIO_ELIMINADO"
) {

    if (
        event.domain
    ) {

        text +=
            `   🌐 ${escapeHtml(
                event.domain
            )}\n`;
    }

}


// --------------------------------------------------------
// DETALLES
// --------------------------------------------------------

if (
    event.details &&
    !(
        type ===
        "DOMINIO_NS" ||
        type ===
        "DOMINIO_A"
    )
) {

    text +=
        `   ↳ ${escapeHtml(
            event.details
        )}\n`;
}


// --------------------------------------------------------
// FECHA
// --------------------------------------------------------

text +=
    `   🕒 ${formatDate(
        event.time
    )}\n`;

return text;

}

// ============================================================
// REGISTRO PRINCIPAL
// ============================================================

export default function registerHistory(
bot
) {

bot.on(
    "callback_query",
    async (query) => {

        if (
            query.data !==
            "menu_history"
        ) {
            return;
        }

        try {

            await bot.answerCallbackQuery(
                query.id
            );

            const chatId =
                String(
                    query.message.chat.id
                );

            const role =
                await getStaffRole(
                    chatId,
                    config
                );

            const isStaff =
                role === "owner" ||
                role === "admin";

            const events = [];


            // =================================================
            // CARGAR TODO
            // =================================================

            await loadLegacyHistory(
                chatId,
                isStaff,
                events
            );

            await loadKeyHistory(
                chatId,
                isStaff,
                events
            );

            await loadAuditHistory(
                chatId,
                isStaff,
                events
            );

            await loadKeys(
                chatId,
                isStaff,
                events
            );

            await loadDomains(
                chatId,
                isStaff,
                events
            );


            // =================================================
            // DEDUPLICAR
            // =================================================

            const ordered =
                deduplicate(
                    events
                )
                .sort(
                    (a, b) =>
                        Number(
                            b.time || 0
                        ) -
                        Number(
                            a.time || 0
                        )
                )
                .slice(
                    0,
                    isStaff
                        ? 100
                        : 30
                );


            // =================================================
            // CABECERA
            // =================================================

            let text =
                isStaff
                    ? "📜 <b>HISTORIAL GENERAL</b>\n\n"
                    : "📜 <b>MI HISTORIAL</b>\n\n";


            if (
                ordered.length === 0
            ) {

                text +=
                    "━━━━━━━━━━━━━━━━━━\n" +
                    "📭 No hay registros todavía.\n" +
                    "━━━━━━━━━━━━━━━━━━";

            } else {

                text +=
                    `📊 <b>${ordered.length}</b> eventos recientes\n\n`;


                for (
                    const event
                    of ordered
                ) {

                    text +=
                        formatEvent(
                            event,
                            isStaff
                        );

                    text +=
                        "\n";
                }

            }


            // =================================================
            // BOTONES
            // =================================================

            const keyboard = {

                inline_keyboard: [

                    [
                        {
                            text:
                                "🔄 Actualizar",

                            callback_data:
                                "menu_history"
                        }
                    ],

                    [
                        {
                            text:
                                "🔑 Crear Key",

                            callback_data:
                                "menu_key"
                        },

                        {
                            text:
                                "📈 Mi Uso",

                            callback_data:
                                "menu_usage"
                        }
                    ],

                    [
                        {
                            text:
                                "🌐 Dominios",

                            callback_data:
                                "menu_domains"
                        }
                    ],

                    [
                        {
                            text:
                                "🏠 Inicio",

                            callback_data:
                                "menu_home"
                        }
                    ]

                ]

            };


            // =================================================
            // EDITAR MENSAJE
            // =================================================

            await bot.editMessageText(
                text,
                {
                    chat_id:
                        chatId,

                    message_id:
                        query.message.message_id,

                    parse_mode:
                        "HTML",

                    disable_web_page_preview:
                        true,

                    reply_markup:
                        keyboard
                }
            );


        } catch (error) {

            console.error(
                "❌ Error historial:",
                error
            );

            try {

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text:
                            "❌ No se pudo cargar el historial.",

                        show_alert:
                            true
                    }
                );

            } catch {}

        }

    }
);

}