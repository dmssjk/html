import { randomUUID } from "node:crypto";

// ---- parâmetros (espelham src/constants.js) ----
export const RADIUS_METERS = 75;
export const TOKEN_TTL = 45; // segundos
export const TOKEN_GRACE_MS = 2000;

// ---- store em memória ----
// Map<sessionId, session>. Trocar por banco/redis em produção.
const sessions = new Map();
// Map<sessionId, Set<res>> — conexões SSE abertas por sessão.
const subscribers = new Map();

function makeToken() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

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

// Versão pública da sessão (segura para enviar ao cliente).
function publicView(s) {
  return {
    id: s.id,
    name: s.name,
    open: s.open,
    token: s.token,
    tokenAt: s.tokenAt,
    accuracy: s.accuracy,
    present: s.present,
  };
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
  const payload = `data: ${JSON.stringify(publicView(s))}\n\n`;
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
    token: makeToken(),
    tokenAt: Date.now(),
    createdAt: Date.now(),
    present: [],
  };
  sessions.set(id, s);
  return { session: publicView(s) };
}

export function getSession(id) {
  const s = sessions.get(id);
  return s ? publicView(s) : null;
}

export function closeSession(id) {
  const s = sessions.get(id);
  if (!s) return null;
  s.open = false;
  emit(id);
  return publicView(s);
}

// Encontra a sessão aberta cujo token atual (ainda válido) bate com o código.
function findByToken(code) {
  const now = Date.now();
  const wanted = (code || "").trim().toUpperCase();
  if (!wanted) return null;
  for (const s of sessions.values()) {
    if (!s.open) continue;
    const fresh = now - s.tokenAt <= TOKEN_TTL * 1000 + TOKEN_GRACE_MS;
    if (fresh && s.token === wanted) return s;
  }
  return null;
}

export function checkin({ name, code, loc }) {
  if (!name || !name.trim()) return { error: "name" };
  if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") {
    return { error: "loc" };
  }
  const s = findByToken(code);
  if (!s) return { error: "token" };

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

// Rotaciona tokens expirados das sessões abertas e notifica via SSE.
// Chamado por um intervalo no index.js.
export function rotateExpired() {
  const now = Date.now();
  for (const s of sessions.values()) {
    if (s.open && now - s.tokenAt >= TOKEN_TTL * 1000) {
      s.token = makeToken();
      s.tokenAt = now;
      emit(s.id);
    }
  }
}
