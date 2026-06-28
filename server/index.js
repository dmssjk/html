import express from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import {
  createSession,
  getSession,
  closeSession,
  checkin,
  subscribe,
  rotateExpired,
} from "./store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8787;

const app = express();
app.use(cors());
app.use(express.json());

// --- API ---
app.post("/api/sessions", (req, res) => {
  const result = createSession(req.body || {});
  if (result.error) return res.status(400).json(result);
  res.status(201).json(result.session);
});

app.get("/api/sessions/:id", (req, res) => {
  const s = getSession(req.params.id);
  if (!s) return res.status(404).json({ error: "not_found" });
  res.json(s);
});

app.post("/api/sessions/:id/close", (req, res) => {
  const s = closeSession(req.params.id);
  if (!s) return res.status(404).json({ error: "not_found" });
  res.json(s);
});

// SSE: stream ao vivo da sessão (token rotativo + lista de presença).
app.get("/api/sessions/:id/stream", (req, res) => {
  const s = getSession(req.params.id);
  if (!s) return res.status(404).json({ error: "not_found" });
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(`data: ${JSON.stringify(s)}\n\n`); // estado inicial
  subscribe(req.params.id, res);
});

app.post("/api/checkin", (req, res) => {
  const result = checkin(req.body || {});
  if (result.ok) return res.json(result);
  const code = result.error === "token" || result.error === "distance" ? 422 : 400;
  res.status(code).json(result);
});

// --- estáticos (produção): serve o build do Vite, se existir ---
const dist = path.join(__dirname, "..", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

// Rotação central de tokens expirados (1x por segundo).
setInterval(rotateExpired, 1000);

app.listen(PORT, () => {
  console.log(`Presença API ouvindo em http://localhost:${PORT}`);
});
