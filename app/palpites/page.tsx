'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, type Match, type Guess } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

type Draft = Record<string, { a: string; b: string }>;

export default function Palpites() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [myGuesses, setMyGuesses] = useState<Record<string, Guess>>({});
  const [draft, setDraft] = useState<Draft>({});
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const id = localStorage.getItem('participant_id');
    const name = localStorage.getItem('participant_name') || '';
    if (!id) { router.push('/'); return; }
    setParticipantId(id);
    setParticipantName(name);
    load(id);
  }, [router]);

  async function load(pid: string) {
    const { data: ms } = await supabase
      .from('matches').select('*').order('match_date', { ascending: true });
    const { data: gs } = await supabase
      .from('guesses').select('*').eq('participant_id', pid);

    setMatches(ms || []);
    const map: Record<string, Guess> = {};
    (gs || []).forEach((g) => { map[g.match_id] = g; });
    setMyGuesses(map);
  }

  function setScore(matchId: string, side: 'a' | 'b', val: string) {
    const v = val.replace(/\D/g, '').slice(0, 2);
    setDraft((d) => ({ ...d, [matchId]: { ...(d[matchId] || { a: '', b: '' }), [side]: v } }));
  }

  async function salvar() {
    if (!participantId) return;
    const toInsert = Object.entries(draft)
      .filter(([mid, v]) => !myGuesses[mid] && v.a !== '' && v.b !== '')
      .map(([mid, v]) => ({
        participant_id: participantId,
        match_id: mid,
        guess_a: Number(v.a),
        guess_b: Number(v.b)
      }));

    if (!toInsert.length) { setToast('Nenhum palpite novo'); setTimeout(() => setToast(''), 2000); return; }

    setSaving(true);
    const { error } = await supabase.from('guesses').insert(toInsert);
    setSaving(false);

    if (error) { alert('Erro: ' + error.message); return; }
    setToast(`${toInsert.length} palpite(s) salvo(s)!`);
    setTimeout(() => setToast(''), 2500);
    setDraft({});
    load(participantId);
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  }

  return (
    <main className="app">
      {toast && <div className="toast">{toast}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="brand" style={{ fontSize: 28 }}>Palpites</h1>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>Oi, {participantName}</span>
      </div>

      {matches.length === 0 && <div className="empty">Nenhum jogo cadastrado ainda.</div>}

      {matches.map((m) => {
        const saved = myGuesses[m.id];
        const d = draft[m.id] || { a: '', b: '' };
        return (
          <div key={m.id} className={`card ${saved ? 'locked' : ''}`}>
            <div className="match-meta">
              <span>{m.phase}</span>
              <span>{fmtDate(m.match_date)}</span>
            </div>
            <div className="match">
              <div className="team team-a">{m.team_a}</div>
              <div className="score-row">
                <input
                  className="score-input"
                  inputMode="numeric"
                  value={saved ? String(saved.guess_a) : d.a}
                  onChange={(e) => setScore(m.id, 'a', e.target.value)}
                  disabled={!!saved}
                />
                <span className="vs">x</span>
                <input
                  className="score-input"
                  inputMode="numeric"
                  value={saved ? String(saved.guess_b) : d.b}
                  onChange={(e) => setScore(m.id, 'b', e.target.value)}
                  disabled={!!saved}
                />
              </div>
              <div className="team team-b">{m.team_b}</div>
            </div>
            {saved && <p className="locked-badge" style={{ textAlign: 'center', marginTop: 12 }}>Palpite enviado</p>}
          </div>
        );
      })}

      {matches.length > 0 && (
        <button className="btn" onClick={salvar} disabled={saving} style={{ marginTop: 8 }}>
          {saving ? 'Salvando...' : 'Salvar palpites'}
        </button>
      )}

      <BottomNav />
    </main>
  );
}
