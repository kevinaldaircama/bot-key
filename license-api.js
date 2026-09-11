import "dotenv/config";

import express from "express";
import crypto from "crypto";
import db from "./db.js";

const app = express();

app.disable("x-powered-by");

app.use(
  express.json({
    limit: "32kb"
  })
);

// =========================================================
// CONFIGURACIÓN
// =========================================================

const HOST =
  String(
    process.env.LICENSE_API_HOST ||
      "127.0.0.1"
  ).trim();

const PORT =
  Number(
    process.env.LICENSE_API_PORT ||
      8787
  );

const API_KEY =
  String(
    process.env.LICENSE_API_KEY ||
      ""
  ).trim();

// =========================================================
// VALIDACIÓN DE CONFIGURACIÓN
// =========================================================

if (!API_KEY) {
  console.error(
    "❌ LICENSE_API_KEY no está configurada."
  );

  process.exit(1);
}

if (API_KEY.length < 32) {
  console.error(
    `❌ LICENSE_API_KEY es demasiado corta (${API_KEY.length}/32).`
  );

  process.exit(1);
}

if (
  !Number.isInteger(PORT) ||
  PORT < 1 ||
  PORT > 65535
) {
  console.error(
    `❌ LICENSE_API_PORT inválido: ${PORT}`
  );

  process.exit(1);
}

// =========================================================
// INFORMACIÓN DE INICIO
// =========================================================

console.log(
  `🔑 LICENSE_API_KEY cargada (${API_KEY.length} caracteres)`
);

// =========================================================
// COMPARACIÓN SEGURA
// =========================================================

function secureEqual(a, b) {
  const x = Buffer.from(
    String(a || ""),
    "utf8"
  );

  const y = Buffer.from(
    String(b || ""),
    "utf8"
  );

  if (x.length !== y.length) {
    return false;
  }

  return crypto.timingSafeEqual(x, y);
}

// =========================================================
// AUTENTICACIÓN PRIVADA
// =========================================================

function auth(req, res, next) {
  const supplied =
    req.get("X-License-API-Key") || "";

  if (!secureEqual(supplied, API_KEY)) {
    return res.status(401).json({
      ok: false,
      error: "unauthorized"
    });
  }

  next();
}

// =========================================================
// EXPIRACIÓN
// =========================================================

function expired(data) {
  const deleteAt =
    Number(
      data?.deleteAt || 0
    );

  return (
    deleteAt > 0 &&
    Date.now() >= deleteAt
  );
}

// =========================================================
// BUSCAR KEY
// =========================================================

async function findKey(key) {
  return db
    .ref(`keys/${key}`)
    .get();
}

// =========================================================
// HEALTH CHECK
// =========================================================

app.get(
  "/health",
  (_req, res) => {
    res.json({
      ok: true,
      service:
        "kevintech-license-api"
    });
  }
);

// =========================================================
// API PRIVADA - CONSULTAR KEY
// =========================================================

app.get(
  "/api/keys/:key",
  auth,
  async (req, res) => {
    try {
      const key =
        String(
          req.params.key || ""
        ).trim();

      if (!key) {
        return res.status(400).json({
          ok: false,
          error: "key_required"
        });
      }

      const snapshot =
        await findKey(key);

      if (!snapshot.exists()) {
        return res.status(404).json({
          ok: false,
          error: "key_not_found"
        });
      }

      const data =
        snapshot.val();

      // KEY UTILIZADA
      if (data.used === true) {
        return res.status(409).json({
          ok: false,
          error: "key_used"
        });
      }

      // KEY EXPIRADA
      if (expired(data)) {
        await db
          .ref(`keys/${key}`)
          .remove();

        return res.status(410).json({
          ok: false,
          error: "key_expired"
        });
      }

      // KEY VÁLIDA
      return res.json({
        ok: true,

        key:
          data.key || key,

        owner:
          data.owner || "",

        reseller:
          data.reseller || "",

        type:
          data.type || "normal",

        deleteAt:
          data.deleteAt || null
      });

    } catch (error) {
      console.error(
        "GET /api/keys:",
        error
      );

      return res.status(500).json({
        ok: false,
        error: "server_error"
      });
    }
  }
);

