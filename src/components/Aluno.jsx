import { lazy, Suspense, useCallback, useState } from "react";
import { S } from "../styles.js";
import { RADIUS_METERS, GEO_OPTS } from "../constants.js";
import { getPosition } from "../utils/geo.js";
import { checkin } from "../api.js";

// Carregado só quando o aluno abre a câmera (o @zxing é grande).
const QrScanner = lazy(() => import("./QrScanner.jsx"));

// Extrai o código do texto do QR. O QR codifica um deep link
// (?mode=aluno&code=XXXXXX); se vier texto cru, usa os 6 primeiros caracteres.
function extractCode(text) {
  try {
    const c = new URL(text).searchParams.get("code");
    if (c) return c.toUpperCase();
  } catch {
    /* não era URL */
  }
  return text.trim().toUpperCase().slice(0, 6);
}

export default function Aluno({ initialCode = "" }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState(initialCode);
  const [status, setStatus] = useState("form"); // form|checking|ok|error
  const [msg, setMsg] = useState("");
  const [scanning, setScanning] = useState(false);

  const handleScan = useCallback((text) => {
    setCode(extractCode(text));
    setScanning(false);
  }, []);

  const submit = async () => {
    if (!name.trim()) { setStatus("error"); setMsg("Digite seu nome."); return; }
    if (!code.trim()) { setStatus("error"); setMsg("Escaneie o QR ou digite o código da tela do professor."); return; }

    setStatus("checking");
    setMsg("Conferindo sua localização…");

    let pos;
    try {
      pos = await getPosition(GEO_OPTS);
    } catch (err) {
      setStatus("error");
      setMsg(
        err.code === "no-geo"
          ? "Seu navegador não permite checar localização."
          : err.code === 1
          ? "Permissão de localização negada. Autorize o acesso e tente de novo."
          : "Não consegui ler sua localização. Tente de novo."
      );
      return;
    }

    try {
      const { body } = await checkin({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        loc: { lat: pos.coords.latitude, lng: pos.coords.longitude },
      });

      if (body.ok) {
        setStatus("ok");
        setMsg(
          body.already
            ? "Você já estava marcado como presente. Tudo certo!"
            : `Presença confirmada a ${body.dist}m da sala. 👍`
        );
        return;
      }

      setStatus("error");
      setMsg(
        body.error === "token"
          ? "Código inválido ou expirado. Use o código que está na tela agora."
          : body.error === "distance"
          ? `Você está a ~${body.dist}m da sala. Precisa estar a no máximo ${RADIUS_METERS}m para marcar presença.`
          : body.error === "name"
          ? "Digite seu nome."
          : "Não foi possível marcar presença. Tente de novo."
      );
    } catch {
      setStatus("error");
      setMsg("Falha ao falar com o servidor. Verifique sua conexão e tente de novo.");
    }
  };

  if (status === "ok") {
    return (
      <main style={S.main}>
        <div style={S.successCard}>
          <div style={S.successMark}>✓</div>
          <div style={S.successTitle}>Presente</div>
          <div style={S.successMsg}>{msg}</div>
          <button style={S.ghostBtnWide} onClick={() => { setStatus("form"); setCode(""); }}>
            Voltar
          </button>
        </div>
      </main>
    );
  }

  if (scanning) {
    return (
      <main style={S.main}>
        <h2 style={S.h2}>Escanear QR</h2>
        <Suspense fallback={<p style={S.hint}>Carregando câmera…</p>}>
          <QrScanner onResult={handleScan} onClose={() => setScanning(false)} />
        </Suspense>
      </main>
    );
  }

  return (
    <main style={S.main}>
      <h2 style={S.h2}>Fazer check-in</h2>
      <label style={S.label} htmlFor="nome">Seu nome</label>
      <input id="nome" style={S.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />

      <div style={{ marginTop: 16 }}>
        <button style={S.scanBtn} onClick={() => { setStatus("form"); setScanning(true); }}>
          <span aria-hidden="true">📷</span> Escanear QR
        </button>
        <div style={S.divider}>
          <span style={S.dividerLine} /> ou digite o código <span style={S.dividerLine} />
        </div>
      </div>

      <label style={S.label} htmlFor="codigo">Código da tela do professor</label>
      <input
        id="codigo"
        style={{ ...S.input, letterSpacing: 4, fontWeight: 700, textTransform: "uppercase" }}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="6 caracteres"
        maxLength={6}
        autoCapitalize="characters"
        autoComplete="off"
      />
      {status === "error" && <div style={{ ...S.errorBox, marginTop: 14 }} role="alert">{msg}</div>}
      <button style={{ ...S.primaryBtn, marginTop: 18 }} onClick={submit} disabled={status === "checking"}>
        {status === "checking" ? "Conferindo…" : "Marcar presença"}
      </button>
    </main>
  );
}
