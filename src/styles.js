export const ink = "#0d1b2a";
export const paper = "#f6f4ef";
export const accent = "#e0533d";
export const line = "#dcd7cc";

export const S = {
  app: { minHeight: "100vh", background: paper, color: ink, fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${line}` },
  brand: { display: "flex", alignItems: "center", gap: 8, fontWeight: 800, letterSpacing: -0.3, fontSize: 18 },
  dot: { width: 10, height: 10, borderRadius: 99, background: accent, display: "inline-block" },
  ghostBtn: { background: "none", border: "none", color: ink, opacity: 0.6, cursor: "pointer", fontSize: 14 },
  main: { flex: 1, width: "100%", maxWidth: 460, margin: "0 auto", padding: "28px 20px" },
  h1: { fontSize: 30, lineHeight: 1.12, fontWeight: 800, letterSpacing: -0.8, margin: "8px 0 14px" },
  lead: { fontSize: 15, lineHeight: 1.5, opacity: 0.75, marginBottom: 26 },
  cards: { display: "flex", flexDirection: "column", gap: 12 },
  card: { textAlign: "left", display: "flex", flexDirection: "column", gap: 4, padding: "18px 18px", background: "#fff", border: `1px solid ${line}`, borderRadius: 14, cursor: "pointer" },
  cardTag: { fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: accent, fontWeight: 700 },
  cardTitle: { fontSize: 18, fontWeight: 700 },
  cardDesc: { fontSize: 13.5, opacity: 0.7, lineHeight: 1.45 },
  h2: { fontSize: 24, fontWeight: 800, letterSpacing: -0.5, marginBottom: 18 },
  label: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, marginTop: 14 },
  input: { width: "100%", boxSizing: "border-box", padding: "13px 14px", fontSize: 16, border: `1px solid ${line}`, borderRadius: 10, background: "#fff", outline: "none" },
  hint: { fontSize: 13, opacity: 0.65, lineHeight: 1.45, margin: "12px 0 18px" },
  primaryBtn: { width: "100%", padding: "14px", fontSize: 16, fontWeight: 700, color: "#fff", background: ink, border: "none", borderRadius: 10, cursor: "pointer" },
  dangerBtn: { padding: "9px 14px", fontSize: 14, fontWeight: 600, color: accent, background: "#fff", border: `1px solid ${accent}`, borderRadius: 9, cursor: "pointer" },
  ghostBtnWide: { width: "100%", padding: "12px", marginTop: 16, background: "none", border: `1px solid ${line}`, borderRadius: 10, cursor: "pointer", fontSize: 15 },
  errorBox: { background: "#fdecea", color: "#a3271b", padding: "11px 13px", borderRadius: 9, fontSize: 14, lineHeight: 1.4, marginBottom: 14 },
  liveRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  liveName: { fontSize: 20, fontWeight: 800, letterSpacing: -0.4 },
  liveMeta: { fontSize: 13, opacity: 0.65, marginTop: 3 },
  qrWrap: { background: "#fff", border: `1px solid ${line}`, borderRadius: 16, padding: 22, display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 26 },
  tokenLine: { display: "flex", flexDirection: "column", alignItems: "center", marginTop: 14 },
  tokenLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, opacity: 0.5 },
  tokenValue: { fontSize: 28, fontWeight: 800, letterSpacing: 3, fontFamily: "ui-monospace, monospace" },
  countdown: { width: "100%", height: 6, background: line, borderRadius: 99, marginTop: 14, overflow: "hidden" },
  countdownBar: { height: "100%", background: accent, transition: "width 1s linear" },
  countdownText: { fontSize: 12, opacity: 0.6, marginTop: 6 },
  listTitle: { fontSize: 15, fontWeight: 700, marginBottom: 10 },
  empty: { fontSize: 14, opacity: 0.6, padding: "18px 0", textAlign: "center", border: `1px dashed ${line}`, borderRadius: 12 },
  list: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 },
  listItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#fff", border: `1px solid ${line}`, borderRadius: 10, fontSize: 15, fontWeight: 600 },
  listMeta: { fontSize: 12.5, opacity: 0.6, fontWeight: 500 },
  successCard: { textAlign: "center", padding: "40px 20px", background: "#fff", border: `1px solid ${line}`, borderRadius: 16, marginTop: 30 },
  successMark: { width: 64, height: 64, borderRadius: 99, background: "#1f9d55", color: "#fff", fontSize: 34, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" },
  successTitle: { fontSize: 24, fontWeight: 800 },
  successMsg: { fontSize: 14.5, opacity: 0.75, marginTop: 8, lineHeight: 1.45 },
  footer: { textAlign: "center", fontSize: 12, opacity: 0.5, padding: "16px 20px", borderTop: `1px solid ${line}` },
  scanBtn: { width: "100%", padding: "12px", marginBottom: 8, background: "#fff", border: `1px solid ${line}`, borderRadius: 10, cursor: "pointer", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  scanWrap: { display: "flex", flexDirection: "column", gap: 12 },
  video: { width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 12, background: "#000" },
  divider: { display: "flex", alignItems: "center", gap: 10, margin: "4px 0", fontSize: 12, opacity: 0.5 },
  dividerLine: { flex: 1, height: 1, background: line },
};

export const globalCss = `
  * { -webkit-tap-highlight-color: transparent; }
  html, body { margin: 0; }
  button:focus-visible, input:focus-visible { outline: 2px solid ${accent}; outline-offset: 2px; }
  input::placeholder { color: #aaa; }
`;