// =========================================================
// API PRIVADA - ACTIVAR KEY
// =========================================================

app.post(
  "/api/activations",
  auth,
  async (req, res) => {
    try {
      const body =
        req.body || {};

      const key =
        String(
          body.token ||
            body.key ||
            ""
        ).trim();

      if (!key) {
        return res.status(400).json({
          ok: false,
          error: "key_required"
        });
      }

      const snapshot =
        await findKey(key);

      if (!snapshot.exists()) {
        return res.status(404).json({
          ok: false,
          error: "key_not_found"
        });
      }

      const data =
        snapshot.val();

      // KEY UTILIZADA
      if (data.used === true) {
        return res.status(409).json({
          ok: false,
          error: "key_used"
        });
      }

      // KEY EXPIRADA
      if (expired(data)) {
        await db
          .ref(`keys/${key}`)
          .remove();

        return res.status(410).json({
          ok: false,
          error: "key_expired"
        });
      }

      // ===================================================
      // REGISTRAR ACTIVACIÓN
      // ===================================================

      const activation = {
        owner:
          body.owner ||
          data.owner ||
          "",

        reseller:
          body.reseller ||
          data.reseller ||
          "",

        token:
          key,

        ip:
          body.ip || "",

        hostname:
          body.hostname || "",

        os:
          body.os || "",

        date:
          body.date ||
          new Date().toISOString(),

        notified:
          false,

        createdAt:
          Date.now()
      };

      const activationRef =
        db
          .ref("activations")
          .push();

      await activationRef.set(
        activation
      );

      // ===================================================
      // MARCAR KEY COMO UTILIZADA
      // ===================================================

      await db
        .ref(`keys/${key}`)
        .update({
          used: true,

          usedBy:
            body.ip ||
            body.hostname ||
            "unknown",

          usedAt:
            Date.now()
        });

      return res.status(201).json({
        ok: true,

        activationId:
          activationRef.key
      });

    } catch (error) {
      console.error(
        "POST /api/activations:",
        error
      );

      return res.status(500).json({
        ok: false,
        error: "server_error"
      });
    }
  }
);

// =========================================================
// API PÚBLICA - VALIDAR KEY
// =========================================================
//
// Instalador:
//
// POST /api/public/validate
//
// Body:
//
// {
//   "key": "XXXX"
// }
//
// =========================================================

app.post(
  "/api/public/validate",
  async (req, res) => {
    try {
      const key =
        String(
          req.body?.key || ""
        ).trim();

      if (!key) {
        return res.status(400).json({
          ok: false,
          error: "key_required"
        });
      }

      const snapshot =
        await findKey(key);

      if (!snapshot.exists()) {
        return res.status(404).json({
          ok: false,
          error: "key_not_found"
        });
      }

      const data =
        snapshot.val();

      // ===================================================
      // KEY UTILIZADA
      // ===================================================

      if (data.used === true) {
        return res.status(409).json({
          ok: false,
          error: "key_used"
        });
      }

      // ===================================================
      // KEY EXPIRADA
      // ===================================================

      if (expired(data)) {
        await db
          .ref(`keys/${key}`)
          .remove();

        return res.status(410).json({
          ok: false,
          error: "key_expired"
        });
      }

      // ===================================================
      // KEY VÁLIDA
      // ===================================================

      return res.json({
        ok: true,

        key:
          data.key || key,

        owner:
          data.owner || "",

        reseller:
          data.reseller || "",

        type:
          data.type || "normal",

        deleteAt:
          data.deleteAt || null
      });

    } catch (error) {
      console.error(
        "POST /api/public/validate:",
        error
      );

      return res.status(500).json({
        ok: false,
        error: "server_error"
      });
    }
  }
);

// =========================================================
// API PÚBLICA - ACTIVAR KEY
// =========================================================
//
// Instalador:
//
// POST /api/public/activate
//
// Body:
//
// {
//   "key": "XXXX",
//   "ip": "1.2.3.4",
//   "hostname": "server",
//   "os": "Ubuntu 24.04"
// }
//
// =========================================================

