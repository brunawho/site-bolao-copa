'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase, calcPoints, type Match, type Guess } from '@/lib/supabase';

type Member = { id: string; user_id: string; name: string };
type SpecialResult = { top_scorer: string|null; champion: string|null; runner_up: string|null; third_place: string|null };
type SpecialBet    = { group_member_id: string; top_scorer: string; champion: string; runner_up: string; third_place: string };

function extractRound(phase: string): string {
  const match = phase.match(/Rodada (\d+)/);
  return match ? `R${match[1]}` : phase.split('·').pop()?.trim() ?? phase;
}

function calcSpecialPoints(bet: SpecialBet, result: SpecialResult): number {
  const norm = (s: string | null) => s?.toLowerCase().trim() ?? '';
  let pts = 0;
  if (result.champion    && norm(bet.champion)    === norm(result.champion))    pts += 25;
  if (result.runner_up   && norm(bet.runner_up)   === norm(result.runner_up))   pts += 20;
  if (result.third_place && norm(bet.third_place) === norm(result.third_place)) pts += 15;
  if (result.top_scorer  && norm(bet.top_scorer)  === norm(result.top_scorer))  pts += 15;
  return pts;
}

const COLORS = ['#d4a72c', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#fb923c', '#38bdf8', '#4ade80'];
const medals = ['🥇', '🥈', '🥉'];

export default function RankingGrupo() {
  const params  = useParams();
  const groupId = String(params.id);

  const [members, setMembers]         = useState<Member[]>([]);
  const [matches, setMatches]         = useState<Match[]>([]);
  const [allGuesses, setAllGuesses]   = useState<Guess[]>([]);
  const [specialBets, setSpecialBets] = useState<SpecialBet[]>([]);
  const [specialResult, setSpecialResult] = useState<SpecialResult | null>(null);
  const [loading, setLoading]         = useState(true);
  const [myUserId, setMyUserId]       = useState<string | null>(null);
  const [showChart, setShowChart]     = useState(false);
  const [rankTab, setRankTab]         = useState<'geral' | 'selecoes'>('geral');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      setMyUserId(session.session?.user.id || null);

      const { data: ms } = await supabase
        .from('group_members').select('id, user_id').eq('group_id', groupId);
      if (!ms?.length) { setLoading(false); return; }

      const { data: profiles } = await supabase.from('profiles').select('id, name');
      const memberList: Member[] = ms.map((m: any) => ({
        id: m.id, user_id: m.user_id,
        name: profiles?.find((p: any) => p.id === m.user_id)?.name || 'Sem nome'
      }));
      setMembers(memberList);

      const { data: matchData } = await supabase
        .from('matches').select('*').not('score_a', 'is', null).not('score_b', 'is', null)
        .order('match_date');
      setMatches(matchData || []);

      const memberIds = ms.map((m: any) => m.id);
      const { data: guessData } = await supabase
        .from('guesses').select('*').in('group_member_id', memberIds);
      setAllGuesses(guessData || []);

      const { data: bets } = await supabase
        .from('special_bets').select('*').in('group_member_id', memberIds);
      setSpecialBets(bets || []);

      const { data: res } = await supabase.from('special_results').select('*').maybeSingle();
      setSpecialResult(res || null);

      setLoading(false);
    })();
  }, [groupId]);

  // Calcula pontos por membro
  const memberStats = members.map((member, idx) => {
    const guessByMatch: Record<string, Guess> = {};
    allGuesses.filter(g => g.group_member_id === member.id).forEach(g => { guessByMatch[g.match_id] = g; });

    let totalPts = 0, exactHits = 0, winnerHits = 0;
    matches.forEach(m => {
      const g = guessByMatch[m.id];
      if (!g) return;
      const pts = calcPoints(g.guess_a, g.guess_b, g.guess_penalty_winner, m.score_a!, m.score_b!, m.penalty_winner, m.is_knockout);
      totalPts += pts;
      if (pts >= 6 && g.guess_a === m.score_a && g.guess_b === m.score_b) exactHits++;
      if (pts === 3 || pts === 4) winnerHits++;
    });

    let specialPts = 0;
    if (specialResult) {
      const bet = specialBets.find(b => b.group_member_id === member.id);
      if (bet) specialPts = calcSpecialPoints(bet, specialResult);
    }

    return { ...member, total_points: totalPts, exact_hits: exactHits, winner_hits: winnerHits, special_pts: specialPts, grand_total: totalPts + specialPts, color: COLORS[idx % COLORS.length] };
  }).sort((a, b) => b.grand_total - a.grand_total || b.exact_hits - a.exact_hits);

  // Dados do gráfico — pontos acumulados por rodada
  useEffect(() => {
    if (!showChart || !canvasRef.current || !matches.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Agrupa matches por rodada
    const roundMap: Record<string, Match[]> = {};
    matches.forEach(m => {
      const round = extractRound(m.phase);
      if (!roundMap[round]) roundMap[round] = [];
      roundMap[round].push(m);
    });
    const rounds = Object.keys(roundMap).sort((a, b) => {
      const na = parseInt(a.replace('R', '')) || 0;
      const nb = parseInt(b.replace('R', '')) || 0;
      return na - nb;
    });

    // Calcula pontos acumulados por pessoa por rodada
    const memberData = memberStats.map(member => {
      const guessByMatch: Record<string, Guess> = {};
      allGuesses.filter(g => g.group_member_id === member.id).forEach(g => { guessByMatch[g.match_id] = g; });

      let accumulated = 0;
      const points = rounds.map(round => {
        const roundMatches = roundMap[round];
        roundMatches.forEach(m => {
          const g = guessByMatch[m.id];
          if (!g) return;
          accumulated += calcPoints(g.guess_a, g.guess_b, g.guess_penalty_winner, m.score_a!, m.score_b!, m.penalty_winner, m.is_knockout);
        });
        return accumulated;
      });
      return { name: member.name, color: member.color, points };
    });

    // Desenha o gráfico
    const dpr    = window.devicePixelRatio || 1;
    const width  = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width  = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const padL = 40, padR = 16, padT = 16, padB = 40;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;

    ctx.clearRect(0, 0, width, height);

    const maxPts = Math.max(...memberData.flatMap(m => m.points), 1);
    const step   = chartW / Math.max(rounds.length - 1, 1);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (chartH / 4) * i;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + chartW, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px Inter';
      ctx.textAlign = 'right';
      ctx.fillText(String(Math.round(maxPts - (maxPts / 4) * i)), padL - 4, y + 3);
    }

    // Labels eixo X
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '9px Inter';
    ctx.textAlign = 'center';
    const maxLabels = Math.min(rounds.length, 10);
    const labelStep = Math.ceil(rounds.length / maxLabels);
    rounds.forEach((r, i) => {
      if (i % labelStep !== 0 && i !== rounds.length - 1) return;
      const x = padL + i * step;
      ctx.fillText(r, x, height - padB + 14);
    });

    // Linhas por pessoa
    memberData.forEach(member => {
      if (!member.points.length) return;
      ctx.beginPath();
      ctx.strokeStyle = member.color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      member.points.forEach((pts, i) => {
        const x = padL + i * step;
        const y = padT + chartH - (pts / maxPts) * chartH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Ponto final
      const lastX = padL + (member.points.length - 1) * step;
      const lastY = padT + chartH - ((member.points[member.points.length - 1] || 0) / maxPts) * chartH;
      ctx.beginPath();
      ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
      ctx.fillStyle = member.color;
      ctx.fill();
    });

  }, [showChart, matches, allGuesses, memberStats, members]);

  // Melhor da rodada — última rodada com jogos finalizados
  const lastRound = (() => {
    if (!matches.length) return null;
    // Pega a rodada mais recente
    const rounds = Array.from(new Set(matches.map(m => {
      const r = m.phase.match(/Rodada (\d+)/);
      return r ? parseInt(r[1]) : 0;
    }))).filter(r => r > 0).sort((a, b) => b - a);
    return rounds[0] ?? null;
  })();

  const roundStats = lastRound === null ? [] : memberStats.map(member => {
    const guessByMatch: Record<string, Guess> = {};
    allGuesses.filter(g => g.group_member_id === member.id).forEach(g => { guessByMatch[g.match_id] = g; });
    const roundMatches = matches.filter(m => {
      const r = m.phase.match(/Rodada (\d+)/);
      return r && parseInt(r[1]) === lastRound;
    });
    let pts = 0;
    roundMatches.forEach(m => {
      const g = guessByMatch[m.id];
      if (!g) return;
      pts += calcPoints(g.guess_a, g.guess_b, g.guess_penalty_winner, m.score_a!, m.score_b!, m.penalty_winner, m.is_knockout);
    });
    return { name: member.name, pts, color: member.color, user_id: member.user_id };
  }).filter(r => r.pts > 0).sort((a, b) => b.pts - a.pts).slice(0, 3);

  // Ranking de seleções — pontos gerados por cada time da Copa
  const selectionRanking = (() => {
    const wcMatches = matches.filter(m => m.phase.includes('Copa do Mundo'));
    const teamPts: Record<string, number> = {};

    wcMatches.forEach(m => {
      allGuesses.filter(g => members.some(mb => mb.id === g.group_member_id)).forEach(g => {
        if (g.match_id !== m.id) return;
        const pts = calcPoints(g.guess_a, g.guess_b, g.guess_penalty_winner, m.score_a!, m.score_b!, m.penalty_winner, m.is_knockout);
        if (pts > 0) {
          teamPts[m.team_a] = (teamPts[m.team_a] ?? 0) + pts;
          teamPts[m.team_b] = (teamPts[m.team_b] ?? 0) + pts;
        }
      });
    });

    return Object.entries(teamPts)
      .map(([team, pts]) => ({ team, pts }))
      .sort((a, b) => b.pts - a.pts);
  })();

  return (
    <main className="app">
      <h1 className="brand" style={{ fontSize: 28, marginBottom: 4, marginTop: 20 }}>Ranking</h1>
      <p className="subtitle" style={{ marginBottom: 20 }}>Quem manda nesse grupo.</p>

      {loading ? (
        <div className="empty">Carregando...</div>
      ) : (
        <>
          {/* Abas Geral / Seleções */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => setRankTab('geral')} style={{
              flex: 1, padding: '10px', borderRadius: 12, border: '1px solid',
              borderColor: rankTab === 'geral' ? 'var(--gold)' : 'var(--line)',
              background: rankTab === 'geral' ? 'var(--gold)' : 'var(--card)',
              color: rankTab === 'geral' ? '#1a1a1a' : 'var(--text)',
              fontWeight: rankTab === 'geral' ? 700 : 400, fontSize: 13, cursor: 'pointer'
            }}>🏆 Geral</button>
            <button onClick={() => setRankTab('selecoes')} style={{
              flex: 1, padding: '10px', borderRadius: 12, border: '1px solid',
              borderColor: rankTab === 'selecoes' ? 'var(--gold)' : 'var(--line)',
              background: rankTab === 'selecoes' ? 'var(--gold)' : 'var(--card)',
              color: rankTab === 'selecoes' ? '#1a1a1a' : 'var(--text)',
              fontWeight: rankTab === 'selecoes' ? 700 : 400, fontSize: 13, cursor: 'pointer'
            }}>🌍 Seleções</button>
          </div>

          {rankTab === 'geral' ? (
            <div className="card" style={{ padding: 0, marginBottom: 16 }}>
              {memberStats.map((r, i) => {
                const isMe = r.user_id === myUserId;
                const isLeader = i === 0;
                return (
                  <div key={r.id} className="rank-row" style={{
                    background: isLeader
                      ? 'rgba(212,167,44,0.12)'
                      : isMe ? 'rgba(212,167,44,0.06)' : undefined,
                    borderLeft: isLeader ? '3px solid var(--gold)' : undefined,
                  }}>
                    <span className="rank-pos">{i < 3 ? medals[i] : `${i + 1}º`}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                      <div>
                        <div className="rank-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isLeader && (
                            <span style={{
                              fontSize: 16,
                              display: 'inline-block',
                              animation: 'bounce 1s infinite'
                            }}>👑</span>
                          )}
                          {r.name}
                          {isMe && <span style={{ fontSize: 11, color: 'var(--gold)' }}>← você</span>}
                        </div>
                        <div className="rank-meta">
                          {r.exact_hits} exato{r.exact_hits !== 1 ? 's' : ''} · {r.winner_hits} vencedor{r.winner_hits !== 1 ? 'es' : ''}
                          {r.special_pts > 0 && <span style={{ color: 'var(--gold)' }}> · +{r.special_pts} especial</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="rank-points" style={{ color: isLeader ? 'var(--gold)' : undefined }}>{r.grand_total}</span>
                      {r.special_pts > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--gold)' }}>{r.total_points} + {r.special_pts}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card" style={{ padding: 0, marginBottom: 16 }}>
              {selectionRanking.length === 0 ? (
                <div className="empty">Nenhum ponto gerado ainda.</div>
              ) : (
                selectionRanking.map((s, i) => (
                  <div key={s.team} style={{
                    display: 'grid', gridTemplateColumns: '36px 1fr auto',
                    alignItems: 'center', padding: '12px 14px',
                    borderBottom: i < selectionRanking.length - 1 ? '1px solid var(--line)' : 'none'
                  }}>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: 'var(--gold)' }}>
                      {i + 1}º
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{s.team}</span>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: 'var(--gold)' }}>
                      {s.pts}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Botão gráfico */}
          <button className="btn btn-ghost" onClick={() => setShowChart(s => !s)} style={{ marginBottom: 16 }}>
            {showChart ? '▲ Ocultar gráfico' : '📊 Ver evolução de pontos'}
          </button>

          {/* Gráfico */}
          {showChart && (
            <div className="card" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Evolução por rodada</p>
              <canvas ref={canvasRef} style={{ width: '100%', height: 200, display: 'block' }} />
              {/* Legenda */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                {memberStats.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <div style={{ width: 12, height: 3, background: m.color, borderRadius: 2 }} />
                    <span style={{ color: 'var(--muted)' }}>{m.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Melhor da rodada */}
          {roundStats.length > 0 && (
            <div className="card" style={{ marginBottom: 16, background: 'rgba(212,167,44,0.06)', border: '1px solid rgba(212,167,44,0.3)' }}>
              <p style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                🏅 Melhor da Rodada {lastRound}
              </p>
              {roundStats.map((r, i) => (
                <div key={r.user_id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 0',
                  borderTop: i > 0 ? '1px solid var(--line)' : 'none'
                }}>
                  <span style={{ fontSize: 20 }}>{['🥇', '🥈', '🥉'][i]}</span>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>
                    {r.name}
                    {r.user_id === myUserId && <span style={{ fontSize: 11, color: 'var(--gold)', marginLeft: 6 }}>← você</span>}
                  </span>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: 'var(--gold)' }}>
                    +{r.pts} pts
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Legenda pontuação */}
          <div style={{ padding: '12px 16px', background: 'var(--card)', borderRadius: 14, border: '1px solid var(--line)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
            <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>Pontuação</strong>
            6 pts · placar exato · 4 pts · vencedor + gols · 3 pts · vencedor · 1 pt · gols
          </div>
        </>
      )}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
      <div style={{ height: 100 }} />
    </main>
  );
}
