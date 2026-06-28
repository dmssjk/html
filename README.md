# Presença

Check-in de presença em sala validado por **GPS**. O aluno **não tem conta nem
digita código**: recebe um link da aula, abre como um formulário, digita o nome
e confirma — o servidor só registra se ele estiver fisicamente dentro do raio da
sala.

Dois modos:

- **Professor** — abre a aula, fixa o GPS da sala, gera um **link/QR
  compartilhável** e acompanha a lista de presença ao vivo (via SSE).
- **Aluno** — abre o link (ou escaneia o QR), informa nome e **matrícula** e
  confirma a presença. O servidor confere a distância antes de registrar.

## Arquitetura

Frontend React (Vite) + backend Node/Express. **Toda a validação que importa
acontece no servidor** — o cliente nunca decide se uma presença vale:

- O servidor é dono das sessões e calcula a distância (haversine) no check-in.
- Cada aula tem um **link estável** (`?mode=aluno&s=<id>`) que o professor
  compartilha; o check-in é por `sessionId` + GPS + aula aberta.
- O professor recebe a lista de presença ao vivo por **Server-Sent Events**
  (`/api/sessions/:id/stream`) e pode **exportar a lista em CSV**.
- O store é em memória com **persistência em arquivo** (`data/sessions.json`):
  carrega no boot e grava (com debounce) a cada mudança, então reiniciar o
  servidor não perde as aulas. Trocar por banco/redis é só reimplementar
  `server/store.js`. O diretório dos dados é configurável via `DATA_DIR`.

### API

| Método | Rota                          | Função                                      |
| ------ | ----------------------------- | ------------------------------------------- |
| POST   | `/api/sessions`               | abre aula (fixa local)                      |
| GET    | `/api/sessions/:id`           | visão do professor (com lista de presença)  |
| GET    | `/api/sessions/:id/public`    | visão do aluno (só nome + aberta?)          |
| GET    | `/api/sessions/:id/stream`    | SSE ao vivo (lista de presença)             |
| GET    | `/api/sessions/:id/export.csv`| baixa a lista de presença em CSV            |
| POST   | `/api/sessions/:id/close`     | encerra a aula                              |
| POST   | `/api/checkin`                | marca presença (valida `sessionId` + GPS)   |

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

> A geolocalização e a câmera só funcionam em `https://` ou `http://localhost`.
> Para testar em celular na rede local use `npm run dev -- --host` num túnel
> HTTPS (ex.: `ngrok`).

### Testando os dois lados

O backend é a fonte da verdade, então funciona de verdade entre **dispositivos
diferentes**. Abra o modo professor, copie o link da aula (ou aponte a câmera do
celular para o QR) e abra como aluno em outra aba/aparelho.

## Estrutura

```
server/
  index.js                # Express: rotas, SSE, serve o build
  store.js                # store em memória + cálculo de distância
src/
  api.js                  # camada de acesso ao backend (fetch + EventSource)
  App.jsx                 # shell, troca de modo, deep link da aula
  constants.js            # raio, opções de GPS
  styles.js               # estilos inline + CSS global
  utils/
    geo.js                # haversine + wrapper Promise da geolocalização
  components/
    Home.jsx
    Professor.jsx         # cria sessão, assina SSE, mostra link/QR + lista ao vivo
    Aluno.jsx             # abre o link, formulário de presença, check-in via API
    CheckinQR.jsx         # QR real (qrcode.react) com o link da aula
    QrScanner.jsx         # leitura do QR pela câmera (@zxing, lazy-loaded)
```

> A leitura do QR usa a câmera (`getUserMedia`) e o `@zxing/browser` é pesado,
> então é carregado sob demanda (`React.lazy`) só quando o aluno toca em
> "Escanear QR".

## Parâmetros

Defina nos **dois** lados (precisam bater): `src/constants.js` (cliente) e o topo
de `server/store.js` (servidor).

- `RADIUS_METERS` — raio aceito ao redor da sala (padrão 75m).

## Limitações conhecidas

- Persistência é um arquivo JSON (`data/sessions.json`), sem índice nem
  concorrência real — adequado a protótipo, troque por um banco para escala.
- Anti-fraude = só GPS: o link é estável, então pode ser repassado para alguém
  fora da sala — mas o GPS bloqueia o check-in dele. GPS ainda é falsificável no
  aparelho. Ver "Próximos passos".
- Sem autenticação: a matrícula é só um campo informado (deduplica os
  check-ins, mas não prova identidade). A visão do professor
  (`/api/sessions/:id`) também não é autenticada.

## Próximos passos

1. **Banco de dados** no lugar do arquivo JSON + histórico de aulas do professor.
2. **Anti-fraude**: exigir `accuracy` mínima do GPS, limitar 1 check-in por
   dispositivo e detectar saltos improváveis de posição. Para reforçar o "estar
   presente no momento", dá para reintroduzir um token rotativo embutido no QR
   (com link de validade curta) como camada extra.
