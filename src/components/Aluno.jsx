import { useState } from "react";
import { S } from "../styles.js";
import { RADIUS_METERS, GEO_OPTS } from "../constants.js";
import { distMeters, getPosition } from "../utils/geo.js";
import { isTokenValid } from "../utils/token.js";

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export default function Aluno({ session, setSession, initialCode = "" }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState(initialCode);
  const [status, setStatus] = useState("form"); // form|checking|ok|error
  const [msg, setMsg] = useState("");

  const submit = async () => {
    if (!name.trim()) { setStatus("error"); setMsg("Digite seu nome."); return; }
    if (!session || !session.open) { setStatus("error"); setMsg("Nenhuma aula aberta no momento."); return; }
    if (!isTokenValid(session, code)) {
      setStatus("error");
      setMsg("Código inválido ou expirado. Use o código que está na tela agora.");
      return;
    }

    setStatus("checking");
    setMsg("Conferindo sua localização…");
    try {
      const pos = await getPosition(GEO_OPTS);
      const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const d = Math.round(distMeters(session.loc, here));

      if (d > RADIUS_METERS) {
        setStatus("error");
        setMsg(`Você está a ~${d}m da sala. Precisa estar a no máximo ${RADIUS_METERS}m para marcar presença.`);
        return;
      }

      const normalized = name.trim().toLowerCase();
      const already = (session.present || []).some((p) => p.name.toLowerCase() === normalized);
      if (already) {
        setStatus("ok");
        setMsg("Você já estava marcado como presente. Tudo certo!");
        return;
      }

      const entry = {
        id: makeId(),
        name: name.trim(),
        dist: d,
        time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      };
      // Re-checa a sessão na hora de gravar: outra aba pode tê-la encerrado
      // enquanto o GPS era lido.
      setSession((prev) => {
        if (!prev || !prev.open) return prev;
        return { ...prev, present: [...(prev.present || []), entry] };
      });
      setStatus("ok");
      setMsg(`Presença confirmada a ${d}m da sala. 👍`);
    } catch (err) {
      setStatus("error");
      setMsg(
        err.code === "no-geo"
          ? "Seu navegador não permite checar localização."
          : err.code === 1
          ? "Permissão de localização negada. Autorize o acesso e tente de novo."
          : "Não consegui ler sua localização. Tente de novo."
      );
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

  return (
    <main style={S.main}>
      <h2 style={S.h2}>Fazer check-in</h2>
      <label style={S.label} htmlFor="nome">Seu nome</label>
      <input id="nome" style={S.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
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
      <p style={S.hint}>
        Em uso real, o aluno aponta a câmera para o QR. Aqui no protótipo, digite o
        código que aparece na tela do professor (ou escaneie o QR, que já preenche).
      </p>
      {status === "error" && <div style={S.errorBox} role="alert">{msg}</div>}
      <button style={S.primaryBtn} onClick={submit} disabled={status === "checking"}>
        {status === "checking" ? "Conferindo…" : "Marcar presença"}
      </button>
    </main>
  );
}
