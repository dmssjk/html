import { useCallback, useEffect, useRef, useState } from "react";

// Sessão compartilhada entre abas/janelas do mesmo navegador via localStorage
// (fonte da verdade, sobrevive a refresh) + BroadcastChannel (notifica as
// outras abas em tempo real). É a "cola" do protótipo enquanto não há backend:
// para multi-device real, basta trocar este hook por chamadas a uma API.
const KEY = "presenca:session";
const CHANNEL = "presenca";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(value) {
  try {
    if (value == null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* storage indisponível (modo privado etc.) — segue só em memória */
  }
}

export function useSession() {
  const [session, setSessionState] = useState(read);
  const chanRef = useRef(null);

  useEffect(() => {
    const chan = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL) : null;
    chanRef.current = chan;

    if (chan) chan.onmessage = (e) => setSessionState(e.data);

    // fallback para navegadores sem BroadcastChannel
    const onStorage = (e) => {
      if (e.key === KEY) setSessionState(e.newValue ? JSON.parse(e.newValue) : null);
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
      if (chan) chan.close();
    };
  }, []);

  // Aceita valor ou função updater (como setState). A base do updater é sempre
  // o valor recém-lido do localStorage, reduzindo clobbering quando duas abas
  // escrevem quase ao mesmo tempo (não é atômico — backend resolve de vez).
  const setSession = useCallback((updater) => {
    const current = read();
    const next = typeof updater === "function" ? updater(current) : updater;
    write(next);
    if (chanRef.current) chanRef.current.postMessage(next);
    setSessionState(next);
    return next;
  }, []);

  return [session, setSession];
}