app.post(
  "/api/public/activate",
  async (req, res) => {
    try {
      const body =
        req.body || {};

      const key =
        String(
          body.key || ""
        ).trim();

      if (!key) {
        return res.status(400).json({
          ok: false,
          error: "key_required"
        });
      }

      const snapshot =
        await findKey(key);

      if (!snapshot.exists()) {
        return res.status(404).json({
          ok: false,
          error: "key_not_found"
        });
      }

      const data =
        snapshot.val();

      // ===================================================
      // KEY UTILIZADA
      // ===================================================

      if (data.used === true) {
        return res.status(409).json({
          ok: false,
          error: "key_used"
        });
      }

      // ===================================================
      // KEY EXPIRADA
      // ===================================================

      if (expired(data)) {
        await db
          .ref(`keys/${key}`)
          .remove();

        return res.status(410).json({
          ok: false,
          error: "key_expired"
        });
      }

      // ===================================================
      // REGISTRAR ACTIVACIÓN
      // ===================================================

      const activation = {
        owner:
          data.owner || "",

        reseller:
          data.reseller || "",

        token:
          key,

        ip:
          body.ip || "",

        hostname:
          body.hostname || "",

        os:
          body.os || "",

        date:
          new Date().toISOString(),

        notified:
          false,

        createdAt:
          Date.now()
      };

      const activationRef =
        db
          .ref("activations")
          .push();

      await activationRef.set(
        activation
      );

      // ===================================================
      // MARCAR KEY COMO UTILIZADA
      // ===================================================

      await db
        .ref(`keys/${key}`)
        .update({
          used: true,

          usedBy:
            body.ip ||
            body.hostname ||
            "unknown",

          usedAt:
            Date.now()
        });

      // ===================================================
      // RESPUESTA
      // ===================================================

      return res.status(201).json({
        ok: true,

        activationId:
          activationRef.key,

        owner:
          data.owner || "",

        reseller:
          data.reseller || "",

        type:
          data.type || "normal"
      });

    } catch (error) {
      console.error(
        "POST /api/public/activate:",
        error
      );

      return res.status(500).json({
        ok: false,
        error: "server_error"
      });
    }
  }
);

// =========================================================
// API PRIVADA - ESTADO
// =========================================================

app.get(
  "/api/status",
  auth,
  async (_req, res) => {
    try {
      const users =
        await db
          .ref("users")
          .get();

      const keys =
        await db
          .ref("keys")
          .get();

      const activations =
        await db
          .ref("activations")
          .get();

      return res.json({
        ok: true,

        database:
          db.file,

        users:
          users.exists()
            ? Object.keys(
                users.val() || {}
              ).length
            : 0,

        keys:
          keys.exists()
            ? Object.keys(
                keys.val() || {}
              ).length
            : 0,

        activations:
          activations.exists()
            ? Object.keys(
                activations.val() || {}
              ).length
            : 0
      });

    } catch (error) {
      console.error(
        "GET /api/status:",
        error
      );

      return res.status(500).json({
        ok: false,
        error: "server_error"
      });
    }
  }
);

// =========================================================
// 404
// =========================================================

app.use(
  (_req, res) => {
    res.status(404).json({
      ok: false,
      error: "not_found"
    });
  }
);

// =========================================================
// MANEJO DE ERROR DEL SERVIDOR
// =========================================================

const server =
  app.listen(
    PORT,
    HOST,
    () => {
      console.log(
        "========================================"
      );

      console.log(
        "      🔐 KEVINTECH LICENSE API"
      );

      console.log(
        "========================================"
      );

      console.log(
        `🌐 Host: ${HOST}`
      );

      console.log(
        `🔌 Puerto: ${PORT}`
      );

      console.log(
        `🗄️ Base de datos: ${db.file}`
      );

      console.log(
        "🔑 API KEY: configurada"
      );

      console.log(
        "========================================"
      );

      console.log(
        `🔐 License API escuchando en http://${HOST}:${PORT}`
      );

      console.log(
        "========================================"
      );
    }
  );

// =========================================================
// ERROR LISTENER
// =========================================================

server.on(
  "error",
  (error) => {
    console.error(
      "❌ License API server error:",
      error
    );
  }
);

// =========================================================
// ERRORES DE PROCESO
// =========================================================

process.on(
  "unhandledRejection",
  (error) => {
    console.error(
      "❌ License API unhandled rejection:",
      error
    );
  }
);