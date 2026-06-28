import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { S } from "../styles.js";
import { RADIUS_METERS, GEO_OPTS } from "../constants.js";
import { getPosition } from "../utils/geo.js";
import { checkin, getPublicSession } from "../api.js";

// Carregado só quando o aluno abre a câmera (o @zxing é grande).
const QrScanner = lazy(() => import("./QrScanner.jsx"));

// Extrai o id da aula a partir do texto do QR (deep link ?s=<id>).
function extractSessionId(text) {
  try {
    return new URL(text).searchParams.get("s");
  } catch {
    return null;
  }
}

export default function Aluno({ initialSessionId = "" }) {
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [info, setInfo] = useState(undefined); // undefined=carregando | null=não achou | {name,open}
  const [name, setName] = useState("");
  const [status, setStatus] = useState("form"); // form|checking|ok|error
  const [msg, setMsg] = useState("");
  const [scanning, setScanning] = useState(false);

  // Carrega os dados públicos da aula sempre que tivermos um id.
  useEffect(() => {
    if (!sessionId) {
      setInfo(undefined);
      return;
    }
    let active = true;
    setInfo(undefined);
    getPublicSession(sessionId).then((s) => {
      if (active) setInfo(s);
    });
    return () => {
      active = false;
    };
  }, [sessionId]);

  const handleScan = useCallback((text) => {
    const id = extractSessionId(text);
    setScanning(false);
    if (id) setSessionId(id);
    else {
      setStatus("error");
      setMsg("QR não reconhecido. Use o link/QR da aula.");
    }
  }, []);

  const submit = async () => {
    if (!name.trim()) { setStatus("error"); setMsg("Digite seu nome."); return; }

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
        sessionId,
        name: name.trim(),
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
        body.error === "closed"
          ? "Esta aula não está mais aberta para check-in."
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

  // ---- telas ----
  if (scanning) {
    return (
      <main style={S.main}>
        <h2 style={S.h2}>Escanear QR da aula</h2>
        <Suspense fallback={<p style={S.hint}>Carregando câmera…</p>}>
          <QrScanner onResult={handleScan} onClose={() => setScanning(false)} />
        </Suspense>
      </main>
    );
  }

  if (status === "ok") {
    return (
      <main style={S.main}>
        <div style={S.successCard}>
          <div style={S.successMark}>✓</div>
          <div style={S.successTitle}>Presente</div>
          <div style={S.successMsg}>{msg}</div>
        </div>
      </main>
    );
  }

  // Sem aula selecionada: pede o link ou oferece escanear o QR.
  if (!sessionId) {
    return (
      <main style={S.main}>
        <h2 style={S.h2}>Fazer check-in</h2>
        <p style={S.hint}>
          Abra o <strong>link da aula</strong> que o professor compartilhou, ou
          escaneie o QR que está na tela dele.
        </p>
        <button style={S.scanBtn} onClick={() => { setStatus("form"); setScanning(true); }}>
          <span aria-hidden="true">📷</span> Escanear QR da aula
        </button>
        {status === "error" && <div style={{ ...S.errorBox, marginTop: 14 }} role="alert">{msg}</div>}
      </main>
    );
  }

  if (info === undefined) {
    return <main style={S.main}><p style={S.hint}>Carregando aula…</p></main>;
  }

  if (info === null) {
    return (
      <main style={S.main}>
        <h2 style={S.h2}>Aula não encontrada</h2>
        <p style={S.hint}>O link pode estar errado ou a aula foi removida.</p>
        <button style={S.scanBtn} onClick={() => { setSessionId(""); setStatus("form"); }}>
          Tentar outro link
        </button>
      </main>
    );
  }

  if (!info.open) {
    return (
      <main style={S.main}>
        <div style={S.classTag}>{info.name}</div>
        <h2 style={S.h2}>Aula encerrada</h2>
        <p style={S.hint}>Esta aula não está mais aberta para check-in.</p>
      </main>
    );
  }

  // Aula aberta: formulário estilo "forms".
  return (
    <main style={S.main}>
      <div style={S.classTag}>{info.name}</div>
      <h2 style={S.h2}>Confirmar presença</h2>
      <label style={S.label} htmlFor="nome">Seu nome</label>
      <input id="nome" style={S.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
      <p style={S.hint}>
        Ao confirmar, vamos checar seu GPS. Você precisa estar dentro da sala
        (raio de {RADIUS_METERS}m) para a presença valer.
      </p>
      {status === "error" && <div style={S.errorBox} role="alert">{msg}</div>}
      <button style={S.primaryBtn} onClick={submit} disabled={status === "checking"}>
        {status === "checking" ? "Conferindo…" : "Confirmar presença"}
      </button>
    </main>
  );
}
