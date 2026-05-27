'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase, type Match, type Guess, calcPoints } from '@/lib/supabase';

type Draft = Record<string, { a: string; b: string; pen: 'A' | 'B' | '' }>;

export default function PalpitesGrupo() {
  const params = useParams();
  const groupId = String(params.id);
  const [matches, setMatches]     = useState<Match[]>([]);
  const [myGuesses, setMyGuesses] = useState<Record<string, Guess>>({});
  const [draft, setDraft]         = useState<Draft>({});
  const [memberId, setMemberId]   = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { data: member } = await supabase
        .from('group_members').select('id')
        .eq('group_id', groupId).eq('user_id', session.session.user.id).maybeSingle();
      if (!member) return;

      setMemberId(member.id);
      load(member.id);
    })();
  }, [groupId]);

  async function load(memberId: string) {
    const { data: ms } = await supabase.from('matches').select('*').order('match_date');
    const { data: gs } = await supabase.from('guesses').select('*').eq('group_member_id', memberId);
    setMatches(ms || []);
    const map: Record<string, Guess> = {};
    (gs || []).forEach(g => { map[g.match_id] = g; });
    setMyGuesses(map);
  }

  function setScore(mid: string, side: 'a' | 'b', val: string) {
    const v = val.replace(/\D/g, '').slice(0, 2);
    setDraft(d => ({ ...d, [mid]: { ...(d[mid] || { a: '', b: '', pen: '' }), [side]: v } }));
  }

  function setPen(mid: string, val: 'A' | 'B' | '') {
    setDraft(d => ({ ...d, [mid]: { ...(d[mid] || { a: '', b: '', pen: '' }), pen: val } }));
  }

  const palpitesParaSalvar = Object.entries(draft)
    .filter(([mid, v]) => !myGuesses[mid] && v.a !== '' && v.b !== '').length;

  function abrirConfirmacao() {
    if (palpitesParaSalvar === 0) { showToast('Nenhum palpite novo'); return; }
    setConfirmOpen(true);
  }

  async function confirmarSalvar() {
    if (!memberId) return;
    const toInsert = Object.entries(draft)
      .filter(([mid, v]) => !myGuesses[mid] && v.a !== '' && v.b !== '')
      .map(([mid, v]) => {
        const m = matches.find(x => x.id === mid);
        return {
          group_member_id: memberId,
          match_id: mid,
          guess_a: Number(v.a),
          guess_b: Number(v.b),
          guess_penalty_winner: (m?.is_knockout && v.pen) ? v.pen : null,
        };
      });

    setSaving(true);
    const { error } = await supabase.from('guesses').insert(toInsert);
    setSaving(false); setConfirmOpen(false);

    if (error) { alert('Erro: ' + error.message); return; }
    showToast(`${toInsert.length} palpite(s) salvo(s)! ✅`);
    setDraft({});
    load(memberId);
  }

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 3000);
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  }

  function previewPts(mid: string, m: Match) {
    const d = draft[mid];
    if (!d || d.a === '' || d.b === '') return null;
    if (m.score_a === null) return null;
    return calcPoints(
      Number(d.a), Number(d.b), (d.pen || null) as 'A'|'B'|null,
      m.score_a, m.score_b!, m.penalty_winner,
      m.is_knockout
    );
  }

  const phases = [...new Set(matches.map(m => m.phase.split(' - ')[0]))];

  return (
    <main className="app">
      {toast && <div className="toast">{toast}</div>}

      {confirmOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: 20
        }} onClick={() => !saving && setConfirmOpen(false)}>
          <div style={{
            background: 'var(--card)', border: '2px solid var(--gold)',
            borderRadius: 18, padding: 24, maxWidth: 400, width: '100%'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 22, textAlign: 'center', marginBottom: 12, color: 'var(--gold)' }}>
              Confirmar palpites?
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 8, textAlign: 'center' }}>
              Você vai salvar <strong style={{ color: 'var(--gold)' }}>{palpitesParaSalvar} palpite(s)</strong>.
            </p>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, textAlign: 'center', marginBottom: 20 }}>
              Depois de salvar, <strong style={{ color: 'var(--danger)' }}>não dá pra editar</strong>.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" disabled={saving}
                onClick={() => setConfirmOpen(false)} style={{ flex: 1 }}>Cancelar</button>
              <button className="btn" disabled={saving}
                onClick={confirmarSalvar} style={{ flex: 1 }}>
                {saving ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="brand" style={{ fontSize: 28, marginBottom: 8, marginTop: 20 }}>Palpites</h1>

      <div style={{
        background: 'rgba(227,93,93,0.10)', border: '1px solid var(--danger)',
        borderRadius: 12, padding: '12px 14px', marginBottom: 20,
        fontSize: 13, lineHeight: 1.5
      }}>
        🚫 <strong>Atenção:</strong> palpite enviado <strong style={{ color: 'var(--danger)' }}>não pode ser editado</strong>.
      </div>

      {matches.length === 0 && <div className="empty">Nenhum jogo cadastrado ainda.</div>}

      {phases.map(phase => {
        const phaseMatches = matches.filter(m => m.phase.startsWith(phase));
        return (
          <div key={phase}>
            <h2 style={{ fontSize: 14, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '20px 0 10px' }}>
              {phase}
            </h2>
            {phaseMatches.map(m => {
              const saved = myGuesses[m.id];
              const d = draft[m.id] || { a: '', b: '', pen: '' };
              const pts = previewPts(m.id, m);
              const isDraw = saved
                ? saved.guess_a === saved.guess_b
                : (d.a !== '' && d.b !== '' && d.a === d.b);

              return (
                <div key={m.id} className={`card ${saved ? 'locked' : ''}`}>
                  <div className="match-meta">
                    <span>{m.phase.split(' - ')[1] || m.phase}</span>
                    <span>{fmtDate(m.match_date)}</span>
                  </div>
                  <div className="match">
                    <div className="team team-a">{m.team_a}</div>
                    <div className="score-row">
                      <input className="score-input" inputMode="numeric"
                        value={saved ? String(saved.guess_a) : d.a}
                        onChange={e => setScore(m.id, 'a', e.target.value)}
                        disabled={!!saved} />
                      <span className="vs">x</span>
                      <input className="score-input" inputMode="numeric"
                        value={saved ? String(saved.guess_b) : d.b}
                        onChange={e => setScore(m.id, 'b', e.target.value)}
                        disabled={!!saved} />
                    </div>
                    <div className="team team-b">{m.team_b}</div>
                  </div>

                  {m.is_knockout && isDraw && (
                    <div style={{ marginTop: 12, textAlign: 'center' }}>
                      <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Quem avança nos pênaltis?
                      </p>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        {(['A', 'B'] as const).map(side => {
                          const isSelected = saved ? saved.guess_penalty_winner === side : d.pen === side;
                          return (
                            <button key={side}
                              onClick={() => !saved && setPen(m.id, isSelected ? '' : side)}
                              style={{
                                padding: '8px 16px', borderRadius: 10, border: '1px solid',
                                borderColor: isSelected ? 'var(--gold)' : 'var(--line)',
                                background: isSelected ? 'var(--gold)' : 'var(--bg-soft)',
                                color: isSelected ? '#1a1a1a' : 'var(--text)',
                                fontWeight: 700, fontSize: 13, cursor: saved ? 'default' : 'pointer'
                              }}>
                              {side === 'A' ? m.team_a : m.team_b}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {saved
                      ? <span className="locked-badge">🔒 Palpite enviado</span>
                      : <span></span>}
                    {pts !== null && (
                      <span style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 700 }}>+{pts} pts</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {matches.length > 0 && (
        <button className="btn" onClick={abrirConfirmacao} style={{ marginTop: 8 }}>
          Salvar palpites {palpitesParaSalvar > 0 && `(${palpitesParaSalvar})`}
        </button>
      )}
    </main>
  );
}
