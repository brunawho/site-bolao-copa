'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Competition = { id: string; name: string; code: string };
type CompBet = {
  id?: string;
  group_member_id: string;
  competition_id: string;
  champion: string;
  runner_up: string;
  top_scorer: string;
  top4: string[];
  relegated: string[];
};

function AutocompleteInput({ value, onChange, options, placeholder, disabled }: {
  value: string; onChange: (v: string) => void; options: string[];
  placeholder: string; disabled?: boolean;
}) {
  const [query, setQuery]   = useState(value);
  const [open, setOpen]     = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);
  useEffect(() => {
    if (!query.trim()) { setFiltered([]); return; }
    setFiltered(options.filter(o => o.toLowerCase().includes(query.toLowerCase())).slice(0, 8));
  }, [query, options]);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input value={query} disabled={disabled}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)',
          background: 'var(--bg-soft)', color: 'var(--text)', fontSize: 14,
          opacity: disabled ? 0.5 : 1, boxSizing: 'border-box'
        }} />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)', maxHeight: 200, overflowY: 'auto'
        }}>
          {filtered.map(opt => (
            <div key={opt} onMouseDown={() => { onChange(opt); setQuery(opt); setOpen(false); }}
              style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 14 }}>
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiSelect({ values, onChange, options, placeholder, max, disabled }: {
  values: string[]; onChange: (v: string[]) => void; options: string[];
  placeholder: string; max: number; disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) { setFiltered(options.filter(o => !values.includes(o)).slice(0, 8)); return; }
    setFiltered(options.filter(o => !values.includes(o) && o.toLowerCase().includes(query.toLowerCase())).slice(0, 8));
  }, [query, options, values]);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function add(opt: string) {
    if (values.length >= max) return;
    onChange([...values, opt]);
    setQuery(''); setOpen(false);
  }
  function remove(opt: string) { onChange(values.filter(v => v !== opt)); }

  return (
    <div ref={ref}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {values.map(v => (
          <div key={v} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 20, background: 'rgba(212,167,44,0.2)',
            border: '1px solid var(--gold)', fontSize: 12, color: 'var(--gold)'
          }}>
            {v}
            {!disabled && <span onClick={() => remove(v)} style={{ cursor: 'pointer', fontWeight: 700 }}>✕</span>}
          </div>
        ))}
        {values.length < max && !disabled && (
          <div style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>
            {max - values.length} restante{max - values.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
      {!disabled && values.length < max && (
        <div style={{ position: 'relative' }}>
          <input value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => { setOpen(true); setFiltered(options.filter(o => !values.includes(o)).slice(0, 8)); }}
            placeholder={placeholder}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)',
              background: 'var(--bg-soft)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box'
            }} />
          {open && filtered.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)', maxHeight: 200, overflowY: 'auto'
            }}>
              {filtered.map(opt => (
                <div key={opt} onMouseDown={() => add(opt)}
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 14 }}>
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const BSA_TEAMS = [
  'Flamengo','Palmeiras','Atlético Mineiro','Fluminense','São Paulo','Corinthians',
  'Internacional','Grêmio','Botafogo','Vasco','Santos','Cruzeiro','Athletico Paranaense',
  'Bahia','Fortaleza','Coritiba','RB Bragantino','América Mineiro','Goiás','Cuiabá',
  'Vitória','Criciúma','Mirassol','Chapecoense','Ceará','Sport','Clube do Remo',
  'CA Mineiro','SC Internacional','SC Corinthians Paulista','SE Palmeiras','Fluminense FC',
  'RB Bragantino','EC Bahia','Coritiba FBC','CR Flamengo','Botafogo FR','EC Vitória',
];

const CL_TEAMS = [
  'Real Madrid','Manchester City','Bayern München','Paris Saint-Germain','Liverpool',
  'Chelsea','Arsenal','Barcelona','Atletico Madrid','Juventus','Inter Milan','AC Milan',
  'Borussia Dortmund','RB Leipzig','Napoli','Porto','Benfica','Ajax','PSV Eindhoven',
  'Sporting CP','Feyenoord','Bayer Leverkusen','Monaco','Lazio','Atalanta','Celtic',
];

function getTeamsForComp(code: string): string[] {
  if (code === 'BSA') return BSA_TEAMS;
  if (code === 'CL') return CL_TEAMS;
  return [];
}

function getBetConfig(code: string) {
  if (code === 'BSA') return {
    hasChampion: true, championPts: 50,
    hasRunnerUp: false, runnerUpPts: 0,
    hasTopScorer: true, scorerPts: 50,
    hasTop4: true, top4Pts: 10,
    hasRelegated: true, relegatedPts: 10,
    deadline: new Date('2026-08-01T00:00:00-03:00'),
  };
  if (code === 'CL') return {
    hasChampion: true, championPts: 25,
    hasRunnerUp: true, runnerUpPts: 10,
    hasTopScorer: true, scorerPts: 25,
    hasTop4: false, top4Pts: 0,
    hasRelegated: false, relegatedPts: 0,
    deadline: new Date('2026-09-15T00:00:00-03:00'),
  };
  return null;
}

export default function ApostasCompPage() {
  const params  = useParams();
  const groupId = String(params.id);

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [bet, setBet]       = useState<Partial<CompBet>>({ top4: [], relegated: [] });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { data: member } = await supabase
        .from('group_members').select('id').eq('group_id', groupId)
        .eq('user_id', session.session.user.id).maybeSingle();
      if (!member) return;
      setMemberId(member.id);

      // Busca campeonatos ativos no grupo (exceto Copa do Mundo)
      const { data: gcData } = await supabase
        .from('group_competitions')
        .select('competition_id, competitions(id, name, code)')
        .eq('group_id', groupId);

      const comps = (gcData || [])
        .map((gc: any) => gc.competitions)
        .filter((c: any) => c && c.code !== 'WC');
      setCompetitions(comps);
      if (comps.length > 0) setSelectedComp(comps[0]);
      setLoading(false);
    })();
  }, [groupId]);

  // Carrega aposta ao trocar de campeonato
  useEffect(() => {
    if (!selectedComp || !memberId) return;
    (async () => {
      const { data } = await supabase
        .from('competition_special_bets')
        .select('*')
        .eq('group_member_id', memberId)
        .eq('competition_id', selectedComp.id)
        .maybeSingle();
      if (data) {
        setBet({ ...data, top4: data.top4 || [], relegated: data.relegated || [] });
      } else {
        setBet({ top4: [], relegated: [], competition_id: selectedComp.id, group_member_id: memberId });
      }
    })();
  }, [selectedComp, memberId]);

  async function salvar() {
    if (!memberId || !selectedComp) return;
    setSaving(true);
    const payload = {
      group_member_id: memberId,
      competition_id: selectedComp.id,
      champion: bet.champion || '',
      runner_up: bet.runner_up || '',
      top_scorer: bet.top_scorer || '',
      top4: bet.top4 || [],
      relegated: bet.relegated || [],
    };
    await supabase.from('competition_special_bets').upsert(payload, {
      onConflict: 'group_member_id,competition_id'
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <main className="app"><div className="empty">Carregando...</div></main>;
  if (competitions.length === 0) return (
    <main className="app">
      <h1 className="brand" style={{ fontSize: 24, marginTop: 20 }}>Apostas Especiais</h1>
      <div className="empty" style={{ marginTop: 40 }}>
        Nenhum campeonato ativo neste grupo.<br />
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>O criador pode ativar campeonatos na aba Galera.</span>
      </div>
    </main>
  );

  const config = selectedComp ? getBetConfig(selectedComp.code) : null;
  const teams  = selectedComp ? getTeamsForComp(selectedComp.code) : [];
  const isDeadlinePassed = config ? new Date() > config.deadline : false;

  return (
    <main className="app">
      <h1 className="brand" style={{ fontSize: 24, marginTop: 20, marginBottom: 4 }}>Apostas Especiais</h1>
      <p className="subtitle" style={{ marginBottom: 16 }}>Aposte nos resultados dos campeonatos.</p>

      {/* Seletor de campeonato */}
      {competitions.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {competitions.map(comp => (
            <button key={comp.id} onClick={() => setSelectedComp(comp)} style={{
              flex: 1, padding: '8px', borderRadius: 12, border: '1px solid',
              borderColor: selectedComp?.id === comp.id ? 'var(--gold)' : 'var(--line)',
              background: selectedComp?.id === comp.id ? 'var(--gold)' : 'var(--card)',
              color: selectedComp?.id === comp.id ? '#1a1a1a' : 'var(--text)',
              fontWeight: selectedComp?.id === comp.id ? 700 : 400, fontSize: 12, cursor: 'pointer'
            }}>{comp.name}</button>
          ))}
        </div>
      )}

      {config && (
        <div className="card" style={{ marginBottom: 16 }}>
          {isDeadlinePassed && (
            <div style={{ padding: '8px 12px', background: 'rgba(248,113,113,0.1)', borderRadius: 8, marginBottom: 16, fontSize: 12, color: '#f87171' }}>
              🔒 Apostas encerradas
            </div>
          )}

          {config.hasChampion && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                🏆 Campeão <span style={{ color: 'var(--gold)' }}>+{config.championPts} pts</span>
              </label>
              <AutocompleteInput value={bet.champion || ''} onChange={v => setBet(b => ({ ...b, champion: v }))}
                options={teams} placeholder="Digite o time..." disabled={isDeadlinePassed} />
            </div>
          )}

          {config.hasRunnerUp && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                🥈 Vice-campeão <span style={{ color: 'var(--gold)' }}>+{config.runnerUpPts} pts</span>
              </label>
              <AutocompleteInput value={bet.runner_up || ''} onChange={v => setBet(b => ({ ...b, runner_up: v }))}
                options={teams} placeholder="Digite o time..." disabled={isDeadlinePassed} />
            </div>
          )}

          {config.hasTop4 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                🔝 Top 4 (G4) <span style={{ color: 'var(--gold)' }}>+{config.top4Pts} pts cada</span>
              </label>
              <MultiSelect values={bet.top4 || []} onChange={v => setBet(b => ({ ...b, top4: v }))}
                options={teams} placeholder="Adicionar time..." max={4} disabled={isDeadlinePassed} />
            </div>
          )}

          {config.hasRelegated && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                ⬇️ Rebaixados (Z4) <span style={{ color: 'var(--gold)' }}>+{config.relegatedPts} pts cada</span>
              </label>
              <MultiSelect values={bet.relegated || []} onChange={v => setBet(b => ({ ...b, relegated: v }))}
                options={teams} placeholder="Adicionar time..." max={4} disabled={isDeadlinePassed} />
            </div>
          )}

          {config.hasTopScorer && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                ⚽ Artilheiro <span style={{ color: 'var(--gold)' }}>+{config.scorerPts} pts</span>
              </label>
              <input value={bet.top_scorer || ''} disabled={isDeadlinePassed}
                onChange={e => setBet(b => ({ ...b, top_scorer: e.target.value }))}
                placeholder="Nome do jogador..."
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)',
                  background: 'var(--bg-soft)', color: 'var(--text)', fontSize: 14,
                  opacity: isDeadlinePassed ? 0.5 : 1, boxSizing: 'border-box'
                }} />
            </div>
          )}

          {!isDeadlinePassed && (
            <button className="btn" onClick={salvar} disabled={saving} style={{ width: '100%' }}>
              {saving ? 'Salvando...' : saved ? '✅ Salvo!' : 'Salvar apostas'}
            </button>
          )}
        </div>
      )}

      <div style={{ height: 80 }} />
    </main>
  );
}
