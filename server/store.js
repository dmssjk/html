import { randomUUID } from "node:crypto";

// ---- parâmetros (espelham src/constants.js) ----
export const RADIUS_METERS = 75; // raio aceito ao redor da sala

// ---- store em memória ----
// Map<sessionId, session>. Trocar por banco/redis em produção.
const sessions = new Map();
// Map<sessionId, Set<res>> — conexões SSE abertas por sessão.
const subscribers = new Map();

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
  emit(id);
  return fullView(s);
}

export function checkin({ sessionId, name, loc }) {
  if (!name || !name.trim()) return { error: "name" };
  if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") {
    return { error: "loc" };
  }
  const s = sessions.get(sessionId);
  if (!s || !s.open) return { error: "closed" };

  const dist = Math.round(distMeters(s.loc, loc));
  if (dist > RADIUS_METERS) return { error: "distance", dist };

  const norm = name.trim().toLowerCase();
  if (s.present.some((p) => p.name.toLowerCase() === norm)) {
    return { ok: true, dist, already: true };
  }

  s.present.push({
    id: randomUUID(),
    name: name.trim(),
    dist,
    time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  });
  emit(s.id);
  return { ok: true, dist };
}
