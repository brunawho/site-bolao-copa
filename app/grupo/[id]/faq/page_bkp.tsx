'use client';
import { useState } from 'react';

type Section = {
  icon: string;
  title: string;
  content: React.ReactNode;
};

function Accordion({ icon, title, content }: Section) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 8 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', background: open ? 'var(--card)' : 'var(--bg-soft)',
        border: `1px solid ${open ? 'var(--gold)' : 'var(--line)'}`,
        borderRadius: open ? '14px 14px 0 0' : 14,
        padding: '14px 16px', cursor: 'pointer', color: 'var(--text)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{icon} {title}</span>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{
          border: '1px solid var(--gold)', borderTop: 'none',
          borderRadius: '0 0 14px 14px', padding: '14px 16px',
          background: 'var(--card)', fontSize: 13, lineHeight: 1.7, color: 'var(--muted)'
        }}>
          {content}
        </div>
      )}
    </div>
  );
}

export default function FAQGrupo() {
  const sections: Section[] = [
    {
      icon: '⚽', title: 'Como fazer palpites',
      content: (
        <>
          <p>Na aba <strong style={{ color: 'var(--text)' }}>Palpites</strong>, selecione o campeonato e depois escolha entre <strong style={{ color: 'var(--text)' }}>Passados · Hoje · Próximos</strong>.</p>
          <ul style={{ paddingLeft: 16, marginTop: 8 }}>
            <li>Preencha o placar que você acha que vai acontecer</li>
            <li>Clique em <strong style={{ color: 'var(--text)' }}>Salvar palpites do dia</strong> antes do jogo começar</li>
            <li>No mata-mata, se chutar empate escolha quem avança nos pênaltis</li>
            <li>Palpites <strong style={{ color: 'var(--danger)' }}>não podem ser editados</strong> após salvar</li>
            <li>Não é permitido palpitar após o início do jogo</li>
          </ul>
        </>
      )
    },
    {
      icon: '🏆', title: 'Pontuação dos jogos',
      content: (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              <th style={{ textAlign: 'left', padding: '6px 0', fontSize: 11, color: 'var(--muted)', width: 40 }}>Pts</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, color: 'var(--muted)' }}>Regra</th>
              <th style={{ textAlign: 'left', padding: '6px 0', fontSize: 11, color: 'var(--muted)' }}>Exemplo</th>
            </tr>
          </thead>
          <tbody>
            {[
              [6, 'Placar exato', 'Chutou 2-1, terminou 2-1'],
              [4, 'Vencedor + gols de 1 time', 'Chutou 2-0, terminou 2-1'],
              [3, 'Só vencedor correto', 'Chutou 1-0, terminou 3-1'],
              [3, 'Empate (sem exato)', 'Chutou 0-0, terminou 2-2'],
              [1, 'Gols de 1 time (errou vencedor)', 'Chutou 2-1, terminou 0-1'],
              [0, 'Errou tudo', 'Chutou 1-0, terminou 0-2'],
            ].map(([pts, rule, ex]) => (
              <tr key={String(rule)} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '8px 0', fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: 'var(--gold)' }}>{pts}</td>
                <td style={{ padding: '8px 8px', fontSize: 13 }}>{rule}</td>
                <td style={{ padding: '8px 0', fontSize: 11, color: 'var(--muted)' }}>{ex}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    },
    {
      icon: '🥅', title: 'Pênaltis no mata-mata',
      content: (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {[
              [9, 'Empate exato + pênaltis certo', 'Chutou 1-1, terminou 1-1, acertou quem avança'],
              [6, 'Empate exato, pênaltis errado', 'Chutou 1-1, terminou 1-1, errou pênaltis'],
              [6, 'Empate (sem exato) + pênaltis certo', 'Chutou 0-0, terminou 2-2, acertou quem avança'],
              [3, 'Empate sem exato e pênaltis errado', 'Chutou 0-0, terminou 2-2, errou pênaltis'],
            ].map(([pts, rule, ex]) => (
              <tr key={String(rule)} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '8px 0', fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: 'var(--gold)', width: 36 }}>{pts}</td>
                <td style={{ padding: '8px 8px', fontSize: 13 }}>{rule}</td>
                <td style={{ padding: '8px 0', fontSize: 11, color: 'var(--muted)' }}>{ex}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    },
    {
      icon: '🌟', title: 'Apostas Especiais da Copa',
      content: (
        <>
          <p style={{ marginBottom: 10 }}>Na aba <strong style={{ color: 'var(--text)' }}>Especiais</strong>, faça suas apostas antes do prazo: <strong style={{ color: 'var(--gold)' }}>11/06 às 16h</strong> (horário de Brasília).</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
            <tbody>
              {[
                [25, '🥇 Campeão', 'Acertar o campeão da Copa'],
                [20, '🥈 Vice-campeão', 'Acertar o vice-campeão'],
                [15, '🥉 3º lugar', 'Acertar o terceiro colocado'],
                [15, '⚽ Artilheiro', 'Acertar o artilheiro da Copa'],
              ].map(([pts, label, desc]) => (
                <tr key={String(label)} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '8px 0', fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: 'var(--gold)', width: 36 }}>{pts}</td>
                  <td style={{ padding: '8px 8px', fontSize: 13, color: 'var(--text)' }}>{label}</td>
                  <td style={{ padding: '8px 0', fontSize: 11 }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul style={{ paddingLeft: 16 }}>
            <li>Podem ser <strong style={{ color: 'var(--text)' }}>editadas</strong> até o prazo</li>
            <li>Pontos somam no <strong style={{ color: 'var(--text)' }}>ranking geral</strong></li>
            <li>Contabilizados ao final da Copa</li>
          </ul>
        </>
      )
    },
    {
      icon: '📊', title: 'Ranking',
      content: (
        <>
          <p style={{ marginBottom: 8 }}>O ranking tem duas abas:</p>
          <ul style={{ paddingLeft: 16, marginBottom: 8 }}>
            <li><strong style={{ color: 'var(--text)' }}>🏆 Geral</strong> — pontos de todos os jogos + apostas especiais. O líder tem 👑 coroa animada.</li>
            <li><strong style={{ color: 'var(--text)' }}>🌍 Seleções</strong> — ranking de quais seleções geraram mais pontos pro grupo</li>
          </ul>
          <p style={{ marginBottom: 8 }}>Abaixo da tabela:</p>
          <ul style={{ paddingLeft: 16, marginBottom: 8 }}>
            <li><strong style={{ color: 'var(--text)' }}>📊 Gráfico de evolução</strong> — linhas coloridas mostrando pontos acumulados por rodada</li>
            <li><strong style={{ color: 'var(--text)' }}>🏅 Melhor da rodada</strong> — top 3 de quem mais pontuou na última rodada</li>
          </ul>
          <p>Em caso de empate em pontos, quem tiver mais <strong style={{ color: 'var(--text)' }}>acertos de placar exato</strong> fica na frente.</p>
        </>
      )
    },
    {
      icon: '⭐', title: 'Meus Pontos',
      content: (
        <>
          <p style={{ marginBottom: 8 }}>Na aba <strong style={{ color: 'var(--text)' }}>Meus Pts</strong> você vê seu histórico completo nos jogos finalizados:</p>
          <ul style={{ paddingLeft: 16 }}>
            <li>Resumo: total de pontos, placares exatos e vencedores acertados</li>
            <li>Jogos agrupados por dia (colapsáveis)</li>
            <li>Cada jogo mostra o placar real, seu palpite e quantos pontos ganhou</li>
            <li>Badges coloridos: 🎯 Exato · ✅ Vencedor · ⚡ Parcial · ❌ Erro</li>
          </ul>
        </>
      )
    },
    {
      icon: '👥', title: 'A Galera',
      content: (
        <>
          <p style={{ marginBottom: 8 }}>Na aba <strong style={{ color: 'var(--text)' }}>Galera</strong> você vê os palpites de todos do grupo.</p>
          <ul style={{ paddingLeft: 16 }}>
            <li>Toque em alguém para ver os palpites</li>
            <li>Filtre por <strong style={{ color: 'var(--text)' }}>Passados · Hoje · Próximos</strong></li>
            <li>Palpites ficam <strong style={{ color: 'var(--text)' }}>ocultos</strong> até o jogo começar</li>
            <li>Compartilhe o código ou link de convite para convidar mais pessoas</li>
          </ul>
        </>
      )
    },
    {
      icon: '🗺️', title: 'Chaveamento da Copa',
      content: (
        <>
          <p style={{ marginBottom: 8 }}>Na aba <strong style={{ color: 'var(--text)' }}>Palpites</strong>, selecione <strong style={{ color: 'var(--gold)' }}>Copa do Mundo</strong> e clique em <strong style={{ color: 'var(--text)' }}>🗺️ Chaveamento</strong>.</p>
          <ul style={{ paddingLeft: 16 }}>
            <li>Mostra o bracket completo do mata-mata</li>
            <li>Placar real em dourado (quando disponível)</li>
            <li>Seu palpite aparece em tag cinza ao lado</li>
            <li>Disponível a partir das Oitavas de Final</li>
          </ul>
        </>
      )
    },
    {
      icon: '🔑', title: 'Grupos e convites',
      content: (
        <>
          <ul style={{ paddingLeft: 16 }}>
            <li>Crie quantos grupos quiser na tela inicial</li>
            <li>Compartilhe o <strong style={{ color: 'var(--text)' }}>código de 6 letras</strong> ou o <strong style={{ color: 'var(--text)' }}>link de convite</strong></li>
            <li>Quem acessar o link pode criar conta e entrar direto no grupo</li>
            <li>Você pode participar de vários grupos ao mesmo tempo</li>
            <li>Cada grupo tem seu próprio ranking independente</li>
          </ul>
        </>
      )
    },
    {
      icon: '🔒', title: 'Redefinir senha',
      content: (
        <p>Na tela de login, clique em <strong style={{ color: 'var(--text)' }}>Esqueci minha senha</strong>. Um email será enviado com o link para criar uma nova senha.</p>
      )
    },
  ];

  return (
    <main className="app">
      <h1 className="brand" style={{ fontSize: 28, marginBottom: 4, marginTop: 20 }}>Regras</h1>
      <p className="subtitle" style={{ marginBottom: 24 }}>Tudo que você precisa saber.</p>

      {/* Aviso principal */}
      <div style={{
        background: 'rgba(227,93,93,0.12)', border: '2px solid var(--danger)',
        borderRadius: 16, padding: 16, marginBottom: 20
      }}>
        <div style={{ fontSize: 24, textAlign: 'center', marginBottom: 8 }}>🚫</div>
        <p style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
          Palpite enviado <strong style={{ color: 'var(--danger)' }}>não pode ser editado</strong> e não é permitido palpitar após o início do jogo.
        </p>
      </div>

      {sections.map(s => (
        <Accordion key={s.title} {...s} />
      ))}

      <div style={{ height: 100 }} />
    </main>
  );
}
