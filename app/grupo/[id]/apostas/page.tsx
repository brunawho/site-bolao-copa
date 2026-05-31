'use client';

const sections = [
  {
    icon: '⚽', title: 'Resultado em campo',
    sub: 'Inclui 90 min + acréscimos + prorrogação. Pênaltis são pontuados separadamente.',
    rows: [
      { pts: 6, rule: 'Placar exato',                     ex: 'Chutou 2-1, terminou 2-1' },
      { pts: 4, rule: 'Vencedor certo + gols de um time', ex: 'Chutou 2-0, terminou 2-1' },
      { pts: 3, rule: 'Só vencedor correto',              ex: 'Chutou 1-0, terminou 3-1' },
      { pts: 1, rule: 'Gols de 1 time (errou vencedor)',  ex: 'Chutou 2-1, terminou 0-1' },
    ],
  },
  {
    icon: '🤝', title: 'Empates',
    rows: [
      { pts: 6, rule: 'Empate exato',     ex: 'Chutou 1-1, terminou 1-1' },
      { pts: 3, rule: 'Empate sem exato', ex: 'Chutou 0-0, terminou 2-2' },
    ],
  },
  {
    icon: '🏆', title: 'Pênaltis (somente mata-mata)',
    rows: [
      { pts: 9, rule: 'Empate exato + pênaltis certo',       ex: 'Chutou 1-1, terminou 1-1, acertou quem avança' },
      { pts: 6, rule: 'Empate exato, pênaltis errado',       ex: 'Chutou 1-1, terminou 1-1, errou pênaltis' },
      { pts: 6, rule: 'Empate (sem exato) + pênaltis certo', ex: 'Chutou 0-0, terminou 2-2, acertou quem avança' },
      { pts: 3, rule: 'Empate sem exato e pênaltis errado',  ex: 'Chutou 0-0, terminou 2-2, errou pênaltis' },
    ],
    note: 'Se você chutar vitória (ex: 2-1) mas a partida terminar empatada e ir para pênaltis, você não ganha pontos pelo vencedor dos pênaltis.',
  },
  {
    icon: '🌟', title: 'Apostas Especiais da Copa',
    sub: 'Apostas feitas antes do início da Copa. Prazo: 11/06 às 16h (horário de Brasília). Podem ser editadas até o prazo.',
    rows: [
      { pts: 25, rule: 'Acertar o Campeão',      ex: 'Apostou Brasil, Brasil ganhou a Copa' },
      { pts: 20, rule: 'Acertar o Vice-campeão', ex: 'Apostou Argentina, Argentina foi vice' },
      { pts: 15, rule: 'Acertar o 3º lugar',     ex: 'Apostou França, França ficou em 3º' },
      { pts: 15, rule: 'Acertar o Artilheiro',   ex: 'Apostou Vinicius Jr, ele foi o artilheiro' },
    ],
    note: 'Os pontos das apostas especiais somam diretamente no ranking geral. Após o prazo (11/06 às 16h), as apostas não podem mais ser alteradas.',
  },
];

export default function FAQGrupo() {
  return (
    <main className="app">
      <h1 className="brand" style={{ fontSize: 28, marginBottom: 4, marginTop: 20 }}>Regras</h1>
      <p className="subtitle" style={{ marginBottom: 24 }}>Como funciona a pontuação.</p>

      {/* Aviso palpite único */}
      <div style={{
        background: 'rgba(227,93,93,0.12)', border: '2px solid var(--danger)',
        borderRadius: 16, padding: 20, marginBottom: 24
      }}>
        <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>🚫</div>
        <h2 style={{ fontSize: 18, textAlign: 'center', color: 'var(--danger)', marginBottom: 10 }}>
          Palpite único e definitivo
        </h2>
        <ul style={{ fontSize: 13, lineHeight: 2, paddingLeft: 20 }}>
          <li>Cada jogo aceita <strong>apenas 1 palpite por pessoa</strong></li>
          <li><strong style={{ color: 'var(--danger)' }}>Não é possível editar</strong> após salvar</li>
          <li><strong style={{ color: 'var(--danger)' }}>Não é permitido palpitar após o início do jogo</strong></li>
        </ul>
      </div>

      {/* Seções de pontuação */}
      {sections.map(s => (
        <div key={s.title} className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{s.icon} {s.title}</h2>
          {s.sub && (
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
              {s.sub}
            </p>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <th style={{ textAlign: 'left', padding: '6px 0', fontSize: 11, color: 'var(--muted)', width: 40 }}>Pts</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, color: 'var(--muted)' }}>Regra</th>
                <th style={{ textAlign: 'left', padding: '6px 0', fontSize: 11, color: 'var(--muted)' }}>Exemplo</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map(row => (
                <tr key={row.rule} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{
                    padding: '10px 0',
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 22,
                    color: s.icon === '🌟' ? '#f0c75e' : 'var(--gold)'
                  }}>{row.pts}</td>
                  <td style={{ padding: '10px 8px', fontSize: 13, lineHeight: 1.4 }}>{row.rule}</td>
                  <td style={{ padding: '10px 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{row.ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {s.note && (
            <p style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, fontStyle: 'italic' }}>
              💡 {s.note}
            </p>
          )}
        </div>
      ))}

      {/* Desempate */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>🏅 Desempate no ranking</h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
          Em caso de empate em pontos totais, quem tiver <strong style={{ color: 'var(--text)' }}>mais acertos de placar exato</strong> fica na frente.
        </p>
      </div>

      {/* Como funciona */}
      <div className="card" style={{ marginBottom: 80 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>📱 Como funciona</h2>
        <ul style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 2, paddingLeft: 16 }}>
          <li>Preencha o placar que você acha que vai acontecer antes do jogo começar</li>
          <li>Palpites não podem ser editados após o envio</li>
          <li>Os pontos são calculados automaticamente após cada jogo</li>
          <li>No mata-mata, se você chutar empate, escolha quem avança nos pênaltis</li>
          <li>Apostas especiais ficam na aba <strong style={{ color: 'var(--text)' }}>Especiais</strong></li>
          <li>Apostas especiais podem ser editadas até <strong style={{ color: 'var(--text)' }}>11/06 às 16h</strong></li>
          <li>Pontos especiais somam diretamente no ranking geral</li>
        </ul>
      </div>
    </main>
  );
}
