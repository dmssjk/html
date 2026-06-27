import { S } from "../styles.js";
import { RADIUS_METERS, TOKEN_TTL } from "../constants.js";

export default function Home({ setMode }) {
  return (
    <main style={S.main}>
      <h1 style={S.h1}>
        Presença que só conta<br />pra quem está na sala.
      </h1>
      <p style={S.lead}>
        O código muda a cada {TOKEN_TTL} segundos, então repassar print no grupo
        não funciona. E o check-in confere o GPS: fora do raio de {RADIUS_METERS}m
        da sala, não registra.
      </p>
      <div style={S.cards}>
        <button style={S.card} onClick={() => setMode("prof")}>
          <span style={S.cardTag}>professor</span>
          <span style={S.cardTitle}>Abrir uma aula</span>
          <span style={S.cardDesc}>Fixa o local, mostra o QR rotativo e acompanha a lista de presença ao vivo.</span>
        </button>
        <button style={S.card} onClick={() => setMode("aluno")}>
          <span style={S.cardTag}>aluno</span>
          <span style={S.cardTitle}>Fazer check-in</span>
          <span style={S.cardDesc}>Lê o código atual e confirma que você está fisicamente na aula.</span>
        </button>
      </div>
    </main>
  );
}
