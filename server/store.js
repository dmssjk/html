import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---- parâmetros (espelham src/constants.js) ----
export const RADIUS_METERS = 75; // raio aceito ao redor da sala

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "presenca.db");

fs.mkdirSync(DATA_DIR, { recursive: true });

// ---- banco (SQLite via node:sqlite) ----
const db = new DatabaseSync(DB_FILE);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT PRIMARY KEY,
    owner      TEXT,
    name       TEXT NOT NULL,
    lat        REAL NOT NULL,
    lng        REAL NOT NULL,
    accuracy   REAL,
    open       INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS attendance (
    id         TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    name       TEXT NOT NULL,
    student_id TEXT NOT NULL,
    dist       INTEGER NOT NULL,
    time       TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_owner ON sessions(owner);
`);

// prepared statements
const q = {
  insSession: db.prepare(
    `INSERT INTO sessions (id, owner, name, lat, lng, accuracy, open, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
  ),
  getSession: db.prepare(`SELECT * FROM sessions WHERE id = ?`),
  closeSession: db.prepare(`UPDATE sessions SET open = 0 WHERE id = ?`),
  listByOwner: db.prepare(
    `SELECT s.id, s.name, s.open, s.created_at,
            (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id) AS count
       FROM sessions s WHERE s.owner = ? ORDER BY s.created_at DESC`
  ),
  listAttendance: db.prepare(
    `SELECT id, name, student_id, dist, time FROM attendance
      WHERE session_id = ? ORDER BY created_at ASC`
  ),
  hasStudent: db.prepare(
    `SELECT 1 FROM attendance WHERE session_id = ? AND student_id = ? COLLATE NOCASE LIMIT 1`
  ),
  insAttendance: db.prepare(
    `INSERT INTO attendance (id, session_id, name, student_id, dist, time, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ),
};

// Importa um eventual data/sessions.json (versão antiga) na primeira execução.
function migrateLegacyJson() {
  const { c } = db.prepare(`SELECT COUNT(*) AS c FROM sessions`).get();
  if (c > 0) return;
  const legacy = path.join(DATA_DIR, "sessions.json");
  if (!fs.existsSync(legacy)) return;
  try {
    const arr = JSON.parse(fs.readFileSync(legacy, "utf8"));
    db.exec("BEGIN");
    for (const s of arr) {
      q.insSession.run(s.id, s.owner ?? null, s.name, s.loc.lat, s.loc.lng, s.accuracy ?? 0, s.createdAt ?? Date.now());
      if (!s.open) q.closeSession.run(s.id);
      for (const p of s.present || []) {
        q.insAttendance.run(p.id ?? randomUUID(), s.id, p.name, p.studentId ?? "", p.dist ?? 0, p.time ?? "", p.createdAt ?? Date.now());
      }
    }
    db.exec("COMMIT");
    fs.renameSync(legacy, legacy + ".imported");
    console.log(`Presença: ${arr.length} sessão(ões) importada(s) do JSON antigo.`);
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch { /* noop */ }
    console.error("Presença: falha ao importar JSON antigo:", e.message);
  }
}
migrateLegacyJson();

function distMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ---- views ----
function presentOf(id) {
  return q.listAttendance.all(id).map((r) => ({
    id: r.id,
    name: r.name,
    studentId: r.student_id,
    dist: r.dist,
    time: r.time,
  }));
}

// Visão completa — para o professor (dono da aula): inclui a lista de presença.
function fullView(row) {
  return {
    id: row.id,
    name: row.name,
    open: !!row.open,
    accuracy: row.accuracy,
    present: presentOf(row.id),
  };
}

// Visão pública — para o aluno que abre o link: só o necessário pro formulário.
function publicView(row) {
  return { id: row.id, name: row.name, open: !!row.open };
}

// ---- SSE ----
const subscribers = new Map(); // Map<sessionId, Set<res>>

export function subscribe(id, res) {
  if (!subscribers.has(id)) subscribers.set(id, new Set());
  subscribers.get(id).add(res);
  res.on("close", () => {
    const set = subscribers.get(id);
    if (set) {
      set.delete(res);
      if (set.size === 0) subscribers.delete(id);
    }
  });
}

function emit(id) {
  const set = subscribers.get(id);
  if (!set) return;
  const row = q.getSession.get(id);
  if (!row) return;
  const payload = `data: ${JSON.stringify(fullView(row))}\n\n`;
  for (const res of set) res.write(payload);
}

// ---- operações ----
export function createSession({ name, loc, accuracy, owner }) {
  if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") {
    return { error: "loc" };
  }
  const id = randomUUID();
  q.insSession.run(
    id,
    owner || null,
    (name || "").trim() || "Aula sem nome",
    loc.lat,
    loc.lng,
    Number(accuracy) || 0,
    Date.now()
  );
  return { session: fullView(q.getSession.get(id)) };
}

export function getFull(id) {
  const row = q.getSession.get(id);
  return row ? fullView(row) : null;
}

export function getPublic(id) {
  const row = q.getSession.get(id);
  return row ? publicView(row) : null;
}

export function listSessions(owner) {
  if (!owner) return [];
  return q.listByOwner.all(owner).map((r) => ({
    id: r.id,
    name: r.name,
    open: !!r.open,
    createdAt: r.created_at,
    count: r.count,
  }));
}

export function closeSession(id) {
  const row = q.getSession.get(id);
  if (!row) return null;
  q.closeSession.run(id);
  emit(id);
  return fullView(q.getSession.get(id));
}

export function checkin({ sessionId, name, studentId, loc }) {
  if (!name || !name.trim()) return { error: "name" };
  if (!studentId || !studentId.trim()) return { error: "studentId" };
  if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") {
    return { error: "loc" };
  }
  const row = q.getSession.get(sessionId);
  if (!row || !row.open) return { error: "closed" };

  const dist = Math.round(distMeters({ lat: row.lat, lng: row.lng }, loc));
  if (dist > RADIUS_METERS) return { error: "distance", dist };

  // Dedup pela matrícula (identidade estável) — dois "João" não colidem.
  const matricula = studentId.trim();
  if (q.hasStudent.get(sessionId, matricula)) {
    return { ok: true, dist, already: true };
  }

  q.insAttendance.run(
    randomUUID(),
    sessionId,
    name.trim(),
    matricula,
    dist,
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    Date.now()
  );
  emit(sessionId);
  return { ok: true, dist };
}
