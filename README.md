# Presença

Check-in de presença em sala com dupla validação: **GPS** (precisa estar
fisicamente perto da sala) + **token/QR rotativo** (muda a cada poucos
segundos, então repassar print no grupo não funciona).

Dois modos:

- **Professor** — abre a aula, fixa o GPS da sala, exibe o QR/código rotativo e
  acompanha a lista de presença ao vivo.
- **Aluno** — escaneia o QR (ou digita o código) e o app confere se ele está
  dentro do raio da sala antes de registrar a presença.

## Rodando

```bash
npm install
npm run dev
```

> A geolocalização do navegador só funciona em `https://` ou `http://localhost`.
> No `npm run dev` (localhost) funciona; para testar em celular na rede local use
> `npm run dev -- --host` e um túnel HTTPS (ex.: `ngrok`).

### Testando os dois lados

A sessão é compartilhada entre abas do mesmo navegador (via `localStorage` +
`BroadcastChannel`). Abra **duas abas**: uma em modo professor, outra em modo
aluno. O QR também codifica um deep link (`?mode=aluno&code=...`), então
escanear com a câmera do celular já abre a tela do aluno com o código preenchido.

## Estrutura

```
src/
  App.jsx                 # shell, troca de modo, deep link do QR
  constants.js            # raio, TTL do token, opções de GPS
  styles.js               # estilos inline + CSS global
  utils/
    geo.js                # haversine + wrapper Promise da geolocalização
    token.js              # geração, countdown e validação do token
  hooks/
    useSession.js         # sessão compartilhada (localStorage + BroadcastChannel)
    useNow.js             # relógio para o countdown derivado de tokenAt
  components/
    Home.jsx
    Professor.jsx
    Aluno.jsx
    CheckinQR.jsx         # QR real (qrcode.react) com deep link
```

## Parâmetros

Em `src/constants.js`:

- `RADIUS_METERS` — raio aceito ao redor da sala (padrão 75m).
- `TOKEN_TTL` — validade de cada token em segundos (padrão 45s).

## Limitações conhecidas (protótipo)

Tudo roda no cliente, sem backend. Isso é suficiente para demonstrar o fluxo,
mas **não é seguro para produção**:

- GPS pode ser falsificado no próprio aparelho.
- O token ainda pode ser repassado dentro da janela de validade.
- A "sessão compartilhada" só vale entre abas do mesmo navegador — multi-device
  real exige um servidor.

## Próximos passos

1. **Backend** (a peça que falta): sessão, validação de token e cálculo de
   distância no servidor; o `useSession` vira uma camada de API/WebSocket.
2. **Scanner de câmera** no app do aluno (ex.: `@zxing/browser`) em vez de
   digitar o código.
3. **Identidade do aluno** (matrícula/login) no lugar de dedup por nome.
4. **Persistência e relatórios** das presenças por aula.
5. **Anti-fraude**: assinar o token no servidor, checar `accuracy` mínima do GPS
   e detectar saltos improváveis de posição.
