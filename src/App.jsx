import { useState } from "react";
import { S, globalCss } from "./styles.js";
import { RADIUS_METERS } from "./constants.js";
import Home from "./components/Home.jsx";
import Professor from "./components/Professor.jsx";
import Aluno from "./components/Aluno.jsx";

// Deep link vindo do QR/link compartilhado: ?mode=aluno&s=<sessionId>
function readDeepLink() {
  const p = new URLSearchParams(window.location.search);
  return { mode: p.get("mode"), sessionId: p.get("s") || "" };
}

export default function App() {
  const deep = readDeepLink();
  // Com link de aula (?s=...), vai direto pro modo aluno.
  const initialMode = deep.sessionId ? "aluno" : deep.mode === "prof" ? "prof" : deep.mode === "aluno" ? "aluno" : null;
  const [mode, setMode] = useState(initialMode);

  return (
    <div style={S.app}>
      <style>{globalCss}</style>
      <header style={S.header}>
        <div style={S.brand}>
          <span style={S.dot} />
          Presença
        </div>
        {mode && (
          <button style={S.ghostBtn} onClick={() => setMode(null)}>
            ← trocar modo
          </button>
        )}
      </header>

      {!mode && <Home setMode={setMode} />}
      {mode === "prof" && <Professor />}
      {mode === "aluno" && <Aluno initialSessionId={deep.sessionId} />}

      <footer style={S.footer}>
        Protótipo · sem login: o aluno abre o link e confirma presença por GPS (raio {RADIUS_METERS}m)
      </footer>
    </div>
  );
}
