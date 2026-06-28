import { S } from "../styles.js";
import { RADIUS_METERS } from "../constants.js";

export default function Home({ setMode }) {
  return (
    <main style={S.main}>
      <h1 style={S.h1}>
        Presença que só conta<br />pra quem está na sala.
      </h1>
      <p style={S.lead}>
        Sem app e sem login: o aluno abre o link da aula e confirma a presença
        como num formulário. O check-in confere o GPS — fora do raio de{" "}
        {RADIUS_METERS}m da sala, não registra.
      </p>
      <div style={S.cards}>
        <button style={S.card} onClick={() => setMode("prof")}>
          <span style={S.cardTag}>professor</span>
          <span style={S.cardTitle}>Abrir uma aula</span>
          <span style={S.cardDesc}>Fixa o local, gera o link/QR para compartilhar e acompanha a lista de presença ao vivo.</span>
        </button>
        <button style={S.card} onClick={() => setMode("aluno")}>
          <span style={S.cardTag}>aluno</span>
          <span style={S.cardTitle}>Fazer check-in</span>
          <span style={S.cardDesc}>Abre o link da aula (ou escaneia o QR), digita o nome e confirma que está na sala.</span>
        </button>
      </div>
    </main>
  );
}
