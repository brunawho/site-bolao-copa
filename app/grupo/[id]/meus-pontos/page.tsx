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
        width: '100%', background: open ? 'var(--bg3)' : 'var(--bg2)',
        border: `1px solid ${open ? 'var(--gold)' : 'var(--line2)'}`,
        borderRadius: open ? '14px 14px 0 0' : 14,
        padding: '14px 16px', cursor: 'pointer', color: 'var(--text)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1, marginRight: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{icon} {title}</span>
          {badge && (
            <span style={{ fontSize: 10, background: 'rgba(57,255,20,0.1)', color: 'var(--neon)', padding: '2px 8px', borderRadius: 2, fontWeight: 700, whiteSpace: 'nowrap' }}>
              {badge}
            </span>
          )}
        </div>
        <span style={{ color: 'var(--sub)', fontSize: 14 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{
          border: '1px solid var(--line2)', borderTop: 'none',
          borderRadius: '0 0 14px 14px', padding: '14px 16px',
          background: 'var(--bg3)', fontSize: 13, lineHeight: 1.7, color: 'var(--sub)'
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
            <li>No mata-mata, se chutar empate é <strong style={{ color: 'var(--gold)' }}>obrigatório</strong> escolher quem avança — o sistema bloqueia o salvar até você escolher</li>
            <li>Palpites podem ser <strong style={{ color: 'var(--gold)' }}>editados</strong> até o início do jogo</li>
            <li>Após o apito inicial, o palpite fica <strong style={{ color: 'var(--red)' }}>bloqueado</strong></li>
            <li>Os palpites dos outros jogadores ficam <strong style={{ color: 'var(--text)' }}>ocultos por 10 minutos</strong> após o início do jogo</li>
          </ul>
        </>
      )
    },
    {
      icon: '🏆', title: 'Pontuação dos jogos',
      content: (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {[
              [6, 'Placar exato', 'Ex: chutou 2-1, terminou 2-1'],
              [4, 'Vencedor + gols de 1 time', 'Ex: chutou 2-0, terminou 2-1'],
              [3, 'Só vencedor correto', 'Ex: chutou 1-0, terminou 3-1'],
              [3, 'Empate (sem exato)', 'Ex: chutou 0-0, terminou 2-2'],
              [1, 'Gols de 1 time (errou vencedor)', 'Ex: chutou 2-1, terminou 0-1'],
              [0, 'Errou tudo', 'Ex: chutou 1-0, terminou 0-2'],
            ].map(([pts, rule, ex]) => (
              <tr key={String(rule)} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '8px 6px 8px 0', fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: 'var(--gold)', width: 32, verticalAlign: 'top' }}>{pts}</td>
                <td style={{ padding: '8px 0', verticalAlign: 'top' }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{rule}</div>
                  <div style={{ fontSize: 11, color: 'var(--sub)' }}>{ex}</div>
                </td>
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
                    <div style={{ fontSize: 11, color: 'var(--sub)' }}>{ex}</div>
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
                    <div style={{ fontSize: 11, color: 'var(--sub)' }}>{desc}</div>
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
      icon: '🥊', title: 'Mata-Mata', badge: 'A partir de 28/06',
      content: (
        <>
          <p style={{ marginBottom: 12 }}>No mata-mata da Copa, os <strong style={{ color: 'var(--text)' }}>pontos são multiplicados</strong> dependendo da fase:</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
            <tbody>
              {[
                ['1x',   '16 Avos de Final'],
                ['1.5x', 'Oitavas de Final'],
                ['2x',   'Quartas de Final'],
                ['2.5x', 'Semifinais e disputa do 3º lugar'],
                ['3x',   'Final'],
              ].map(([mult, phase]) => (
                <tr key={phase} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '8px 6px 8px 0', fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: 'var(--gold)', width: 50, verticalAlign: 'middle' }}>{mult}</td>
                  <td style={{ padding: '8px 0', fontSize: 13, color: 'var(--text)' }}>{phase}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 12, fontStyle: 'italic', marginBottom: 8 }}>
            Exemplo: um placar exato na fase de grupos vale 6 pts. Na final, vale <strong style={{ color: 'var(--gold)' }}>18 pts</strong>!
          </p>
          <p style={{ fontSize: 13 }}>
            A pontuação segue as mesmas regras dos jogos normais — o multiplicador é aplicado automaticamente. Os palpites de pênalti continuam funcionando normalmente.
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
            <li><strong style={{ color: 'var(--text)' }}>🏆 Rankings</strong> — selecione o campeonato: Brasileirão · Champions · Copa do Mundo · Geral. Só aparecem os participantes que pagaram cada campeonato.</li>
            <li><strong style={{ color: 'var(--text)' }}>🌍 Times</strong> — ranking de quais times geraram mais pontos pro grupo</li>
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
            <li>A partir de <strong style={{ color: 'var(--gold)' }}>28/06</strong> — botão <strong style={{ color: 'var(--text)' }}>🌟 Ver apostas especiais</strong> mostra as apostas especiais de cada pessoa</li>
          </ul>
          <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>💰 Caixinha do grupo</p>
          <ul style={{ paddingLeft: 16, marginBottom: 12 }}>
            <li>Clique em <strong style={{ color: 'var(--text)' }}>💰 Caixinha do grupo</strong> para ver o status financeiro geral</li>
            <li>Mostra quanto foi arrecadado, quem pagou e quem está pendente</li>
            <li>Aba <strong style={{ color: 'var(--text)' }}>🏆 Prêmio</strong> mostra a distribuição e projeção baseada no ranking atual</li>
            <li>O <strong style={{ color: 'var(--text)' }}>criador do grupo</strong> pode definir o valor, marcar pagamentos e configurar a divisão com sliders</li>
            <li>A distribuição pode ser <strong style={{ color: 'var(--text)' }}>bloqueada</strong> — após confirmada não pode ser alterada</li>
          </ul>
          <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>💰 Caixinha por campeonato</p>
          <ul style={{ paddingLeft: 16 }}>
            <li>Clique em <strong style={{ color: 'var(--text)' }}>💰 Caixinha por campeonato</strong> para ver o status de cada campeonato separado</li>
            <li>Selecione o campeonato (Brasileirão, Champions) para ver quem pagou</li>
            <li>O criador define o valor de entrada e marca quem pagou por campeonato</li>
            <li>Apenas quem pagou aparece no ranking daquele campeonato</li>
          </ul>
        </>
      )
    },
    {
      icon: '🌟', title: 'Apostas Especiais por Campeonato',
      content: (
        <>
          <p style={{ marginBottom: 10 }}>Além das apostas da Copa, cada campeonato ativo tem suas próprias apostas especiais. Acesse em <strong style={{ color: 'var(--text)' }}>Palpites → selecione o campeonato → ⭐ Apostas especiais</strong>.</p>
          <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>🇧🇷 Brasileirão</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
            <tbody>
              {[
                [50, '🏆 Campeão', 'Acertar o campeão do Brasileirão'],
                [10, '🔝 Top 4 (cada)', 'Acertar cada time no G4'],
                [10, '⬇️ Rebaixados (cada)', 'Acertar cada time no Z4'],
                [50, '⚽ Artilheiro', 'Acertar o artilheiro do Brasileirão'],
              ].map(([pts, label, desc]) => (
                <tr key={String(label)} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '8px 6px 8px 0', fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: 'var(--gold)', width: 32, verticalAlign: 'top' }}>{pts}</td>
                  <td style={{ padding: '8px 0', verticalAlign: 'top' }}>
                    <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'var(--sub)' }}>{desc}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>🏆 Champions League</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
            <tbody>
              {[
                [25, '🏆 Campeão', 'Acertar o campeão da Champions'],
                [10, '🥈 Vice-campeão', 'Acertar o vice-campeão'],
                [25, '⚽ Artilheiro', 'Acertar o artilheiro da Champions'],
              ].map(([pts, label, desc]) => (
                <tr key={String(label)} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '8px 6px 8px 0', fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: 'var(--gold)', width: 32, verticalAlign: 'top' }}>{pts}</td>
                  <td style={{ padding: '8px 0', verticalAlign: 'top' }}>
                    <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'var(--sub)' }}>{desc}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 12, fontStyle: 'italic' }}>💡 Na Champions, os multiplicadores de fase da Copa do Mundo também se aplicam.</p>
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
