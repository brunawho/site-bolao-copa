'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase, type RankingRow } from '@/lib/supabase';

type SpecialResult = {
  top_scorer: string | null;
  champion: string | null;
  runner_up: string | null;
  third_place: string | null;
};

type SpecialBet = {
  group_member_id: string;
  top_scorer: string;
  champion: string;
  runner_up: string;
  third_place: string;
};

function calcSpecialPoints(bet: SpecialBet, result: SpecialResult): number {
  const norm = (s: string | null) => s?.toLowerCase().trim() ?? '';
  let pts = 0;
  if (result.champion    && norm(bet.champion)    === norm(result.champion))    pts += 25;
  if (result.runner_up   && norm(bet.runner_up)   === norm(result.runner_up))   pts += 20;
  if (result.third_place && norm(bet.third_place) === norm(result.third_place)) pts += 15;
  if (result.top_scorer  && norm(bet.top_scorer)  === norm(result.top_scorer))  pts += 15;
  return pts;
}

export default function RankingGrupo() {
  const params  = useParams();
  const groupId = String(params.id);
  const [rows, setRows]       = useState<RankingRow[]>([]);
  const [specialBets, setSpecialBets] = useState<SpecialBet[]>([]);
  const [specialResult, setSpecialResult] = useState<SpecialResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      setMyUserId(session.session?.user.id || null);

      const { data: rankData } = await supabase
        .from('ranking').select('*').eq('group_id', groupId);
      setRows(rankData || []);

      // Busca apostas especiais do grupo
      const { data: members } = await supabase
        .from('group_members').select('id').eq('group_id', groupId);
      if (members?.length) {
        const memberIds = members.map((m: any) => m.id);
        const { data: bets } = await supabase
          .from('special_bets').select('*').in('group_member_id', memberIds);
        setSpecialBets(bets || []);
      }

      // Resultado especial
      const { data: res } = await supabase
        .from('special_results').select('*').maybeSingle();
      setSpecialResult(res || null);

      setLoading(false);
    })();
  }, [groupId]);

  // Mapa de user_id → group_member_id
  const getMemberId = (userId: string) => {
    return rows.find(r => r.user_id === userId);
  };

  // Calcula pontos especiais por user
  function getSpecialPts(row: RankingRow): number {
    if (!specialResult) return 0;
    const bet = specialBets.find(b => {
      // precisa achar o group_member_id do user
      return b.group_member_id === row.user_id; // fallback
    });

    // Busca pelo group_member_id correto
    const memberBet = specialBets.find(b => {
      const member = rows.find(r => r.user_id === row.user_id);
      return member && b.group_member_id === (row as any).group_member_id;
    }) ?? specialBets.find(b => b.group_member_id === row.user_id);

    if (!memberBet) return 0;
    return calcSpecialPoints(memberBet, specialResult);
  }

  const medals = ['🥇', '🥈', '🥉'];

  // Ordena combinando pontos de jogos + especiais
  const rowsWithTotal = rows.map(r => ({
    ...r,
    special_pts: getSpecialPts(r),
    grand_total: Number(r.total_points) + getSpecialPts(r)
  })).sort((a, b) => b.grand_total - a.grand_total || b.exact_hits - a.exact_hits);

  return (
    <main className="app">
      <h1 className="brand" style={{ fontSize: 28, marginBottom: 4, marginTop: 20 }}>Ranking</h1>
      <p className="subtitle" style={{ marginBottom: 20 }}>Quem manda nesse grupo.</p>

      {loading ? (
        <div className="empty">Carregando...</div>
      ) : rowsWithTotal.length === 0 ? (
        <div className="empty">Sem pontuação ainda.</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {rowsWithTotal.map((r, i) => {
            const isMe = r.user_id === myUserId;
            return (
              <div key={r.user_id} className="rank-row"
                style={{ background: isMe ? 'rgba(212,167,44,0.08)' : undefined }}>
                <span className="rank-pos">{i < 3 ? medals[i] : `${i + 1}º`}</span>
                <div>
                  <div className="rank-name">
                    {r.name} {isMe && <span style={{ fontSize: 11, color: 'var(--gold)' }}>← você</span>}
                  </div>
                  <div className="rank-meta">
                    {r.exact_hits} exato{r.exact_hits !== 1 ? 's' : ''} ·{' '}
                    {r.result_hits} result. ·{' '}
                    {r.special_pts > 0 && <span style={{ color: 'var(--gold)' }}>+{r.special_pts} especial</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="rank-points">{r.grand_total}</span>
                  {r.special_pts > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--gold)' }}>
                      {r.total_points} + {r.special_pts}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        marginTop: 20, padding: '12px 16px', background: 'var(--card)',
        borderRadius: 14, border: '1px solid var(--line)',
        fontSize: 12, color: 'var(--muted)', lineHeight: 1.8
      }}>
        <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>Pontuação jogos</strong>
        6 pts · placar exato · 4 pts · vencedor + gols · 3 pts · vencedor · 1 pt · gols<br />
        <strong style={{ color: 'var(--text)', display: 'block', marginTop: 8, marginBottom: 4 }}>Apostas especiais</strong>
        🥇 Campeão: <span style={{ color: 'var(--gold)' }}>25 pts</span> ·
        🥈 Vice: <span style={{ color: 'var(--gold)' }}>20 pts</span> ·
        🥉 3º: <span style={{ color: 'var(--gold)' }}>15 pts</span> ·
        ⚽ Artilheiro: <span style={{ color: 'var(--gold)' }}>15 pts</span>
      </div>

      <div style={{ height: 100 }} />
    </main>
  );
}
