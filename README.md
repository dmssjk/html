# Presença

Check-in de presença em sala com dupla validação: **GPS** (precisa estar
fisicamente perto da sala) + **token/QR rotativo** (muda a cada poucos
segundos, então repassar print no grupo não funciona).

Dois modos:

- **Professor** — abre a aula, fixa o GPS da sala, exibe o QR/código rotativo e
  acompanha a lista de presença ao vivo (via SSE).
- **Aluno** — escaneia o QR (ou digita o código) e o servidor confere o token e
  a distância antes de registrar a presença.

## Arquitetura

Frontend React (Vite) + backend Node/Express. **Toda a validação que importa
acontece no servidor** — o cliente nunca decide se uma presença vale:

- O servidor é dono das sessões, gera e rotaciona os tokens e calcula a
  distância (haversine) no check-in.
- O professor recebe atualizações ao vivo (token + lista de presença) por
  **Server-Sent Events** (`/api/sessions/:id/stream`).
- O store é em memória (`server/store.js`) — trocar por banco/redis é só
  reimplementar esse módulo.

### API

| Método | Rota                          | Função                                  |
| ------ | ----------------------------- | --------------------------------------- |
| POST   | `/api/sessions`               | abre aula (fixa local, cria token)      |
| GET    | `/api/sessions/:id`           | estado da sessão                        |
| GET    | `/api/sessions/:id/stream`    | SSE ao vivo (token + presenças)         |
| POST   | `/api/sessions/:id/close`     | encerra a aula                          |
| POST   | `/api/checkin`                | marca presença (valida token + GPS)     |

## Rodando

```bash
npm install
npm run dev      # sobe API (8787) + Vite (5173) juntos
```

Abra `http://localhost:5173`. O Vite faz proxy de `/api` para o servidor.

Em produção, um processo só serve tudo:

```bash
npm run build    # gera dist/
npm start        # Express serve a API + o build estático
```

> A geolocalização do navegador só funciona em `https://` ou `http://localhost`.
> Para testar em celular na rede local use `npm run dev -- --host` num túnel
> HTTPS (ex.: `ngrok`).

### Testando os dois lados

O backend é a fonte da verdade, então funciona de verdade entre **dispositivos
diferentes**. Para testar rápido, abra duas abas/janelas: uma como professor,
outra como aluno. O QR codifica um deep link (`?mode=aluno&code=...`), então
escanear com a câmera do celular já abre a tela do aluno com o código preenchido.

## Estrutura

```
server/
  index.js                # Express: rotas, SSE, serve o build, rotação de token
  store.js                # store em memória, validação de token e distância
src/
  api.js                  # camada de acesso ao backend (fetch + EventSource)
  App.jsx                 # shell, troca de modo, deep link do QR
  constants.js            # raio, TTL do token, opções de GPS
  styles.js               # estilos inline + CSS global
  utils/
    geo.js                # haversine + wrapper Promise da geolocalização
    token.js              # countdown e validação do token (cliente)
  hooks/
    useNow.js             # relógio para o countdown derivado de tokenAt
  components/
    Home.jsx
    Professor.jsx         # cria sessão, assina SSE, mostra QR + lista ao vivo
    Aluno.jsx             # faz o check-in via API
    CheckinQR.jsx         # QR real (qrcode.react) com deep link
```

## Parâmetros

Defina nos **dois** lados (precisam bater): `src/constants.js` (cliente) e o topo
de `server/store.js` (servidor).

- `RADIUS_METERS` — raio aceito ao redor da sala (padrão 75m).
- `TOKEN_TTL` — validade de cada token em segundos (padrão 45s).

## Limitações conhecidas

- Store em memória: reiniciar o servidor perde as sessões (basta persistir).
- GPS ainda pode ser falsificado no aparelho, e o token pode ser repassado
  dentro da janela de validade — mitigável, ver abaixo.
- Sem autenticação: dedup de aluno é por nome.

## Próximos passos

1. **Scanner de câmera** no app do aluno (ex.: `@zxing/browser`) em vez de
   digitar o código.
2. **Identidade do aluno** (matrícula/login) no lugar de dedup por nome.
3. **Persistência e relatórios** das presenças por aula (banco de dados).
4. **Anti-fraude**: assinar o token no servidor, exigir `accuracy` mínima do GPS
   e detectar saltos improváveis de posição entre check-ins.
