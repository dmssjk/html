import { useState } from "react";
import { S } from "../styles.js";
import { RADIUS_METERS, GEO_OPTS } from "../constants.js";
import { getPosition } from "../utils/geo.js";
import { checkin } from "../api.js";

export default function Aluno({ initialCode = "" }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState(initialCode);
  const [status, setStatus] = useState("form"); // form|checking|ok|error
  const [msg, setMsg] = useState("");

  const submit = async () => {
    if (!name.trim()) { setStatus("error"); setMsg("Digite seu nome."); return; }
    if (!code.trim()) { setStatus("error"); setMsg("Digite o código da tela do professor."); return; }

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
