import { QRCodeSVG } from "qrcode.react";

// QR real (escaneável). Codifica um deep link para a tela do aluno já com o
// token no parâmetro `?code=`, então apontar a câmera do celular abre o
// check-in com o código preenchido.
export function checkinUrl(token) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?mode=aluno&code=${encodeURIComponent(token)}`;
}

export default function CheckinQR({ token, size = 220 }) {
  return (
    <QRCodeSVG
      value={checkinUrl(token)}
      size={size}
      level="M"
      marginSize={2}
      bgColor="#ffffff"
      fgColor="#0d1b2a"
      style={{ borderRadius: 8 }}
    />
  );
}
