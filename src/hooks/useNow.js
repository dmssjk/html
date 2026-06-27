import { useEffect, useState } from "react";

// Relógio que avança em `intervalMs` enquanto `active` for true.
// Usado para recalcular o countdown derivado de `tokenAt` a cada tick.
export function useNow(active, intervalMs = 500) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
}
