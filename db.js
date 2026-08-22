import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const DATA_DIR = path.resolve(process.env.DATA_DIR || "./data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const dbFile = path.join(DATA_DIR, "bot.db");
const sqlite = new Database(dbFile);

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("busy_timeout = 5000");
sqlite.pragma("synchronous = NORMAL");

sqlite.exec(`
CREATE TABLE IF NOT EXISTS kv (
  path TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_kv_path ON kv(path);
`);

const clean = (p) => String(p ?? "").replace(/^\/+|\/+$/g, "");

function parse(value) {
  try { return JSON.parse(value); }
  catch { return value; }
}

function readTree(pathName) {
  const p = clean(pathName);
  const exact = sqlite.prepare("SELECT value FROM kv WHERE path=?").get(p);
  const prefix = p ? `${p}/` : "";
  const rows = sqlite.prepare(
    "SELECT path,value FROM kv WHERE path LIKE ?"
  ).all(`${prefix}%`);

  if (!exact && rows.length === 0) return null;
  if (exact && rows.length === 0) return parse(exact.value);

  const result = exact ? parse(exact.value) : {};

  for (const row of rows) {
    const relative = prefix
      ? row.path.slice(prefix.length)
      : row.path;

    if (!relative) continue;

    const parts = relative.split("/");
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      if (
        !current[parts[i]] ||
        typeof current[parts[i]] !== "object" ||
        Array.isArray(current[parts[i]])
      ) {
        current[parts[i]] = {};
      }

      current = current[parts[i]];
    }

    current[parts.at(-1)] = parse(row.value);
  }

  return result;
}

function deleteTree(pathName) {
  const p = clean(pathName);

  if (!p) {
    sqlite.prepare("DELETE FROM kv").run();
    return;
  }

  sqlite.prepare(
    "DELETE FROM kv WHERE path=? OR path LIKE ?"
  ).run(p, `${p}/%`);
}

function flatten(value, base) {
  if (value === undefined) return [];

  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return [[base, JSON.stringify(value)]];
  }

  const entries = Object.entries(value);

  if (!entries.length) {
    return [[base, JSON.stringify(value)]];
  }

  const rows = [];

  for (const [key, child] of entries) {
    rows.push(
      ...flatten(child, base ? `${base}/${key}` : key)
    );
  }

  return rows;
}

function writeTree(pathName, value) {
  const p = clean(pathName);

  deleteTree(p);

  const rows = flatten(value, p);

  const statement = sqlite.prepare(
    "INSERT OR REPLACE INTO kv(path,value) VALUES (?,?)"
  );

  const transaction = sqlite.transaction(() => {
    for (const [key, value] of rows) {
      statement.run(key, value);
    }
  });

  transaction();
}

class Snapshot {
  constructor(pathName, value, key = null) {
    this._path = clean(pathName);
    this._value = value;
    this.key =
      key ??
      (this._path ? this._path.split("/").at(-1) : null);
  }

  exists() {
    return this._value !== null &&
           this._value !== undefined;
  }

  val() {
    return this._value;
  }

  forEach(callback) {
    if (
      !this.exists() ||
      typeof this._value !== "object" ||
      Array.isArray(this._value)
    ) {
      return false;
    }

    for (const [key, value] of Object.entries(this._value)) {
      const childPath =
        this._path ? `${this._path}/${key}` : key;

      if (
        callback(
          new Snapshot(childPath, value, key)
        ) === true
      ) {
        return true;
      }
    }

    return false;
  }

  get ref() {
    return new Ref(this._path);
  }
}

class Ref {
  constructor(pathName) {
    this.path = clean(pathName);
  }

  child(name) {
    return new Ref(
      this.path ? `${this.path}/${name}` : String(name)
    );
  }

  async get() {
    return new Snapshot(
      this.path,
      readTree(this.path)
    );
  }

  async set(value) {
    writeTree(this.path, value);
  }

  async update(patch) {
    const current = readTree(this.path);

    const base =
      current &&
      typeof current === "object" &&
      !Array.isArray(current)
        ? current
        : {};

    writeTree(this.path, {
      ...base,
      ...patch
    });
  }

  async remove() {
    deleteTree(this.path);
  }

  push() {
    const key =
      randomUUID()
        .replace(/-/g, "")
        .slice(0, 20);

    return this.child(key);
  }

  on(event, callback) {
    if (event !== "child_added") {
      throw new Error(
        `Evento no soportado por SQLite: ${event}`
      );
    }

    const seen = new Set();

    const scan = async () => {
      const snapshot = await this.get();

      if (!snapshot.exists()) return;

      await snapshot.forEach(async child => {
        if (seen.has(child.key)) return;

        seen.add(child.key);
        await callback(child);
      });
    };

    scan().catch(console.error);

    const timer = setInterval(
      () => scan().catch(console.error),
      2000
    );

    return () => clearInterval(timer);
  }
}

const db = {
  ref(pathName = "") {
    return new Ref(pathName);
  },

  sqlite,
  file: dbFile
};

console.log(`🗄️ SQLite: ${dbFile}`);

export default db;
