'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const DEADLINE = new Date('2026-06-11T16:00:00-03:00');

function isDeadlinePassed() { return new Date() > DEADLINE; }

function fmtDeadline() {
  return DEADLINE.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
  });
}

type Team   = { id: number; name: string };
type Player = { name: string; team: string; position: string };
type SpecialBet = { id?: string; top_scorer: string; champion: string; runner_up: string; third_place: string };
type SpecialResult = { top_scorer: string|null; champion: string|null; runner_up: string|null; third_place: string|null };

// Componente de autocomplete reutilizável
function AutocompleteInput({
  value, onChange, options, placeholder, disabled, getLabel
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  getLabel?: (opt: string) => string;
}) {
  const [query, setQuery]     = useState(value);
  const [open, setOpen]       = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    if (!query.trim()) { setFiltered([]); return; }
    const q = query.toLowerCase();
    setFiltered(options.filter(o => o.toLowerCase().includes(q)).slice(0, 8));
  }, [query, options]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function select(opt: string) {
    setQuery(opt);
    onChange(opt);
    setOpen(false);
    setFiltered([]);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        className="input"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => query && setOpen(true)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, right: 0,
          background: 'var(--card)', border: '1px solid var(--gold)',
          borderRadius: 12, zIndex: 100, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}>
          {filtered.map(opt => (
            <div key={opt} onClick={() => select(opt)}
              style={{
                padding: '12px 16px', cursor: 'pointer', fontSize: 14,
                borderBottom: '1px solid var(--line)',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--line)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {getLabel ? getLabel(opt) : opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ApostasEspeciais() {
  const params  = useParams();
  const groupId = String(params.id);

  const [memberId, setMemberId]   = useState<string | null>(null);
  const [bet, setBet]             = useState<SpecialBet>({ top_scorer: '', champion: '', runner_up: '', third_place: '' });
  const [savedBet, setSavedBet]   = useState<SpecialBet | null>(null);
  const [result, setResult]       = useState<SpecialResult | null>(null);
  const [teams, setTeams]         = useState<string[]>([]);
  const [players, setPlayers]     = useState<Player[]>([]);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing]     = useState(false);
  const [loadingData, setLoadingData] = useState(true);
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
        .from('special_bets').select('*').eq('group_member_id', member.id).maybeSingle();
      if (existing) { setSavedBet(existing); setBet(existing); }

      // Resultado oficial
      const { data: res } = await supabase.from('special_results').select('*').maybeSingle();
      if (res) setResult(res);

      // Busca times e jogadores da API
      const wcRes = await fetch('/api/wc-data');
      if (wcRes.ok) {
        const wcData = await wcRes.json();
        setTeams((wcData.teams ?? []).map((t: Team) => t.name));
        setPlayers(wcData.players ?? []);
      }
      setLoadingData(false);
    })();
  }, [groupId]);

  const playerOptions = players.map(p => p.name);
  const playerLabel   = (name: string) => {
    const p = players.find(pl => pl.name === name);
    return p ? `${name} · ${p.team}` : name;
  };

  async function salvar() {
    if (!memberId) return;
    setSaving(true);

    const payload = {
      top_scorer:  bet.top_scorer,
      champion:    bet.champion,
      runner_up:   bet.runner_up,
      third_place: bet.third_place,
      updated_at:  new Date().toISOString()
    };

    if (savedBet?.id) {
      const { error } = await supabase.from('special_bets').update(payload).eq('id', savedBet.id);
      if (error) { alert('Erro: ' + error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from('special_bets')
        .insert({ group_member_id: memberId, ...payload }).select().single();
      if (error) { alert('Erro: ' + error.message); setSaving(false); return; }
      setSavedBet({ ...bet, id: data.id });
    }

    const newSaved = { ...(savedBet ?? {}), ...bet } as SpecialBet & { id?: string };
    setSavedBet(newSaved);
    setSaving(false); setConfirmOpen(false); setEditing(false);
    showToast('Apostas salvas! ✅');
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  function calcPoints() {
    if (!savedBet || !result) return null;
    const norm = (s: string) => s?.toLowerCase().trim();
    let pts = 0;
    if (result.top_scorer  && norm(savedBet.top_scorer)  === norm(result.top_scorer))  pts += 15;
    if (result.champion    && norm(savedBet.champion)    === norm(result.champion))    pts += 25;
    if (result.runner_up   && norm(savedBet.runner_up)   === norm(result.runner_up))   pts += 20;
    if (result.third_place && norm(savedBet.third_place) === norm(result.third_place)) pts += 15;
    return pts;
  }

  const pts = calcPoints();
  const showForm = editing || !savedBet;

  const teamFields = [
    { key: 'champion'    as const, label: '🥇 Campeão',       pts: 25 },
    { key: 'runner_up'   as const, label: '🥈 Vice-campeão',  pts: 20 },
    { key: 'third_place' as const, label: '🥉 Terceiro lugar', pts: 15 },
  ];

  return (
    <main className="app">
      {toast && <div className="toast">{toast}</div>}

      {/* Modal confirmação */}
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
            {[...teamFields, { key: 'top_scorer' as const, label: '⚽ Artilheiro', pts: 15 }].map(f => (
              <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{f.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{bet[f.key] || '—'}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-ghost" disabled={saving}
                onClick={() => setConfirmOpen(false)} style={{ flex: 1 }}>Cancelar</button>
              <button className="btn" disabled={saving} onClick={salvar} style={{ flex: 1 }}>
                {saving ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="brand" style={{ fontSize: 28, marginBottom: 4, marginTop: 20 }}>Especiais</h1>
      <p className="subtitle" style={{ marginBottom: 16 }}>Apostas especiais da Copa do Mundo.</p>

      {/* Prazo */}
      <div style={{
        padding: '12px 16px', borderRadius: 12, marginBottom: 20,
        background: deadline ? 'rgba(227,93,93,0.1)' : 'rgba(212,167,44,0.1)',
        border: `1px solid ${deadline ? 'var(--danger)' : 'var(--gold)'}`,
        fontSize: 13
      }}>
        {deadline
          ? <span style={{ color: 'var(--danger)' }}>🔒 Prazo encerrado</span>
          : <span>⏰ Prazo: <strong>{fmtDeadline()}</strong> · Pode editar até lá</span>
        }
      </div>

      {/* Pontuação */}
      {pts !== null && (
        <div className="card" style={{ marginBottom: 20, background: 'rgba(212,167,44,0.08)', border: '1px solid var(--gold)', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, color: 'var(--gold)' }}>{pts}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>pontos especiais</div>
        </div>
      )}

      {showForm ? (
        loadingData ? (
          <div className="empty">Carregando dados da Copa...</div>
        ) : (
          <div>
            {/* Pontuação resumo */}
            <div style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--card)', borderRadius: 14, border: '1px solid var(--line)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
              <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>Pontuação</strong>
              🥇 Campeão: <strong style={{ color: 'var(--gold)' }}>25 pts</strong> ·
              🥈 Vice: <strong style={{ color: 'var(--gold)' }}>20 pts</strong> ·
              🥉 3º lugar: <strong style={{ color: 'var(--gold)' }}>15 pts</strong> ·
              ⚽ Artilheiro: <strong style={{ color: 'var(--gold)' }}>15 pts</strong>
            </div>

            {/* Países */}
            {teamFields.map(f => (
              <div key={f.key} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label style={{ fontWeight: 700, fontSize: 15 }}>{f.label}</label>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: 'var(--gold)' }}>{f.pts} pts</span>
                </div>
                <AutocompleteInput
                  value={bet[f.key]}
                  onChange={val => setBet(b => ({ ...b, [f.key]: val }))}
                  options={teams}
                  placeholder="Digite o nome da seleção..."
                  disabled={deadline}
                />
              </div>
            ))}

            {/* Artilheiro */}
            <div className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label style={{ fontWeight: 700, fontSize: 15 }}>⚽ Artilheiro</label>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: 'var(--gold)' }}>15 pts</span>
              </div>
              <AutocompleteInput
                value={bet.top_scorer}
                onChange={val => setBet(b => ({ ...b, top_scorer: val }))}
                options={playerOptions}
                placeholder="Digite o nome do jogador..."
                disabled={deadline}
                getLabel={playerLabel}
              />
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                Filtra por nome — mostra o time ao lado
              </p>
            </div>

            {!deadline && (
              <button className="btn" style={{ marginTop: 8 }}
                onClick={() => setConfirmOpen(true)}
                disabled={!bet.champion && !bet.runner_up && !bet.third_place && !bet.top_scorer}>
                Salvar apostas
              </button>
            )}
          </div>
        )
      ) : (
        /* Visualização */
        <div>
          <div className="card" style={{ padding: 0, marginBottom: 16 }}>
            {[...teamFields, { key: 'top_scorer' as const, label: '⚽ Artilheiro', pts: 15 }].map((f, i) => {
              const acertou = result?.[f.key] && savedBet?.[f.key]?.toLowerCase().trim() === result[f.key]?.toLowerCase().trim();
              return (
                <div key={f.key} style={{
                  padding: '16px', borderTop: i > 0 ? '1px solid var(--line)' : 'none',
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

          {!deadline && (
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
