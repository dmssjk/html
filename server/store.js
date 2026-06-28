import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---- parâmetros (espelham src/constants.js) ----
export const RADIUS_METERS = 75; // raio aceito ao redor da sala

// ---- store em memória + persistência em arquivo ----
// Map<sessionId, session>. Trocar por banco/redis em produção.
const sessions = new Map();
// Map<sessionId, Set<res>> — conexões SSE abertas por sessão (não persistido).
const subscribers = new Map();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "sessions.json");

// Carrega as sessões salvas no boot (sobrevive a reinício do servidor).
function load() {
  try {
    const arr = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    for (const s of arr) sessions.set(s.id, s);
    console.log(`Presença: ${sessions.size} sessão(ões) carregada(s) do disco.`);
  } catch {
    /* primeiro boot, sem arquivo */
  }
}

// Grava em disco (debounce para não escrever a cada evento).
let saveTimer = null;
function persist() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify([...sessions.values()]));
    } catch (e) {
      console.error("Presença: falha ao persistir:", e.message);
    }
  }, 250);
}

load();

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

// Visão completa — para o professor (dono da aula): inclui a lista de presença.
function fullView(s) {
  return {
    id: s.id,
    name: s.name,
    open: s.open,
    accuracy: s.accuracy,
    present: s.present,
  };
}

// Visão pública — para o aluno que abre o link: só o necessário pro formulário.
function publicView(s) {
  return { id: s.id, name: s.name, open: s.open };
}

// ---- SSE ----
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
  const s = sessions.get(id);
  const set = subscribers.get(id);
  if (!s || !set) return;
  const payload = `data: ${JSON.stringify(fullView(s))}\n\n`;
  for (const res of set) res.write(payload);
}

// ---- operações ----
export function createSession({ name, loc, accuracy }) {
  if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") {
    return { error: "loc" };
  }
  const id = randomUUID();
  const s = {
    id,
    name: (name || "").trim() || "Aula sem nome",
    loc,
    accuracy: Number(accuracy) || 0,
    open: true,
    createdAt: Date.now(),
    present: [],
  };
  sessions.set(id, s);
  persist();
  return { session: fullView(s) };
}

export function getFull(id) {
  const s = sessions.get(id);
  return s ? fullView(s) : null;
}

export function getPublic(id) {
  const s = sessions.get(id);
  return s ? publicView(s) : null;
}

export function closeSession(id) {
  const s = sessions.get(id);
  if (!s) return null;
  s.open = false;
  persist();
  emit(id);
  return fullView(s);
}

export function checkin({ sessionId, name, studentId, loc }) {
  if (!name || !name.trim()) return { error: "name" };
  if (!studentId || !studentId.trim()) return { error: "studentId" };
  if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") {
    return { error: "loc" };
  }
  const s = sessions.get(sessionId);
  if (!s || !s.open) return { error: "closed" };

  const dist = Math.round(distMeters(s.loc, loc));
  if (dist > RADIUS_METERS) return { error: "distance", dist };

  // Dedup pela matrícula (identidade estável) — dois "João" não colidem.
  const matricula = studentId.trim();
  const norm = matricula.toLowerCase();
  if (s.present.some((p) => (p.studentId || "").toLowerCase() === norm)) {
    return { ok: true, dist, already: true };
  }

  s.present.push({
    id: randomUUID(),
    name: name.trim(),
    studentId: matricula,
    dist,
    time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  });
  persist();
  emit(s.id);
  return { ok: true, dist };
}
