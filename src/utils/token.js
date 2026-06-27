import { TOKEN_TTL, TOKEN_GRACE_MS } from "../constants.js";

// Token curto e legível (6 caracteres alfanuméricos maiúsculos).
export function makeToken() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Segundos restantes do token atual, derivados do timestamp `tokenAt`.
// Derivar do tempo (em vez de um contador próprio) evita drift e mantém
// todas as abas/devices sincronizados.
export function secondsLeft(tokenAt, now = Date.now()) {
  if (!tokenAt) return 0;
  return Math.max(0, Math.ceil((tokenAt + TOKEN_TTL * 1000 - now) / 1000));
}

// O token informado bate com o da sessão e ainda está dentro da validade?
export function isTokenValid(session, code, now = Date.now()) {
  if (!session || !session.open) return false;
  const matches = code.trim().toUpperCase() === session.token;
  const fresh = now - session.tokenAt <= TOKEN_TTL * 1000 + TOKEN_GRACE_MS;
  return matches && fresh;
}
