import { QRCodeSVG } from "qrcode.react";

// Link estável da aula. O aluno abre direto (sem login, sem código) e cai no
// formulário de check-in já apontando para esta sessão.
export function shareUrl(sessionId) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?mode=aluno&s=${encodeURIComponent(sessionId)}`;
}

export default function CheckinQR({ sessionId, size = 220 }) {
  return (
    <QRCodeSVG
      value={shareUrl(sessionId)}
      size={size}
      level="M"
      marginSize={2}
      bgColor="#ffffff"
      fgColor="#0d1b2a"
      style={{ borderRadius: 8 }}
    />
  );
}
