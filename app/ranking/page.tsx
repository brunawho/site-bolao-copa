'use client';
import { useState, useEffect } from 'react';
import { supabase, type RankingRow } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

export default function Ranking() {
  const [rows, setRows]       = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId]                = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('participant_id') : null
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('ranking').select('*');
      setRows(data || []);
      setLoading(false);
    })();
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <main className="app">
      <h1 className="brand" style={{ fontSize: 28, marginBottom: 4 }}>Ranking</h1>
      <p className="subtitle" style={{ marginBottom: 20 }}>Quem manda no bolão.</p>

      {loading ? (
        <div className="empty">Carregando...</div>
      ) : rows.length === 0 ? (
        <div className="empty">Sem pontuação ainda.<br />Os pontos aparecem quando os jogos terminam.</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {rows.map((r, i) => {
            const isMe = r.id === myId;
            return (
              <div key={r.id} className="rank-row"
                style={{ background: isMe ? 'rgba(212,167,44,0.08)' : undefined }}>
                <span className="rank-pos">
                  {i < 3 ? medals[i] : `${i + 1}º`}
                </span>
                <div>
                  <div className="rank-name">
                    {r.name} {isMe && <span style={{ fontSize: 11, color: 'var(--gold)' }}>← você</span>}
                  </div>
                  <div className="rank-meta">
                    {r.exact_hits} exato{r.exact_hits !== 1 ? 's' : ''} ·{' '}
                    {r.result_hits} result. ·{' '}
                    {r.partial_hits} parcial{r.partial_hits !== 1 ? 'is' : ''}
                  </div>
                </div>
                <span className="rank-points">{r.total_points}</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--card)', borderRadius: 14, border: '1px solid var(--line)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
        <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>Pontuação</strong>
        6 pts · placar exato ou empate exato<br />
        4 pts · vencedor certo + gols de 1 time<br />
        3 pts · só vencedor ou empate sem exato<br />
        1 pt · gols de 1 time sem acertar vencedor<br />
        <span style={{ color: 'var(--gold)' }}>+3 pts bônus</span> · acertar pênaltis no mata-mata
      </div>

      <BottomNav />
    </main>
  );
}
