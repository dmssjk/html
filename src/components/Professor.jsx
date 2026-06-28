import { useCallback, useEffect, useState } from "react";
import { S } from "../styles.js";
import { RADIUS_METERS, GEO_OPTS } from "../constants.js";
import { getPosition } from "../utils/geo.js";
import { createSession, getSession, listSessions, closeSession, subscribeSession } from "../api.js";
import CheckinQR, { shareUrl } from "./CheckinQR.jsx";

const SID_KEY = "presenca:sid"; // aula ativa desta professora, para retomar após refresh
const OWNER_KEY = "presenca:owner"; // identifica este navegador como dono das aulas

function getOwner() {
  let o = localStorage.getItem(OWNER_KEY);
  if (!o) {
    o = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(OWNER_KEY, o);
  }
  return o;
}

function formatDate(ts) {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

// Lista de presença + botão de CSV, reusada na aula ao vivo e na aula passada.
function Attendance({ session, emptyMsg }) {
  const present = session.present || [];
  return (
    <>
      <div style={S.listHead}>
        <h3 style={{ ...S.listTitle, marginBottom: 0 }}>Lista de presença</h3>
        {present.length > 0 && (
          <a style={S.csvLink} href={`/api/sessions/${session.id}/export.csv`} download>
            <span aria-hidden="true">⬇</span> CSV
          </a>
        )}
      </div>
      {present.length === 0 ? (
        <div style={S.empty}>{emptyMsg}</div>
      ) : (
        <ul style={S.list}>
          {present.map((p) => (
            <li key={p.id} style={S.listItem}>
              <span style={S.listPerson}>
                <span>{p.name}</span>
                {p.studentId && <span style={S.listSub}>mat. {p.studentId}</span>}
              </span>
              <span style={S.listMeta}>{p.dist}m · {p.time}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function Professor() {
  const [owner] = useState(getOwner);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("idle"); // idle|loading|ok|error
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(SID_KEY));
  const [session, setSession] = useState(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [viewing, setViewing] = useState(null); // aula passada aberta em modo leitura

  const open = !!(session && session.open);

  const loadHistory = useCallback(() => {
    listSessions(owner).then(setHistory);
  }, [owner]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Retoma/assina a sessão ativa sempre que houver um id.
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
        owner,
      });
      localStorage.setItem(SID_KEY, s.id);
      setSession(s);
      setSessionId(s.id);
      setName("");
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
    loadHistory();
  };

  const onHistoryClick = async (h) => {
    if (h.open) {
      localStorage.setItem(SID_KEY, h.id);
      setSessionId(h.id); // retoma a aula ainda aberta
    } else {
      setViewing(await getSession(h.id)); // abre em leitura
    }
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

  // --- aula passada (somente leitura) ---
  if (viewing) {
    return (
      <main style={S.main}>
        <button style={S.ghostBtn} onClick={() => setViewing(null)}>← minhas aulas</button>
        <div style={{ ...S.classTag, marginTop: 10 }}>
          {viewing.open ? "aula aberta" : "aula encerrada"}
        </div>
        <h2 style={S.h2}>{viewing.name}</h2>
        <Attendance session={viewing} emptyMsg="Esta aula não teve presenças registradas." />
      </main>
    );
  }

  // --- aula ao vivo ---
  if (open) {
    return (
      <main style={S.main}>
        <div style={S.liveRow}>
          <div>
            <div style={S.liveName}>{session.name}</div>
            <div style={S.liveMeta}>
              {(session.present || []).length} presença{(session.present || []).length === 1 ? "" : "s"} · precisão GPS ±{Math.round(session.accuracy)}m
            </div>
          </div>
          <button style={S.dangerBtn} onClick={endSession}>Encerrar</button>
        </div>

        <div style={S.qrWrap}>
          <CheckinQR sessionId={session.id} />
          <div style={S.qrCaption}>
            O aluno escaneia o QR ou abre o link abaixo.<br />
            Sem login: nome, matrícula e confirmação por GPS.
          </div>
          <div style={S.shareRow}>
            <input style={S.shareInput} value={shareUrl(session.id)} readOnly onFocus={(e) => e.target.select()} />
            <button style={S.copyBtn} onClick={copyLink}>{copied ? "✓ copiado" : "copiar"}</button>
          </div>
        </div>

        <Attendance session={session} emptyMsg="Ninguém marcou ainda. Os check-ins aparecem aqui na hora." />
        <p style={S.hint}>Raio aceito: {RADIUS_METERS}m ao redor do ponto fixado.</p>
      </main>
    );
  }

  // --- tela inicial: abrir aula + histórico ---
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

      {history.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h3 style={S.listTitle}>Minhas aulas</h3>
          <ul style={S.list}>
            {history.map((h) => (
              <li key={h.id} style={S.listItem}>
                <span style={S.listPerson}>
                  <span>{h.name}</span>
                  <span style={S.listSub}>
                    {formatDate(h.createdAt)} · {h.count} presença{h.count === 1 ? "" : "s"}
                    {h.open ? " · aberta" : ""}
                  </span>
                </span>
                <button style={S.csvLink} onClick={() => onHistoryClick(h)}>
                  {h.open ? "retomar" : "ver"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
