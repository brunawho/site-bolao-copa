'use client';
import { useState, useEffect } from 'react';
import { supabase, type RankingRow } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

export default function Ranking() {
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('ranking').select('*');
      setRows(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="app">
      <h1 className="brand" style={{ fontSize: 28, marginBottom: 4 }}>Ranking</h1>
      <p className="subtitle" style={{ marginBottom: 20 }}>Quem manda no bolão.</p>

      {loading ? (
        <div className="empty">Carregando...</div>
      ) : rows.length === 0 ? (
        <div className="empty">Sem pontuação ainda.<br/>Os pontos aparecem quando os jogos terminam.</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {rows.map((r, i) => (
            <div key={r.id} className="rank-row">
              <span className="rank-pos">{i + 1}º</span>
              <div>
                <div className="rank-name">{r.name}</div>
                <div className="rank-meta">
                  {r.exact_hits} exato{r.exact_hits !== 1 ? 's' : ''} ·{' '}
                  {r.result_hits} resultado{r.result_hits !== 1 ? 's' : ''}
                </div>
              </div>
              <span className="rank-points">{r.total_points}</span>
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </main>
  );
}
