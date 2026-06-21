'use client';
import { useState } from 'react';

type Section = {
  icon: string;
  title: string;
  content: React.ReactNode;
  badge?: string;
};

function Accordion({ icon, title, content, badge }: Section) {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1, marginRight: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{icon} {title}</span>
          {badge && (
            <span style={{ fontSize: 10, background: 'rgba(212,167,44,0.2)', color: 'var(--gold)', padding: '2px 8px', borderRadius: 20, fontWeight: 700, whiteSpace: 'nowrap' }}>
              {badge}
            </span>
          )}
        </div>
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
            <li>Palpites podem ser <strong style={{ color: 'var(--gold)' }}>editados</strong> até o início do jogo</li>
            <li>Após o apito inicial, o palpite fica <strong style={{ color: 'var(--danger)' }}>bloqueado</strong></li>
            <li>Os palpites dos outros jogadores ficam <strong style={{ color: 'var(--text)' }}>ocultos por 10 minutos</strong> após o início do jogo</li>
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
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
            <tbody>
              {[
                [9, 'Empate exato + pênaltis certo', 'Chutou 1-1, terminou 1-1, acertou quem avança'],
                [6, 'Empate exato, pênaltis errado', 'Chutou 1-1, terminou 1-1, errou pênaltis'],
                [6, 'Empate (sem exato) + pênaltis certo', 'Chutou 0-0, terminou 2-2, acertou quem avança'],
                [3, 'Empate sem exato e pênaltis errado', 'Chutou 0-0, terminou 2-2, errou pênaltis'],
                [3, 'Chutou vitória, time se classificou nos pênaltis', 'Chutou 2-1 pro Brasil, terminou 1-1, Brasil avançou'],
              ].map(([pts, rule, ex]) => (
                <tr key={String(rule)} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '8px 6px 8px 0', fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: 'var(--gold)', width: 32, verticalAlign: 'top' }}>{pts}</td>
                  <td style={{ padding: '8px 0', verticalAlign: 'top' }}>
                    <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{rule}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{ex}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 12, fontStyle: 'italic' }}>
            💡 Se você chutar vitória de um time e o jogo terminar empatado, você ganha 3 pts se o time que você escolheu se classificar nos pênaltis.
          </p>
        </>
      )
    },
    {
      icon: '🌟', title: 'Apostas Especiais da Copa',
      content: (
        <>
          <p style={{ marginBottom: 10 }}>Na aba <strong style={{ color: 'var(--text)' }}>Palpites → ⭐ Especiais</strong>, faça suas apostas antes do prazo: <strong style={{ color: 'var(--gold)' }}>11/06 às 16h</strong> (horário de Brasília).</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
            <tbody>
              {[
                [25, '🥇 Campeão', 'Acertar o campeão da Copa'],
                [20, '🥈 Vice-campeão', 'Acertar o vice-campeão'],
                [15, '🥉 3º lugar', 'Acertar o terceiro colocado'],
                [15, '⚽ Artilheiro', 'Acertar o artilheiro da Copa'],
              ].map(([pts, label, desc]) => (
                <tr key={String(label)} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '8px 6px 8px 0', fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: 'var(--gold)', width: 32, verticalAlign: 'top' }}>{pts}</td>
                  <td style={{ padding: '8px 0', verticalAlign: 'top' }}>
                    <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{desc}</div>
                  </td>
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
      icon: '🥊', title: 'Mata-Mata', badge: 'Disponível a partir de 27/06',
      content: (
        <>
          <p style={{ marginBottom: 12 }}>Na aba <strong style={{ color: 'var(--text)' }}>Palpites → 🥊 Mata-Mata</strong> você encontra 3 tipos de aposta especial para o mata-mata da Copa:</p>

          <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>1️⃣ Quem avança?</p>
          <p style={{ marginBottom: 12 }}>Antes de cada fase, escolha quais times você acha que vão passar. Cada acerto vale pontos — quanto mais difícil a fase, mais pontos.</p>

          <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>2️⃣ Quem vai ser campeão?</p>
          <p style={{ marginBottom: 6 }}>Aposte no campeão antes das Oitavas. Quanto antes acertar, mais pontos! A cada nova fase você pode <strong style={{ color: 'var(--text)' }}>Manter</strong> ou <strong style={{ color: 'var(--text)' }}>Trocar</strong>:</p>
          <ul style={{ paddingLeft: 16, marginBottom: 6 }}>
            <li><strong style={{ color: 'var(--text)' }}>Manter</strong> → continua com o mesmo time e mantém os pontos da fase em que apostou</li>
            <li><strong style={{ color: 'var(--text)' }}>Trocar</strong> → muda para outro time, mas os pontos valem pela fase atual (menor)</li>
          </ul>
          <p style={{ marginBottom: 12, fontSize: 12, fontStyle: 'italic' }}>Ex: apostou Brasil nas Oitavas e manteve → 15 pts. Trocou para França nas Quartas → 10 pts.</p>

          <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>3️⃣ Placar da Final</p>
          <p style={{ marginBottom: 12 }}>Aposte no placar exato da grande final. Bônus de <strong style={{ color: 'var(--gold)' }}>+20 pts</strong> se acertar!</p>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['3', 'Acertar quem avança nas Oitavas'],
                ['5', 'Acertar quem avança nas Quartas'],
                ['8', 'Acertar quem avança na Semi'],
                ['15', 'Campeão apostado antes das Oitavas'],
                ['10', 'Campeão apostado antes das Quartas'],
                ['5', 'Campeão apostado antes da Semi'],
                ['+20', 'Placar exato da Final (bônus)'],
              ].map(([pts, rule]) => (
                <tr key={rule} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '8px 6px 8px 0', fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: 'var(--gold)', width: 40, verticalAlign: 'middle' }}>{pts}</td>
                  <td style={{ padding: '8px 0', fontSize: 13, color: 'var(--text)' }}>{rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
            ⚠️ Palpites bloqueiam automaticamente quando o primeiro jogo de cada fase começa.
          </p>
        </>
      )
    },
    {
      icon: '📊', title: 'Ranking',
      content: (
        <>
          <p style={{ marginBottom: 8 }}>O ranking tem três abas:</p>
          <ul style={{ paddingLeft: 16, marginBottom: 8 }}>
            <li><strong style={{ color: 'var(--text)' }}>🏆 Geral</strong> — pontos de todos os jogos + apostas especiais + mata-mata. O líder tem 👑 coroa animada.</li>
            <li><strong style={{ color: 'var(--text)' }}>🌍 Seleções</strong> — ranking de quais seleções geraram mais pontos pro grupo</li>
            <li><strong style={{ color: 'var(--text)' }}>📋 Resultados</strong> — placares de todos os jogos com filtro Passados/Hoje/Próximos</li>
          </ul>
          <p style={{ marginBottom: 8 }}>Abaixo da tabela:</p>
          <ul style={{ paddingLeft: 16, marginBottom: 8 }}>
            <li><strong style={{ color: 'var(--text)' }}>📊 Gráfico de evolução</strong> — linhas coloridas mostrando pontos acumulados por rodada</li>
            <li><strong style={{ color: 'var(--text)' }}>🏅 Melhor da rodada</strong> — top 3 de quem mais pontuou na última rodada</li>
            <li><strong style={{ color: 'var(--text)' }}>🔴 Jogos em andamento</strong> — palpite de cada pessoa para o jogo ao vivo (visível 10min após início)</li>
          </ul>
          <p>Clique em qualquer pessoa no ranking para ver o histórico de jogos em que ela pontuou.</p>
          <p style={{ marginTop: 6 }}>Em caso de empate em pontos, quem tiver mais <strong style={{ color: 'var(--text)' }}>acertos de placar exato</strong> fica na frente.</p>
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
            <li>Atualização automática a cada 3 minutos</li>
          </ul>
        </>
      )
    },
    {
      icon: '👥', title: 'A Galera',
      content: (
        <>
          <p style={{ marginBottom: 8 }}>Na aba <strong style={{ color: 'var(--text)' }}>Galera</strong> você vê os palpites de todos do grupo.</p>
          <ul style={{ paddingLeft: 16, marginBottom: 12 }}>
            <li>Toggle <strong style={{ color: 'var(--text)' }}>👥 Por pessoa</strong> ou <strong style={{ color: 'var(--text)' }}>⚽ Por jogo</strong></li>
            <li>Toque em alguém para ver os palpites com filtro Passados/Hoje/Próximos</li>
            <li>Palpites ficam <strong style={{ color: 'var(--text)' }}>ocultos</strong> até 10 minutos após o jogo começar</li>
            <li>A partir de <strong style={{ color: 'var(--gold)' }}>27/06</strong> — botão <strong style={{ color: 'var(--text)' }}>🌟 Ver apostas especiais</strong> mostra as apostas especiais e de mata-mata de cada pessoa</li>
          </ul>
          <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>💰 Caixinha do grupo</p>
          <ul style={{ paddingLeft: 16 }}>
            <li>Clique em <strong style={{ color: 'var(--text)' }}>💰 Caixinha do grupo</strong> para ver o status financeiro</li>
            <li>Mostra quanto foi arrecadado, quem pagou e quem está pendente</li>
            <li>Aba <strong style={{ color: 'var(--text)' }}>🏆 Prêmio</strong> mostra a distribuição e projeção baseada no ranking atual</li>
            <li>O <strong style={{ color: 'var(--text)' }}>criador do grupo</strong> pode definir o valor, marcar pagamentos e configurar a divisão com sliders</li>
            <li>A distribuição pode ser <strong style={{ color: 'var(--text)' }}>bloqueada</strong> — após confirmada não pode ser alterada</li>
          </ul>
        </>
      )
    },
    {
      icon: '🗺️', title: 'Chaveamento da Copa',
      content: (
        <>
          <p style={{ marginBottom: 8 }}>Na aba <strong style={{ color: 'var(--text)' }}>Palpites → Copa do Mundo → 🗺️ Chaveamento</strong>.</p>
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
          <ul style={{ paddingLeft: 16, marginBottom: 12 }}>
            <li>Crie quantos grupos quiser na tela inicial</li>
            <li>Compartilhe o <strong style={{ color: 'var(--text)' }}>código de 6 letras</strong> ou o <strong style={{ color: 'var(--text)' }}>link de convite</strong></li>
            <li>Quem acessar o link pode criar conta e entrar direto no grupo</li>
            <li>Você pode participar de vários grupos ao mesmo tempo</li>
            <li>Cada grupo tem seu próprio ranking independente</li>
          </ul>
          <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>📋 Espelhar palpites</p>
          <ul style={{ paddingLeft: 16 }}>
            <li>Na tela de grupos, clique em <strong style={{ color: 'var(--text)' }}>📋 Espelhar palpites</strong></li>
            <li>Escolha o grupo de <strong style={{ color: 'var(--text)' }}>origem</strong> e o grupo de <strong style={{ color: 'var(--text)' }}>destino</strong></li>
            <li>Apenas palpites de <strong style={{ color: 'var(--text)' }}>jogos futuros</strong> são copiados</li>
            <li>Palpites já existentes no destino não são sobrescritos</li>
          </ul>
        </>
      )
    },
    {
      icon: '👤', title: 'Perfil',
      content: (
        <>
          <p style={{ marginBottom: 8 }}>Acesse seu perfil pelo ícone <strong style={{ color: 'var(--text)' }}>👤</strong> no canto superior direito de qualquer tela do grupo.</p>
          <ul style={{ paddingLeft: 16 }}>
            <li>Editar nome de usuário</li>
            <li>Ver estatísticas gerais (% de acerto, total de pontos, exatos, vencedores)</li>
            <li>Redefinir senha</li>
            <li>Sair da conta</li>
          </ul>
        </>
      )
    },
    {
      icon: '🔒', title: 'Redefinir senha',
      content: (
        <p>Na tela de login, clique em <strong style={{ color: 'var(--text)' }}>Esqueci minha senha</strong>. Um email será enviado com o link para criar uma nova senha. Também disponível no <strong style={{ color: 'var(--text)' }}>Perfil</strong>.</p>
      )
    },
  ];

  return (
    <main className="app">
      <h1 className="brand" style={{ fontSize: 28, marginBottom: 4, marginTop: 20 }}>Regras</h1>
      <p className="subtitle" style={{ marginBottom: 24 }}>Tudo que você precisa saber.</p>

      {/* Aviso principal */}
      <div style={{
        background: 'rgba(212,167,44,0.1)', border: '2px solid var(--gold)',
        borderRadius: 16, padding: 16, marginBottom: 20
      }}>
        <div style={{ fontSize: 24, textAlign: 'center', marginBottom: 8 }}>⚡</div>
        <p style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
          Palpites podem ser <strong style={{ color: 'var(--gold)' }}>editados até o início do jogo</strong>. Após o apito inicial, ficam bloqueados.
        </p>
      </div>

      {sections.map(s => (
        <Accordion key={s.title} {...s} />
      ))}

      <div style={{ height: 100 }} />
    </main>
  );
}
