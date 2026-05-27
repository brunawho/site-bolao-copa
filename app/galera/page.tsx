'use client';
import { useState, useEffect } from 'react';
import { supabase, type Match, type Participant, type Guess } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

export default function Galera() {
  const [people, setPeople] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selected, setSelected] = useState<Participant | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);

  useEffect(() => {
    (async () => {
      const { data: ps } = await supabase.from('participants').select('*').order('name');
      const { data: ms } = await supabase.from('matches').select('*').order('match_date');
      setPeople(ps || []);
      setMatches(ms || []);
    })();
  }, []);

  async function open(p: Participant) {
    setSelected(p);
    const { data } = await supabase.from('guesses').select('*').eq('participant_id', p.id);
    setGuesses(data || []);
  }

  if (selected) {
    const byMatch: Record<string, Guess> = {};
    guesses.forEach((g) => { byMatch[g.match_id] = g; });

    return (
      <main className="app">
        <button className="btn-ghost btn" style={{ width: 'auto', padding: '8px 16px', fontSize: 13, marginBottom: 16 }}
          onClick={() => setSelected(null)}>← Voltar</button>
        <h1 className="brand" style={{ fontSize: 28, marginBottom: 16 }}>{selected.name}</h1>

        {matches.length === 0 && <div className="empty">Sem jogos.</div>}

        {matches.map((m) => {
          const g = byMatch[m.id];
          return (
            <div key={m.id} className="card">
              <div className="match-meta">
                <span>{m.phase}</span>
                <span>{g ? 'Palpitou' : 'Sem palpite'}</span>
              </div>
              <div className="match">
                <div className="team team-a">{m.team_a}</div>
                <div className="score-row">
                  <div className="score-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {g ? g.guess_a : '–'}
                  </div>
                  <span className="vs">x</span>
                  <div className="score-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {g ? g.guess_b : '–'}
                  </div>
                </div>
                <div className="team team-b">{m.team_b}</div>
              </div>
            </div>
          );
        })}
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="app">
      <h1 className="brand" style={{ fontSize: 28, marginBottom: 16 }}>A Galera</h1>
      <p className="subtitle" style={{ marginBottom: 20 }}>Toque em alguém pra ver os palpites.</p>

      {people.length === 0 && <div className="empty">Ninguém entrou ainda.</div>}

      <div className="card" style={{ padding: 0 }}>
        {people.map((p) => (
          <div key={p.id} className="person-item" onClick={() => open(p)}>
            <span style={{ fontWeight: 600 }}>{p.name}</span>
            <span className="chevron">›</span>
          </div>
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
