// Parâmetros de validação do check-in.
export const RADIUS_METERS = 75; // raio aceito ao redor da sala
export const TOKEN_TTL = 45; // segundos de validade de cada token QR
export const TOKEN_GRACE_MS = 2000; // folga para latência de rede/relógio ao validar

// Opções padrão de geolocalização.
export const GEO_OPTS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
