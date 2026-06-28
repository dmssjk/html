// Camada de acesso ao backend. Em dev, o Vite faz proxy de /api para o servidor
// (ver vite.config.js); em produção, o próprio servidor serve o build.
const BASE = "/api";

async function jsonOrThrow(res) {
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body };
}

export async function createSession({ name, loc, accuracy }) {
  const res = await fetch(`${BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, loc, accuracy }),
  });
  const { ok, body } = await jsonOrThrow(res);
  if (!ok) throw new Error(body.error || "create_failed");
  return body;
}

// Visão completa do professor (com lista de presença).
export async function getSession(id) {
  const res = await fetch(`${BASE}/sessions/${id}`);
  if (!res.ok) return null;
  return res.json();
}

// Visão pública do aluno (nome da aula + se está aberta).
export async function getPublicSession(id) {
  const res = await fetch(`${BASE}/sessions/${id}/public`);
  if (!res.ok) return null;
  return res.json();
}

export async function closeSession(id) {
  await fetch(`${BASE}/sessions/${id}/close`, { method: "POST" }).catch(() => {});
}

export async function checkin({ sessionId, name, loc }) {
  const res = await fetch(`${BASE}/checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, name, loc }),
  });
  return jsonOrThrow(res);
}

// Assina o stream SSE da sessão. Retorna função para encerrar.
export function subscribeSession(id, onData) {
  const es = new EventSource(`${BASE}/sessions/${id}/stream`);
  es.onmessage = (e) => {
    try {
      onData(JSON.parse(e.data));
    } catch {
      /* ignora frames malformados */
    }
  };
  return () => es.close();
}
