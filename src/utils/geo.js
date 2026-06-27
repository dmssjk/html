// Distância haversine em metros entre dois pontos {lat, lng}.
export function distMeters(a, b) {
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

// Wrapper em Promise sobre a API de geolocalização do navegador.
// Rejeita com um Error cujo `.code` espelha o GeolocationPositionError
// (1 = permissão negada, 2 = indisponível, 3 = timeout) ou "no-geo".
export function getPosition(opts) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      const e = new Error("no-geo");
      e.code = "no-geo";
      reject(e);
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, opts);
  });
}
