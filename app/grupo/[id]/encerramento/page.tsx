'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase, calcPoints, type Match, type Guess } from '@/lib/supabase';

type Member = { id: string; user_id: string; name: string; color: string };
const COLORS = ['#39FF14', '#7B5EFF', '#FFD700', '#FF1744', '#00B0FF', '#FF9900', '#CCFF00', '#CC00FF'];

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      w: Math.random() * 10 + 5,
      h: Math.random() * 6 + 3,
      color: ['#39FF14', '#7B5EFF', '#FFD700', '#FF1744', '#00B0FF', '#FF9900'][Math.floor(Math.random() * 6)],
      speed: Math.random() * 3 + 1,
      angle: Math.random() * 360,
      spin: Math.random() * 4 - 2,
    }));

    let frame: number;
    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        p.y += p.speed;
        p.angle += p.spin;
        if (p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width; }
      });
      frame = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 0 }} />;
}

export default function EncerramentoPage() {
  const params  = useParams();
  const groupId = String(params.id);
  const [ranking, setRanking]     = useState<(Member & { grand_total: number; exact_hits: number; pos: number })[]>([]);
  const [payment, setPayment]     = useState<any>(null);
  const [memberPayments, setMemberPayments] = useState<Record<string, boolean>>({});
  const [specialResult, setSpecialResult]   = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [myUserId, setMyUserId]   = useState<string | null>(null);

  const medals = ['🥇', '🥈', '🥉'];

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      setMyUserId(session.session?.user.id || null);

      const { data: ms } = await supabase
        .from('group_members').select('id, user_id').eq('group_id', groupId);
      if (!ms?.length) { setLoading(false); return; }

      const { data: profiles } = await supabase.from('profiles').select('id, name');
      const members: Member[] = ms.map((m: any, i: number) => ({
        id: m.id, user_id: m.user_id,
        name: profiles?.find((p: any) => p.id === m.user_id)?.name || 'Sem nome',
        color: COLORS[i % COLORS.length]
      }));

      const { data: matches } = await supabase
        .from('matches').select('*').not('score_a', 'is', null).not('score_b', 'is', null);

      const memberIds = ms.map((m: any) => m.id);
      const { data: allGuesses } = await supabase
        .from('guesses').select('*').in('group_member_id', memberIds);

      const { data: specialBets } = await supabase
        .from('special_bets').select('*').in('group_member_id', memberIds);
      const { data: specialRes } = await supabase.from('special_results').select('*').maybeSingle();
      setSpecialResult(specialRes);

      const { data: payData } = await supabase
        .from('group_payments').select('*').eq('group_id', groupId).maybeSingle();
      setPayment(payData);

      const { data: memberPays } = await supabase
        .from('member_payments').select('user_id, paid').eq('group_id', groupId);
      const payMap: Record<string, boolean> = {};
      (memberPays || []).forEach((p: any) => { payMap[p.user_id] = p.paid; });
      setMemberPayments(payMap);

      // Calcula ranking final
      const norm = (s: string | null) => s?.toLowerCase().trim() ?? '';
      const ranked = members.map(member => {
        const guessByMatch: Record<string, Guess> = {};
        (allGuesses || []).filter((g: any) => g.group_member_id === member.id)
          .forEach((g: any) => { guessByMatch[g.match_id] = g; });

        let totalPts = 0, exactHits = 0;
        (matches || []).forEach((m: any) => {
          const g = guessByMatch[m.id];
          if (!g) return;
          const pts = calcPoints(g.guess_a, g.guess_b, g.guess_penalty_winner, m.score_a, m.score_b, m.penalty_winner, m.is_knockout, m.phase);
          totalPts += pts;
          if (pts >= 6 && g.guess_a === m.score_a && g.guess_b === m.score_b) exactHits++;
        });

        let specialPts = 0;
        if (specialRes) {
          const bet = (specialBets || []).find((b: any) => b.group_member_id === member.id);
          if (bet) {
            if (specialRes.champion    && norm(bet.champion)    === norm(specialRes.champion))    specialPts += 25;
            if (specialRes.runner_up   && norm(bet.runner_up)   === norm(specialRes.runner_up))   specialPts += 20;
            if (specialRes.third_place && norm(bet.third_place) === norm(specialRes.third_place)) specialPts += 15;
            if (specialRes.top_scorer  && norm(bet.top_scorer)  === norm(specialRes.top_scorer))  specialPts += 15;
          }
        }

        return { ...member, total_points: totalPts, exact_hits: exactHits, special_pts: specialPts, grand_total: totalPts + specialPts };
      }).sort((a, b) => b.grand_total - a.grand_total || b.exact_hits - a.exact_hits)
        .map(r => ({
          ...r,
          pos: 0 // calculado abaixo
        }));

      // Posição compartilhada
      const withPos = ranked.map(r => ({
        ...r,
        pos: ranked.filter(o => o.grand_total > r.grand_total || (o.grand_total === r.grand_total && o.exact_hits > r.exact_hits)).length + 1
      }));

      setRanking(withPos);
      setLoading(false);
    })();
  }, [groupId]);

  if (loading) return <main className="app"><div className="empty">Carregando...</div></main>;

  const totalArrecadado = Object.values(memberPayments).filter(Boolean).length * (payment?.entry_value || 0);
  const prize1 = totalArrecadado * (payment?.prize_1st || 0) / 100;
  const prize2 = totalArrecadado * (payment?.prize_2nd || 0) / 100;
  const prize3 = totalArrecadado * (payment?.prize_3rd || 0) / 100;
  const prizes = [prize1, prize2, prize3];

  const winner = ranking[0];

  return (
    <main className="app" style={{ position: 'relative' }}>
      <Confetti />
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Cabeçalho */}
        <div style={{ textAlign: 'center', marginTop: 30, marginBottom: 30 }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>🏆</div>
          <h1 className="brand">BOLÃO<br /><span style={{ color: 'var(--gold)', textShadow: 'var(--shadow-gold)' }}>ENCERRADO</span></h1>
          <p style={{ fontSize: 11, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 6 }}>Copa do Mundo 2026 · Fim de jogo</p>
        </div>

        {/* Campeão */}
        {winner && (
          <div className="card" style={{ marginBottom: 20, background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.3)', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>👑</div>
            <p style={{ fontSize: 13, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 4 }}>👑 Campeão do Bolão</p>
            <h2 style={{ fontSize: 36, color: 'var(--gold)', fontFamily: "'Bebas Neue', sans-serif", textShadow: 'var(--shadow-gold)', marginBottom: 4 }}>
              {winner.name}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--sub)' }}>
              {winner.grand_total} pts · {winner.exact_hits} exato{winner.exact_hits !== 1 ? 's' : ''}
            </p>
            {prize1 > 0 && (
              <div style={{ marginTop: 12, fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: 'var(--gold)' }}>
                R$ {prize1.toFixed(2)}
              </div>
            )}
          </div>
        )}

        {/* Ranking final */}
        <div className="card" style={{ padding: 0, marginBottom: 16 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>🏅 Ranking Final</h3>
          </div>
          {ranking.map((r, i) => {
            const isMe = r.user_id === myUserId;
            const posLabel = r.pos <= 3 ? medals[r.pos - 1] : `${r.pos}º`;
            const prize = prizes[r.pos - 1];
            return (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '14px 16px',
                borderBottom: i < ranking.length - 1 ? '1px solid var(--line)' : 'none',
                background: isMe ? 'rgba(212,167,44,0.06)' : undefined
              }}>
                <span style={{ fontSize: 20, minWidth: 28 }}>{posLabel}</span>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: `${r.color}30`, border: `2px solid ${r.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: r.color, flexShrink: 0
                }}>
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {r.name} {isMe && <span style={{ fontSize: 11, color: 'var(--gold)' }}>← você</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--sub)' }}>
                    {r.exact_hits} exato{r.exact_hits !== 1 ? 's' : ''}
                    {(r as any).special_pts > 0 && <span style={{ color: 'var(--gold)' }}> · +{(r as any).special_pts} especial</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: r.pos === 1 ? 'var(--gold)' : 'var(--text)' }}>
                    {r.grand_total}
                  </div>
                  {prize > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>R$ {prize.toFixed(2)}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Resultado especial */}
        {specialResult && (
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>🌟 Resultados da Copa</h3>
            {[
              { label: '🥇 Campeão', value: specialResult.champion },
              { label: '🥈 Vice', value: specialResult.runner_up },
              { label: '🥉 3º lugar', value: specialResult.third_place },
              { label: '⚽ Artilheiro', value: specialResult.top_scorer },
            ].filter(r => r.value).map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--sub)' }}>{r.label}</span>
                <span style={{ fontWeight: 700 }}>{r.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Caixinha final */}
        {totalArrecadado > 0 && (
          <div className="card" style={{ marginBottom: 16, background: 'rgba(16,185,129,0.06)', border: '1px solid var(--green)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>💰 Distribuição do Prêmio</h3>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: 'var(--green)' }}>R$ {totalArrecadado.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: 'var(--sub)' }}>total arrecadado</div>
            </div>
            {[
              { pos: 1, label: '🥇', prize: prize1 },
              { pos: 2, label: '🥈', prize: prize2 },
              { pos: 3, label: '🥉', prize: prize3 },
            ].filter(p => p.prize > 0).map(p => {
              const winners = ranking.filter(r => r.pos === p.pos);
              return winners.map(w => (
                <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                  <span>{p.label} {w.name}</span>
                  <span style={{ color: 'var(--green)', fontWeight: 700 }}>R$ {(p.prize / winners.length).toFixed(2)}</span>
                </div>
              ));
            })}
          </div>
        )}

        <div style={{ height: 100 }} />
      </div>
    </main>
  );
}
