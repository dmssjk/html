import { useEffect, useState } from "react";
import { S } from "../styles.js";
import { RADIUS_METERS, TOKEN_TTL, GEO_OPTS } from "../constants.js";
import { getPosition } from "../utils/geo.js";
import { makeToken, secondsLeft } from "../utils/token.js";
import { useNow } from "../hooks/useNow.js";
import CheckinQR from "./CheckinQR.jsx";

export default function Professor({ session, setSession }) {
  const [name, setName] = useState("");
  const [locStatus, setLocStatus] = useState("idle"); // idle|loading|ok|error
  const [locError, setLocError] = useState("");

  const open = !!(session && session.open);
  const now = useNow(open);
  const left = open ? secondsLeft(session.tokenAt, now) : TOKEN_TTL;

  const startSession = async () => {
    setLocStatus("loading");
    setLocError("");
    try {
      const pos = await getPosition(GEO_OPTS);
      setSession({
        open: true,
        name: name.trim() || "Aula sem nome",
        loc: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        accuracy: pos.coords.accuracy,
        token: makeToken(),
        tokenAt: Date.now(),
        createdAt: Date.now(),
        present: [],
      });
      setLocStatus("ok");
    } catch (err) {
      setLocStatus("error");
      setLocError(
        err.code === "no-geo"
          ? "Este navegador não expõe geolocalização."
          : err.code === 1
          ? "Permissão de localização negada. Autorize para abrir a aula."
          : "Não consegui obter a localização. Tente de novo."
      );
    }
  };

  // Esta aba (a do professor) é dona da sessão e roda a rotação do token.
  // Ao expirar, gera um novo e atualiza a sessão compartilhada.
  useEffect(() => {
    if (open && left <= 0) {
      setSession((prev) =>
        prev && prev.open ? { ...prev, token: makeToken(), tokenAt: Date.now() } : prev
      );
    }
  }, [open, left, setSession]);

  const closeSession = () => {
    setSession((prev) => (prev ? { ...prev, open: false } : prev));
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
        {locStatus === "error" && <div style={S.errorBox} role="alert">{locError}</div>}
        <button style={S.primaryBtn} onClick={startSession} disabled={locStatus === "loading"}>
          {locStatus === "loading" ? "Obtendo localização…" : "Abrir aula e fixar local"}
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
        <button style={S.dangerBtn} onClick={closeSession}>Encerrar</button>
      </div>

      <div style={S.qrWrap}>
        <CheckinQR token={session.token} />
        <div style={S.tokenLine}>
          <span style={S.tokenLabel}>código atual</span>
          <span style={S.tokenValue}>{session.token}</span>
        </div>
        <div style={S.countdown} aria-hidden="true">
          <div style={{ ...S.countdownBar, width: `${(left / TOKEN_TTL) * 100}%` }} />
        </div>
        <div style={S.countdownText}>renova em {left}s</div>
      </div>

      <h3 style={S.listTitle}>Lista de presença</h3>
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
