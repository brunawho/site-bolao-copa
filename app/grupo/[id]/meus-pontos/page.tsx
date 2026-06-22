'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase, type Match, type Guess, calcPoints } from '@/lib/supabase';

type MatchWithGuess = {
  match: Match;
  guess: Guess | null;
  points: number;
  label: string;
  color: string;
  icon: string;
};

function toBrazilDay(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).split('/').reverse().join('-');
}

function fmtDay(dateYMD: string) {
  const [y, m, d] = dateYMD.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long'
  });
}

function extractComp(phase: string): string {
  if (phase.includes('Copa do Mundo')) return 'Copa do Mundo';
  if (phase.includes('Brasileirão'))   return 'Brasileirão';
  if (phase.includes('Champions'))     return 'Champions League';
  if (phase.includes('Libertadores'))  return 'Libertadores';
  if (phase.includes('Sudamericana')) return 'Sudamericana';
  if (phase.includes('Teste'))         return 'Teste';
  return phase.split(' ·')[0].split(' -')[0].trim();
}

function getResult(guess: Guess, match: Match): { points: number; label: string; color: string; icon: string } {
  const pts = calcPoints(
    guess.guess_a, guess.guess_b, guess.guess_penalty_winner,
    match.score_a!, match.score_b!, match.penalty_winner, match.is_knockout, match.phase
  );
  const isExact   = guess.guess_a === match.score_a && guess.guess_b === match.score_b;
  const isDraw    = match.score_a === match.score_b;
  const realSign  = Math.sign((match.score_a ?? 0) - (match.score_b ?? 0));
  const guessSign = Math.sign(guess.guess_a - guess.guess_b);

  if (pts === 0) return { points: 0, label: 'Errou', color: 'var(--danger)', icon: '❌' };

  if (isExact && match.is_knockout && isDraw && guess.guess_penalty_winner === match.penalty_winner) {
    return { points: pts, label: 'Placar exato + pênaltis', color: '#2ea84c', icon: '🏆' };
  }
  if (isExact) return { points: pts, label: 'Placar exato!', color: '#2ea84c', icon: '🎯' };
  if (isDraw && guess.guess_a === guess.guess_b && match.is_knockout && guess.guess_penalty_winner === match.penalty_winner) {
    return { points: pts, label: 'Empate + pênaltis certo', color: '#2ea84c', icon: '✅' };
  }
  if (realSign === guessSign && !isDraw && (guess.guess_a === match.score_a || guess.guess_b === match.score_b)) {
    return { points: pts, label: 'Vencedor + gols de 1 time', color: 'var(--gold)', icon: '⚡' };
  }
  if (pts === 3) {
    const isDraw = match.score_a === match.score_b;
    if (isDraw) return { points: 3, label: 'Empate (sem exato)', color: 'var(--gold)', icon: '🤝' };
    return { points: 3, label: 'Acertou o vencedor', color: 'var(--gold)', icon: '✅' };
  }
  if (pts === 1) return { points: 1, label: 'Gols de 1 time', color: '#8ba9ff', icon: '〰️' };
  return { points: 0, label: 'Errou', color: 'var(--danger)', icon: '❌' };
}

