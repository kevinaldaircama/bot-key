import express from "express";
import crypto from "crypto";
import db from "./db.js";

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

const HOST = process.env.LICENSE_API_HOST || "127.0.0.1";
const PORT = Number(process.env.LICENSE_API_PORT || 8787);
const API_KEY = String(process.env.LICENSE_API_KEY || "");

if (API_KEY.length < 32) {
  console.error(
    "❌ LICENSE_API_KEY debe tener al menos 32 caracteres."
  );
  process.exit(1);
}

function secureEqual(a, b) {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));

  return (
    x.length === y.length &&
    crypto.timingSafeEqual(x, y)
  );
}

function auth(req, res, next) {
  const supplied = req.get("X-License-API-Key");

  if (!secureEqual(supplied, API_KEY)) {
    return res.status(401).json({
      ok: false,
      error: "unauthorized"
    });
  }

  next();
}

function expired(data) {
  const deleteAt = Number(data?.deleteAt || 0);

  return deleteAt > 0 && Date.now() >= deleteAt;
}

async function findKey(key) {
  return db.ref(`keys/${key}`).get();
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "kevintech-license-api"
  });
});

app.get("/api/keys/:key", auth, async (req, res) => {
  try {
    const key = String(req.params.key || "").trim();

    if (!key) {
      return res.status(400).json({
        ok: false,
        error: "key_required"
      });
    }

    const snapshot = await findKey(key);

    if (!snapshot.exists()) {
      return res.status(404).json({
        ok: false,
        error: "key_not_found"
      });
    }

    const data = snapshot.val();

    if (data.used === true) {
      return res.status(409).json({
        ok: false,
        error: "key_used"
      });
    }

    if (expired(data)) {
      await db.ref(`keys/${key}`).remove();

      return res.status(410).json({
        ok: false,
        error: "key_expired"
      });
    }

    return res.json({
      ok: true,
      key: data.key || key,
      owner: data.owner || "",
      reseller: data.reseller || "",
      type: data.type || "normal",
      deleteAt: data.deleteAt || null
    });

  } catch (error) {
    console.error("GET /api/keys:", error);

    res.status(500).json({
      ok: false,
      error: "server_error"
    });
  }
});

app.post("/api/activations", auth, async (req, res) => {
  try {
    const body = req.body || {};

    const key =
      String(body.token || body.key || "").trim();

    if (!key) {
      return res.status(400).json({
        ok: false,
        error: "key_required"
      });
    }

    const snapshot = await findKey(key);

    if (!snapshot.exists()) {
      return res.status(404).json({
        ok: false,
        error: "key_not_found"
      });
    }

    const data = snapshot.val();

    if (data.used === true) {
      return res.status(409).json({
        ok: false,
        error: "key_used"
      });
    }

    if (expired(data)) {
      await db.ref(`keys/${key}`).remove();

      return res.status(410).json({
        ok: false,
        error: "key_expired"
      });
    }

    const activation = {
      owner: body.owner || data.owner || "",
      reseller: body.reseller || data.reseller || "",
      token: key,
      ip: body.ip || "",
      hostname: body.hostname || "",
      os: body.os || "",
      date: body.date || new Date().toISOString(),
      notified: false,
      createdAt: Date.now()
    };

    const activationRef =
      db.ref("activations").push();

    await activationRef.set(activation);

    await db.ref(`keys/${key}`).update({
      used: true,
      usedBy: body.ip || body.hostname || "unknown",
      usedAt: Date.now()
    });

    return res.status(201).json({
      ok: true,
      activationId: activationRef.key
    });

  } catch (error) {
    console.error("POST /api/activations:", error);

    res.status(500).json({
      ok: false,
      error: "server_error"
    });
  }
});

app.get("/api/status", auth, async (_req, res) => {
  try {
    const users = await db.ref("users").get();
    const keys = await db.ref("keys").get();
    const activations = await db.ref("activations").get();

    res.json({
      ok: true,
      database: db.file,
      users: users.exists()
        ? Object.keys(users.val() || {}).length
        : 0,
      keys: keys.exists()
        ? Object.keys(keys.val() || {}).length
        : 0,
      activations: activations.exists()
        ? Object.keys(activations.val() || {}).length
        : 0
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      error: "server_error"
    });
  }
});

app.use((_req, res) => {
  res.status(404).json({
    ok: false,
    error: "not_found"
  });
});

app.listen(PORT, HOST, () => {
  console.log(
    `🔐 License API escuchando en http://${HOST}:${PORT}`
  );
});
