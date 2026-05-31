'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const DEADLINE = new Date('2026-06-11T16:00:00-03:00');

function isDeadlinePassed() {
  return new Date() > DEADLINE;
}

function fmtDeadline() {
  return DEADLINE.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
  });
}

type SpecialBet = {
  id?: string;
  top_scorer: string;
  champion: string;
  runner_up: string;
  third_place: string;
};

type SpecialResult = {
  top_scorer: string | null;
  champion: string | null;
  runner_up: string | null;
  third_place: string | null;
};

export default function ApostasEspeciais() {
  const params = useParams();
  const groupId = String(params.id);

  const [memberId, setMemberId]   = useState<string | null>(null);
  const [bet, setBet]             = useState<SpecialBet>({ top_scorer: '', champion: '', runner_up: '', third_place: '' });
  const [savedBet, setSavedBet]   = useState<SpecialBet | null>(null);
  const [result, setResult]       = useState<SpecialResult | null>(null);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing]     = useState(false);
  const deadline = isDeadlinePassed();

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { data: member } = await supabase
        .from('group_members').select('id')
        .eq('group_id', groupId).eq('user_id', session.session.user.id).maybeSingle();
      if (!member) return;
      setMemberId(member.id);

      // Busca aposta existente
      const { data: existing } = await supabase
        .from('special_bets').select('*')
        .eq('group_member_id', member.id).maybeSingle();
      if (existing) {
        setSavedBet(existing);
        setBet(existing);
      }

      // Busca resultado oficial
      const { data: res } = await supabase
        .from('special_results').select('*').maybeSingle();
      if (res) setResult(res);
    })();
  }, [groupId]);

  async function salvar() {
    if (!memberId) return;
    setSaving(true);

    if (savedBet?.id) {
      // Atualiza
      const { error } = await supabase.from('special_bets').update({
        top_scorer: bet.top_scorer,
        champion: bet.champion,
        runner_up: bet.runner_up,
        third_place: bet.third_place,
        updated_at: new Date().toISOString()
      }).eq('id', savedBet.id);
      if (error) { alert('Erro: ' + error.message); setSaving(false); return; }
    } else {
      // Insere
      const { data, error } = await supabase.from('special_bets').insert({
        group_member_id: memberId,
        top_scorer: bet.top_scorer,
        champion: bet.champion,
        runner_up: bet.runner_up,
        third_place: bet.third_place,
      }).select().single();
      if (error) { alert('Erro: ' + error.message); setSaving(false); return; }
      setSavedBet(data);
    }

    setSaving(false);
    setConfirmOpen(false);
    setEditing(false);
    setSavedBet({ ...bet, id: savedBet?.id });
    showToast('Apostas salvas! ✅');
  }

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 3000);
  }

  function calcPoints() {
    if (!savedBet || !result) return null;
    let pts = 0;
    const norm = (s: string) => s?.toLowerCase().trim();
    if (result.top_scorer && norm(savedBet.top_scorer) === norm(result.top_scorer)) pts += 15;
    if (result.champion   && norm(savedBet.champion)   === norm(result.champion))   pts += 25;
    if (result.runner_up  && norm(savedBet.runner_up)  === norm(result.runner_up))  pts += 20;
    if (result.third_place && norm(savedBet.third_place) === norm(result.third_place)) pts += 15;
    return pts;
  }

  const pts = calcPoints();
  const showForm = editing || !savedBet;
  const canEdit = !deadline;

  const fields = [
    { key: 'champion',    label: '🥇 Campeão',       pts: 25, placeholder: 'Ex: Brasil' },
    { key: 'runner_up',   label: '🥈 Vice-campeão',  pts: 20, placeholder: 'Ex: Argentina' },
    { key: 'third_place', label: '🥉 Terceiro lugar', pts: 15, placeholder: 'Ex: França' },
    { key: 'top_scorer',  label: '⚽ Artilheiro',    pts: 15, placeholder: 'Ex: Vinicius Jr' },
  ] as const;

  return (
    <main className="app">
      {toast && <div className="toast">{toast}</div>}

      {/* Modal de confirmação */}
      {confirmOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: 20
        }} onClick={() => !saving && setConfirmOpen(false)}>
          <div style={{
            background: 'var(--card)', border: '2px solid var(--gold)',
            borderRadius: 18, padding: 24, maxWidth: 400, width: '100%'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>🏆</div>
            <h2 style={{ fontSize: 20, textAlign: 'center', color: 'var(--gold)', marginBottom: 16 }}>
              Confirmar apostas?
            </h2>
            <div style={{ marginBottom: 20 }}>
              {fields.map(f => (
                <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{f.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{bet[f.key] || '—'}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" disabled={saving}
                onClick={() => setConfirmOpen(false)} style={{ flex: 1 }}>Cancelar</button>
              <button className="btn" disabled={saving}
                onClick={salvar} style={{ flex: 1 }}>
                {saving ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="brand" style={{ fontSize: 28, marginBottom: 4, marginTop: 20 }}>Apostas</h1>
      <p className="subtitle" style={{ marginBottom: 16 }}>Especiais da Copa do Mundo.</p>

      {/* Prazo */}
      <div style={{
        padding: '12px 16px', borderRadius: 12, marginBottom: 20,
        background: deadline ? 'rgba(227,93,93,0.1)' : 'rgba(212,167,44,0.1)',
        border: `1px solid ${deadline ? 'var(--danger)' : 'var(--gold)'}`,
        fontSize: 13
      }}>
        {deadline
          ? <span style={{ color: 'var(--danger)' }}>🔒 Prazo encerrado — apostas não podem mais ser alteradas</span>
          : <span>⏰ Prazo para apostas: <strong>{fmtDeadline()}</strong></span>
        }
      </div>

      {/* Pontuação se já tem resultado */}
      {pts !== null && (
        <div className="card" style={{ marginBottom: 20, background: 'rgba(212,167,44,0.08)', border: '1px solid var(--gold)', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, color: 'var(--gold)' }}>{pts}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>pontos especiais</div>
        </div>
      )}

      {/* Formulário */}
      {showForm ? (
        <div>
          <div style={{ marginBottom: 24, padding: '12px 16px', background: 'var(--card)', borderRadius: 14, border: '1px solid var(--line)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
            <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>Pontuação especial</strong>
            🥇 Campeão: <strong style={{ color: 'var(--gold)' }}>25 pts</strong> ·
            🥈 Vice: <strong style={{ color: 'var(--gold)' }}>20 pts</strong> ·
            🥉 3º lugar: <strong style={{ color: 'var(--gold)' }}>15 pts</strong> ·
            ⚽ Artilheiro: <strong style={{ color: 'var(--gold)' }}>15 pts</strong>
          </div>

          {fields.map(f => (
            <div key={f.key} className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label style={{ fontWeight: 700, fontSize: 15 }}>{f.label}</label>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: 'var(--gold)' }}>{f.pts} pts</span>
              </div>
              <input
                className="input"
                placeholder={f.placeholder}
                value={bet[f.key]}
                onChange={e => setBet(b => ({ ...b, [f.key]: e.target.value }))}
                disabled={deadline}
              />
            </div>
          ))}

          {!deadline && (
            <button className="btn" style={{ marginTop: 8 }}
              onClick={() => setConfirmOpen(true)}
              disabled={!bet.champion && !bet.runner_up && !bet.third_place && !bet.top_scorer}>
              Salvar apostas
            </button>
          )}
        </div>
      ) : (
        /* Visualização das apostas salvas */
        <div>
          <div className="card" style={{ padding: 0, marginBottom: 16 }}>
            {fields.map((f, i) => {
              const acertou = result?.[f.key] && savedBet?.[f.key]?.toLowerCase().trim() === result[f.key]?.toLowerCase().trim();
              return (
                <div key={f.key} style={{
                  padding: '16px',
                  borderTop: i > 0 ? '1px solid var(--line)' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{f.label}</div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{savedBet?.[f.key] || '—'}</div>
                    {result?.[f.key] && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        Resultado: {result[f.key]}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {acertou
                      ? <span style={{ color: '#2ea84c', fontFamily: "'Bebas Neue', sans-serif", fontSize: 24 }}>+{f.pts}</span>
                      : result?.[f.key]
                        ? <span style={{ color: 'var(--danger)', fontSize: 20 }}>❌</span>
                        : <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: 'var(--gold)' }}>{f.pts} pts</span>
                    }
                  </div>
                </div>
              );
            })}
          </div>

          {canEdit && (
            <button className="btn btn-ghost" onClick={() => setEditing(true)}>
              ✏️ Editar apostas
            </button>
          )}
        </div>
      )}

      <div style={{ height: 100 }} />
    </main>
  );
}