export default function MeusPontos() {
  const params  = useParams();
  const groupId = String(params.id);
  const [items, setItems]         = useState<MatchWithGuess[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [selectedComp, setSelectedComp] = useState<string>('Geral');

  async function loadData() {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { data: member } = await supabase
        .from('group_members').select('id')
        .eq('group_id', groupId).eq('user_id', session.session.user.id).maybeSingle();
      if (!member) return;

      const { data: ms } = await supabase
        .from('matches').select('*')
        .not('score_a', 'is', null)
        .not('score_b', 'is', null)
        .order('match_date', { ascending: false });

      const { data: gs } = await supabase
        .from('guesses').select('*').eq('group_member_id', member.id);

      const guessByMatch: Record<string, Guess> = {};
      (gs || []).forEach(g => { guessByMatch[g.match_id] = g; });

      const result: MatchWithGuess[] = (ms || []).map(m => {
        const guess = guessByMatch[m.id] || null;
        const { points, label, color, icon } = guess
          ? getResult(guess, m)
          : { points: 0, label: 'Sem palpite', color: 'var(--muted)', icon: '—' };
        return { match: m, guess, points, label, color, icon };
      });

      setItems(result);
      if (result.length > 0) {
        const firstDay = toBrazilDay(result[0].match.match_date);
        setExpandedDays({ [firstDay]: true });
      }
      setLoading(false);
    })();
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [groupId]);

  function toggleDay(day: string) {
    setExpandedDays(d => ({ ...d, [day]: !d[day] }));
  }

  // Campeonatos disponíveis
  const comps = ['Geral', ...Array.from(new Set(items.map(i => extractComp(i.match.phase)))).sort()];

  // Filtra por campeonato
  const filtered = selectedComp === 'Geral'
    ? items
    : items.filter(i => extractComp(i.match.phase) === selectedComp);

  const totalPts   = filtered.reduce((sum, i) => sum + i.points, 0);
  const exactHits  = filtered.filter(i => (i.points === 6 || i.points === 9) && i.guess &&
    i.guess.guess_a === i.match.score_a && i.guess.guess_b === i.match.score_b).length;
  const winnerHits = filtered.filter(i => i.points === 3 || i.points === 4).length;

  const byDay: Record<string, MatchWithGuess[]> = {};
  filtered.forEach(item => {
    const day = toBrazilDay(item.match.match_date);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(item);
  });
  const days = Object.keys(byDay).sort().reverse();

  return (
    <main className="app">
      <h1 className="brand" style={{ fontSize: 28, marginBottom: 4, marginTop: 20 }}>Meus Pontos</h1>
      <p className="subtitle" style={{ marginBottom: 16 }}>Seu desempenho nos jogos finalizados.</p>

      {/* Menu de campeonatos */}
      {comps.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {comps.map(comp => (
            <button key={comp} onClick={() => {
              setSelectedComp(comp);
              setExpandedDays({});
            }} style={{
              padding: '8px 14px', borderRadius: 12, border: '1px solid',
              borderColor: selectedComp === comp ? 'var(--gold)' : 'var(--line)',
              background: selectedComp === comp ? 'var(--gold)' : 'var(--card)',
              color: selectedComp === comp ? '#1a1a1a' : 'var(--text)',
              fontWeight: selectedComp === comp ? 700 : 400,
              fontSize: 13, cursor: 'pointer'
            }}>
              {comp}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="empty">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="empty">Nenhum jogo finalizado ainda.</div>
      ) : (
        <>
          {/* Resumo */}
          <div className="card" style={{ marginBottom: 20, background: 'rgba(212,167,44,0.08)', border: '1px solid var(--gold)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
              <div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: 'var(--gold)' }}>{totalPts}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>pts total</div>
              </div>
              <div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: '#2ea84c' }}>{exactHits}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>exatos</div>
              </div>
              <div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: 'var(--gold)' }}>{winnerHits}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>vencedor</div>
              </div>
            </div>
          </div>

          {/* Jogos por dia */}
          {days.map(day => {
            const expanded  = !!expandedDays[day];
            const dayItems  = byDay[day];
            const dayPts    = dayItems.reduce((sum, i) => sum + i.points, 0);

            return (
              <div key={day} style={{ marginBottom: 8 }}>
                <button onClick={() => toggleDay(day)} style={{
                  width: '100%', background: expanded ? 'var(--card)' : 'var(--bg-soft)',
                  border: '1px solid var(--line)',
                  borderRadius: expanded ? '14px 14px 0 0' : 14,
                  padding: '14px 16px', cursor: 'pointer', color: 'var(--text)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {fmtDay(day)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: 'var(--gold)' }}>
                      +{dayPts} pts
                    </span>
                    <span style={{ color: 'var(--muted)', fontSize: 14 }}>{expanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {expanded && (
                  <div style={{ border: '1px solid var(--line)', borderTop: 'none', borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
                    {dayItems.map((item, i) => {
                      const { match: m, guess: g, points, label, color, icon } = item;
                      return (
                        <div key={m.id} style={{
                          padding: 16,
                          borderTop: i > 0 ? '1px solid var(--line)' : 'none',
                          background: 'var(--card)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                              {m.phase.split('·').slice(1).join('·').trim() || m.phase}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                              {new Date(m.match_date).toLocaleTimeString('pt-BR', {
                                timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                            <div style={{ textAlign: 'right', fontWeight: 600, fontSize: 14 }}>{m.team_a}</div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
                                <div style={{
                                  width: 40, height: 40, background: 'var(--bg-soft)',
                                  borderRadius: 10, display: 'flex', alignItems: 'center',
                                  justifyContent: 'center', fontSize: 18, fontWeight: 700,
                                  border: '1px solid var(--line)'
                                }}>{m.score_a}</div>
                                <span style={{ fontSize: 12, color: 'var(--muted)' }}>x</span>
                                <div style={{
                                  width: 40, height: 40, background: 'var(--bg-soft)',
                                  borderRadius: 10, display: 'flex', alignItems: 'center',
                                  justifyContent: 'center', fontSize: 18, fontWeight: 700,
                                  border: '1px solid var(--line)'
                                }}>{m.score_b}</div>
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>resultado</div>
                            </div>
                            <div style={{ textAlign: 'left', fontWeight: 600, fontSize: 14 }}>{m.team_b}</div>
                          </div>

                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px 12px', borderRadius: 12,
                            background: g ? `${color}18` : 'var(--bg-soft)',
                            border: `1px solid ${g ? color : 'var(--line)'}`
                          }}>
                            <div>
                              <span style={{ fontSize: 13, color: color, fontWeight: 700 }}>{icon} {label}</span>
                              {g && (
                                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                                  Seu palpite: {g.guess_a} x {g.guess_b}
                                  {m.is_knockout && g.guess_penalty_winner && (
                                    <> · pên: {g.guess_penalty_winner === 'A' ? m.team_a : m.team_b}</>
                                  )}
                                </div>
                              )}
                              {!g && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Você não palpitou</div>}
                            </div>
                            <div style={{
                              fontFamily: "'Bebas Neue', sans-serif",
                              fontSize: 28, color: points > 0 ? color : 'var(--muted)',
                              minWidth: 48, textAlign: 'right'
                            }}>+{points}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
      <div style={{ height: 100 }} />
    </main>
  );
}
