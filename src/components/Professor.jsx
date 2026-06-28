import { useEffect, useState } from "react";
import { S } from "../styles.js";
import { RADIUS_METERS, GEO_OPTS } from "../constants.js";
import { getPosition } from "../utils/geo.js";
import { createSession, getSession, closeSession, subscribeSession } from "../api.js";
import CheckinQR, { shareUrl } from "./CheckinQR.jsx";

const SID_KEY = "presenca:sid"; // id da aula desta professora, para retomar após refresh

export default function Professor() {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("idle"); // idle|loading|ok|error
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(SID_KEY));
  const [session, setSession] = useState(null);
  const [copied, setCopied] = useState(false);

  const open = !!(session && session.open);

  // Retoma/assina a sessão sempre que houver um id (após criar ou após refresh).
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    let unsub;
    getSession(sessionId).then((s) => {
      if (!active) return;
      if (!s || !s.open) {
        localStorage.removeItem(SID_KEY);
        setSessionId(null);
        setSession(null);
        return;
      }
      setSession(s);
      unsub = subscribeSession(sessionId, setSession);
    });
    return () => {
      active = false;
      if (unsub) unsub();
    };
  }, [sessionId]);

  const startSession = async () => {
    setStatus("loading");
    setError("");
    let pos;
    try {
      pos = await getPosition(GEO_OPTS);
    } catch (err) {
      setStatus("error");
      setError(
        err.code === "no-geo"
          ? "Este navegador não expõe geolocalização."
          : err.code === 1
          ? "Permissão de localização negada. Autorize para abrir a aula."
          : "Não consegui obter a localização. Tente de novo."
      );
      return;
    }
    try {
      const s = await createSession({
        name: name.trim(),
        loc: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        accuracy: pos.coords.accuracy,
      });
      localStorage.setItem(SID_KEY, s.id);
      setSession(s);
      setSessionId(s.id); // dispara o efeito de assinatura
      setStatus("ok");
    } catch {
      setStatus("error");
      setError("Não consegui falar com o servidor. Ele está rodando?");
    }
  };

  const endSession = async () => {
    if (sessionId) await closeSession(sessionId);
    localStorage.removeItem(SID_KEY);
    setSessionId(null);
    setSession(null);
    setStatus("idle");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl(sessionId));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard bloqueado — o aluno pode ler o QR */
    }
  };

  if (!open) {
    return (
      <main style={S.main}>
        <h2 style={S.h2}>Abrir uma aula</h2>
        <label style={S.label} htmlFor="aula">Nome da aula</label>
        <input
          id="aula"
          style={S.input}
          placeholder="Ex.: Cálculo I — Terça 19h"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <p style={S.hint}>
          Ao abrir, vamos marcar a localização atual como o ponto da sala.
          Fique dentro da sala neste momento.
        </p>
        {status === "error" && <div style={S.errorBox} role="alert">{error}</div>}
        <button style={S.primaryBtn} onClick={startSession} disabled={status === "loading"}>
          {status === "loading" ? "Obtendo localização…" : "Abrir aula e fixar local"}
        </button>
      </main>
    );
  }

  const present = session.present || [];
  return (
    <main style={S.main}>
      <div style={S.liveRow}>
        <div>
          <div style={S.liveName}>{session.name}</div>
          <div style={S.liveMeta}>
            {present.length} presença{present.length === 1 ? "" : "s"} · precisão GPS ±{Math.round(session.accuracy)}m
          </div>
        </div>
        <button style={S.dangerBtn} onClick={endSession}>Encerrar</button>
      </div>

      <div style={S.qrWrap}>
        <CheckinQR sessionId={session.id} />
        <div style={S.qrCaption}>
          O aluno escaneia o QR ou abre o link abaixo.<br />
          Sem login: é só preencher o nome e confirmar o GPS.
        </div>
        <div style={S.shareRow}>
          <input style={S.shareInput} value={shareUrl(session.id)} readOnly onFocus={(e) => e.target.select()} />
          <button style={S.copyBtn} onClick={copyLink}>{copied ? "✓ copiado" : "copiar"}</button>
        </div>
      </div>

      <div style={S.listHead}>
        <h3 style={{ ...S.listTitle, marginBottom: 0 }}>Lista de presença</h3>
        {present.length > 0 && (
          <a style={S.csvLink} href={`/api/sessions/${session.id}/export.csv`} download>
            <span aria-hidden="true">⬇</span> CSV
          </a>
        )}
      </div>
      {present.length === 0 ? (
        <div style={S.empty}>Ninguém marcou ainda. Os check-ins aparecem aqui na hora.</div>
      ) : (
        <ul style={S.list}>
          {present.map((p) => (
            <li key={p.id} style={S.listItem}>
              <span>{p.name}</span>
              <span style={S.listMeta}>{p.dist}m · {p.time}</span>
            </li>
          ))}
        </ul>
      )}
      <p style={S.hint}>Raio aceito: {RADIUS_METERS}m ao redor do ponto fixado.</p>
    </main>
  );
}
