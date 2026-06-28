import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { S } from "../styles.js";

// Lê QR pela câmera e devolve o texto bruto via onResult.
// `onResult` precisa ser estável (useCallback no pai), senão a câmera reinicia.
export default function QrScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const reader = new BrowserQRCodeReader();
    let controls = null;
    let done = false;
    const stop = () => {
      if (controls) {
        controls.stop();
        controls = null;
      }
    };

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, _err, ctrl) => {
        if (!controls) controls = ctrl;
        if (done) return;
        if (result) {
          done = true;
          stop();
          onResult(result.getText());
        }
      })
      .then((ctrl) => {
        // Se o efeito foi limpo antes da câmera iniciar, encerra na hora.
        if (done) ctrl.stop();
        else controls = ctrl;
      })
      .catch(() => setError("Não consegui acessar a câmera. Autorize o acesso ou digite o código."));

    return () => {
      done = true;
      stop();
    };
  }, [onResult]);

  return (
    <div style={S.scanWrap}>
      <video ref={videoRef} style={S.video} muted playsInline />
      {error ? (
        <div style={S.errorBox} role="alert">{error}</div>
      ) : (
        <p style={S.hint}>Aponte a câmera para o QR na tela do professor.</p>
      )}
      <button style={S.ghostBtnWide} onClick={onClose}>Cancelar</button>
    </div>
  );
}
