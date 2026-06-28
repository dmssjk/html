import { useState } from "react";
import { S, globalCss } from "./styles.js";
import { RADIUS_METERS, TOKEN_TTL } from "./constants.js";
import Home from "./components/Home.jsx";
import Professor from "./components/Professor.jsx";
import Aluno from "./components/Aluno.jsx";

// Deep link vindo do QR: ?mode=aluno&code=XXXXXX
function readDeepLink() {
  const p = new URLSearchParams(window.location.search);
  return { mode: p.get("mode"), code: (p.get("code") || "").toUpperCase() };
}

export default function App() {
  const deep = readDeepLink();
  const [mode, setMode] = useState(deep.mode === "aluno" || deep.mode === "prof" ? deep.mode : null);

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
      {mode === "aluno" && <Aluno initialCode={deep.code} />}

      <footer style={S.footer}>
        Protótipo · validação por GPS (raio {RADIUS_METERS}m) + token que expira em {TOKEN_TTL}s
      </footer>
    </div>
  );
}
