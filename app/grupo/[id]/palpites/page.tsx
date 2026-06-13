'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase, type Match, type Guess, calcPoints } from '@/lib/supabase';

type Draft = Record<string, { a: string; b: string; pen: 'A' | 'B' | '' }>;

function toBrazilDay(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).split('/').reverse().join('-');
}

function todayBrazil() {
  return new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).split('/').reverse().join('-');
}

function fmtDay(dateYMD: string) {
  const [y, m, d] = dateYMD.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long'
  });
}

function jogoComecou(matchDate: string) {
  return new Date(matchDate) <= new Date();
}

// Extrai o nome do campeonato da fase
function extractComp(phase: string): string {
  if (phase.includes('Copa do Mundo')) return 'Copa do Mundo';
  if (phase.includes('Brasileirão'))   return 'Brasileirão';
  if (phase.includes('Champions'))     return 'Champions League';
  if (phase.includes('Libertadores'))  return 'Libertadores';
  if (phase.includes('Sudamericana')) return 'Sudamericana';
  if (phase.includes('Teste'))         return 'Teste';
  return phase.split(' ·')[0].split(' -')[0].trim();
}


// Componente de escudo/bandeira
function Crest({ name, crests, size = 24 }: { name: string; crests: Record<string, string>; size?: number }) {
  const url = crests[name];
  if (!url) return null;
  return (
    <img
      src={url}
      alt={name}
      width={size}
      height={size}
      style={{ objectFit: 'contain', flexShrink: 0 }}
      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );
}


// Componente de Chaveamento Visual da Copa
function Chaveamento({ matches, myGuesses }: { matches: any[], myGuesses: Record<string, any> }) {
  const stages = [
    { key: 'ROUND_OF_16',   label: 'Oitavas',    rounds: 8 },
    { key: 'QUARTER_FINALS', label: 'Quartas',   rounds: 4 },
    { key: 'SEMI_FINALS',   label: 'Semifinais', rounds: 2 },
    { key: 'THIRD_PLACE',   label: '3º Lugar',   rounds: 1 },
    { key: 'FINAL',         label: 'Final',      rounds: 1 },
  ];

  function getStageMatches(stageKey: string) {
    return matches.filter(m => m.phase.toUpperCase().includes(stageKey));
  }

  function MatchCard({ m }: { m: any }) {
    const guess  = myGuesses[m.id];
    const isDone = m.score_a !== null;
    const isUpcoming = !isDone;

    return (
      <div style={{
        background: 'var(--card)', border: '1px solid var(--line)',
        borderRadius: 10, padding: '8px 10px', minWidth: 160,
        fontSize: 12
      }}>
        {/* Time A */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {toPT(m.team_a) || '?'}
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 4 }}>
            {isDone && (
              <span style={{
                fontWeight: 700, fontSize: 14,
                color: m.score_a > m.score_b ? 'var(--gold)' : 'var(--muted)'
              }}>{m.score_a}</span>
            )}
            {guess && (
              <span style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--bg-soft)', padding: '1px 4px', borderRadius: 4 }}>
                {guess.guess_a}
              </span>
            )}
          </div>
        </div>
        {/* Divisor */}
        <div style={{ borderTop: '1px solid var(--line)', margin: '4px 0' }} />
        {/* Time B */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {toPT(m.team_b) || '?'}
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 4 }}>
            {isDone && (
              <span style={{
                fontWeight: 700, fontSize: 14,
                color: m.score_b > m.score_a ? 'var(--gold)' : 'var(--muted)'
              }}>{m.score_b}</span>
            )}
            {guess && (
              <span style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--bg-soft)', padding: '1px 4px', borderRadius: 4 }}>
                {guess.guess_b}
              </span>
            )}
          </div>
        </div>
        {/* Data */}
        {isUpcoming && (
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, textAlign: 'center' }}>
            {new Date(m.match_date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })}
          </div>
        )}
      </div>
    );
  }

  const knockoutMatches = matches.filter(m =>
    stages.some(s => m.phase.toUpperCase().includes(s.key))
  );

  if (knockoutMatches.length === 0) {
    return (
      <div className="empty" style={{ marginTop: 20 }}>
        ⏳ O chaveamento será exibido quando o mata-mata começar.
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Legenda */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, fontSize: 11, color: 'var(--muted)' }}>
        <span>Placar real: <strong style={{ color: 'var(--gold)' }}>grande</strong></span>
        <span>Seu palpite: <span style={{ background: 'var(--bg-soft)', padding: '1px 4px', borderRadius: 4 }}>pequeno</span></span>
      </div>

      {stages.map(stage => {
        const stageMatches = getStageMatches(stage.key);
        if (!stageMatches.length) return null;
        return (
          <div key={stage.key} style={{ marginBottom: 24 }}>
            <p style={{
              fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: 'var(--gold)', marginBottom: 10
            }}>
              {stage.label} ({stageMatches.length} jogos)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stageMatches.map(m => (
                <MatchCard key={m.id} m={m} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}


const TEAM_TRANSLATIONS: Record<string, string> = {
  'Algeria': 'Argélia', 'Argentina': 'Argentina', 'Australia': 'Austrália',
  'Austria': 'Áustria', 'Belgium': 'Bélgica', 'Bosnia-Herzegovina': 'Bósnia-Herzegovina',
  'Brazil': 'Brasil', 'Canada': 'Canadá', 'Cape Verde Islands': 'Cabo Verde',
  'Colombia': 'Colômbia', 'Congo DR': 'Congo', 'Croatia': 'Croácia',
  'Curaçao': 'Curaçao', 'Czechia': 'República Tcheca', 'Ecuador': 'Equador',
  'Egypt': 'Egito', 'England': 'Inglaterra', 'France': 'França',
  'Germany': 'Alemanha', 'Ghana': 'Gana', 'Haiti': 'Haiti',
  'Iran': 'Irã', 'Iraq': 'Iraque', 'Ivory Coast': 'Costa do Marfim',
  'Japan': 'Japão', 'Jordan': 'Jordânia', 'Mexico': 'México',
  'Morocco': 'Marrocos', 'Netherlands': 'Holanda', 'New Zealand': 'Nova Zelândia',
  'Norway': 'Noruega', 'Panama': 'Panamá', 'Paraguay': 'Paraguai',
  'Portugal': 'Portugal', 'Qatar': 'Catar', 'Saudi Arabia': 'Arábia Saudita',
  'Scotland': 'Escócia', 'Senegal': 'Senegal', 'South Africa': 'África do Sul',
  'South Korea': 'Coreia do Sul', 'Spain': 'Espanha', 'Sweden': 'Suécia',
  'Switzerland': 'Suíça', 'Tunisia': 'Tunísia', 'Turkey': 'Turquia',
  'United States': 'Estados Unidos', 'Uruguay': 'Uruguai', 'Uzbekistan': 'Uzbequistão',
};

function toPT(name: string): string {
  return TEAM_TRANSLATIONS[name] || name;
}

function timeUntil(matchDate: string): string | null {
  const diff = new Date(matchDate).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return null;
  if (h > 0) return `Fecha em ${h}h ${m}min`;
  if (m > 0) return `Fecha em ${m}min`;
  return 'Fechando agora';
}

export default function PalpitesGrupo() {
  const params  = useParams();
  const groupId = String(params.id);

  const [matches, setMatches]     = useState<Match[]>([]);
  const [myGuesses, setMyGuesses] = useState<Record<string, Guess>>({});
  const [draft, setDraft]         = useState<Draft>({});
  const [memberId, setMemberId]   = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState('');
  const [confirmDay, setConfirmDay]     = useState<string | null>(null);
  const [confirmMatches, setConfirmMatches] = useState<Match[]>([]);
  const [crests, setCrests]       = useState<Record<string, string>>({});

  // Seleção de campeonato e dia
  const [selectedComp, setSelectedComp] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'upcoming' | 'today' | 'past'>('today');
  const [view, setView]     = useState<'palpites' | 'chaveamento'>('palpites');
  const [savedRecently, setSavedRecently] = useState<Set<string>>(new Set());

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
      // Busca bandeiras e escudos dos times
      fetch('/api/wc-data').then(r => r.json()).then(d => {
        const crestMap: Record<string, string> = {};
        // Mapa completo do endpoint
        if (d.crests) {
          Object.entries(d.crests).forEach(([name, url]) => {
            if (url) crestMap[name as string] = url as string;
          });
        }
        // Times individuais com flag
        (d.teams ?? []).forEach((t: any) => {
          if (t.flag) crestMap[t.name] = t.flag;
        });
        // Fallback: busca também pelo nome sem acento
        const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        Object.keys(crestMap).forEach(key => {
          const norm = normalize(key);
          if (!crestMap[norm]) crestMap[norm] = crestMap[key];
        });
        setCrests(crestMap);
      }).catch(() => {});
    })();
  }, [groupId]);

  async function load(mid: string) {
    const { data: ms } = await supabase.from('matches').select('*').order('match_date');
    const { data: gs } = await supabase.from('guesses').select('*').eq('group_member_id', mid);
    setMatches(ms || []);
    const map: Record<string, Guess> = {};
    (gs || []).forEach(g => { map[g.match_id] = g; });
    setMyGuesses(map);
    setExpandedDays({ [todayBrazil()]: true });
  }

  function toggleDay(day: string) {
    setExpandedDays(d => ({ ...d, [day]: !d[day] }));
  }

  function setScore(mid: string, side: 'a' | 'b', val: string) {
    const v = val.replace(/\D/g, '').slice(0, 2);
    setDraft(d => ({ ...d, [mid]: { ...(d[mid] || { a: '', b: '', pen: '' }), [side]: v } }));
  }

  function setPen(mid: string, val: 'A' | 'B' | '') {
    setDraft(d => ({ ...d, [mid]: { ...(d[mid] || { a: '', b: '', pen: '' }), pen: val } }));
  }

  function palpitesDoDia(dayMatches: Match[]) {
    return dayMatches.filter(m =>
      !myGuesses[m.id] && !jogoComecou(m.match_date) &&
      draft[m.id]?.a !== '' && draft[m.id]?.b !== ''
    ).length;
  }

  async function confirmarSalvar(dayMatches: Match[]) {
    if (!memberId) return;
    const toInsert = dayMatches
      .filter(m => {
        const d = draft[m.id];
        const hasA = d?.a !== undefined && d?.a !== '' && d?.a !== null;
        const hasB = d?.b !== undefined && d?.b !== '' && d?.b !== null;
        return !myGuesses[m.id] && !jogoComecou(m.match_date) && hasA && hasB;
      })
      .map(m => {
        const v = draft[m.id];
        return {
          group_member_id: memberId,
          match_id: m.id,
          guess_a: Number(v.a),
          guess_b: Number(v.b),
          guess_penalty_winner: (m.is_knockout && v.pen) ? v.pen : null,
        };
      });

    setSaving(true);
    let saved = 0;
    let lastError = '';
    for (const guess of toInsert) {
      const { error } = await supabase.from('guesses').insert(guess);
      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) continue; // já existe
        lastError = error.message;
      } else {
        saved++;
      }
    }
    setSaving(false); setConfirmDay(null); setConfirmMatches([]);
    if (lastError && saved === 0) { alert('Erro: ' + lastError); return; }
    if (saved > 0) showToast(`${saved} palpite(s) salvo(s)! ✅`);

    // Marca jogos salvos para highlight
    const savedIds = new Set(toInsert.map(g => g.match_id));
    setSavedRecently(new Set(savedIds));
    setTimeout(() => setSavedRecently(new Set()), 2500);

    setDraft({});
    load(memberId);
  }

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 3000);
  }

  function previewPts(mid: string, m: Match) {
    const d = draft[mid];
    if (!d || d.a === '' || d.b === '') return null;
    if (m.score_a === null) return null;
    return calcPoints(
      Number(d.a), Number(d.b), (d.pen || null) as 'A'|'B'|null,
      m.score_a, m.score_b!, m.penalty_winner, m.is_knockout
    );
  }

  // Agrupa por campeonato
  const compMap: Record<string, Match[]> = {};
  matches.forEach(m => {
    const comp = extractComp(m.phase);
    if (!compMap[comp]) compMap[comp] = [];
    compMap[comp].push(m);
  });
  const comps = Object.keys(compMap).sort();

  // Filtra jogos do campeonato selecionado
  const allCompMatches = selectedComp ? compMap[selectedComp] ?? [] : [];
  const todayStr = todayBrazil();
  const upcomingMatches = allCompMatches.filter(m => toBrazilDay(m.match_date) > todayStr);
  const todayMatches    = allCompMatches.filter(m => toBrazilDay(m.match_date) === todayStr);
  const pastMatches     = allCompMatches.filter(m => toBrazilDay(m.match_date) < todayStr);
  const filteredMatches = filter === 'past' ? pastMatches : filter === 'today' ? todayMatches : upcomingMatches;

  // Agrupa por dia
  const byDay: Record<string, Match[]> = {};
  filteredMatches.forEach(m => {
    const day = toBrazilDay(m.match_date);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(m);
  });
  const days = Object.keys(byDay).sort();

  // Modal day matches
  const confirmDayMatches = confirmMatches;

  useEffect(() => {
    const handleUnload = () => {
      sessionStorage.setItem(`scroll-palpites-${groupId}`, String(window.scrollY));
    };
    window.addEventListener('pagehide', handleUnload);
    return () => window.removeEventListener('pagehide', handleUnload);
  }, [groupId]);

  return (
    <main className="app">
      {toast && <div className="toast">{toast}</div>}

      {/* MODAL */}
      {confirmDay && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: 20
        }} onClick={() => !saving && setConfirmDay(null)}>
          <div style={{
            background: 'var(--card)', border: '2px solid var(--gold)',
            borderRadius: 18, padding: 24, maxWidth: 400, width: '100%'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 22, textAlign: 'center', marginBottom: 12, color: 'var(--gold)' }}>
              Confirmar palpites?
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 8, textAlign: 'center' }}>
              Você vai salvar <strong style={{ color: 'var(--gold)' }}>{confirmDayMatches.filter(m => {
                const d = draft[m.id];
                return !myGuesses[m.id] && !jogoComecou(m.match_date) && d?.a !== undefined && d?.a !== '' && d?.b !== undefined && d?.b !== '';
              }).length} palpite(s)</strong>.
            </p>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, textAlign: 'center', marginBottom: 20 }}>
              Depois de salvar, <strong style={{ color: 'var(--danger)' }}>não dá pra editar</strong>.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" disabled={saving}
                onClick={() => { setConfirmDay(null); setConfirmMatches([]); }} style={{ flex: 1 }}>Cancelar</button>
              <button className="btn" disabled={saving}
                onClick={() => confirmarSalvar(confirmDayMatches)} style={{ flex: 1 }}>
                {saving ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="brand" style={{ fontSize: 28, marginBottom: 8, marginTop: 20 }}>Palpites</h1>

      <div style={{
        background: 'rgba(227,93,93,0.10)', border: '1px solid var(--danger)',
        borderRadius: 12, padding: '12px 14px', marginBottom: 20, fontSize: 13, lineHeight: 1.5
      }}>
        🚫 Palpite enviado <strong style={{ color: 'var(--danger)' }}>não pode ser editado</strong> e não é permitido palpitar após o início do jogo.
      </div>

      {/* MENU DE CAMPEONATOS */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
          Selecione o campeonato
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {comps.map(comp => {
            const total    = compMap[comp].length;
            const palpitados = compMap[comp].filter(m => myGuesses[m.id]).length;
            const isSelected = selectedComp === comp;
            return (
              <button key={comp} onClick={() => {
                setSelectedComp(isSelected ? null : comp);
                setFilter('today');
                setView('palpites');
                setExpandedDays({ [todayBrazil()]: true });
              }} style={{
                padding: '10px 16px', borderRadius: 12, border: '1px solid',
                borderColor: isSelected ? 'var(--gold)' : 'var(--line)',
                background: isSelected ? 'var(--gold)' : 'var(--card)',
                color: isSelected ? '#1a1a1a' : 'var(--text)',
                fontWeight: isSelected ? 700 : 500,
                fontSize: 13, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
              }}>
                <span>{comp}</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>{palpitados}/{total} ✓</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FILTRO PASSADOS / HOJE / PRÓXIMOS */}
      {selectedComp && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {([
            { key: 'past',     label: '✅ Passados', count: pastMatches.length },
            { key: 'today',    label: '⚡ Hoje',     count: todayMatches.length },
            { key: 'upcoming', label: '⏳ Próximos', count: upcomingMatches.length },
          ] as const).map(f => (
            <button key={f.key} onClick={() => {
              setFilter(f.key);
              setExpandedDays(f.key === 'today' ? { [todayBrazil()]: true } : {});
            }} style={{
              flex: 1, padding: '8px 4px', borderRadius: 12, border: '1px solid',
              borderColor: filter === f.key ? 'var(--gold)' : 'var(--line)',
              background: filter === f.key ? 'var(--gold)' : 'var(--card)',
              color: filter === f.key ? '#1a1a1a' : 'var(--text)',
              fontWeight: filter === f.key ? 700 : 400,
              fontSize: 11, cursor: 'pointer', lineHeight: 1.4
            }}>
              {f.label}<br />
              <span style={{ fontSize: 10, opacity: 0.8 }}>({f.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* TOGGLE PALPITES / CHAVEAMENTO (só na Copa do Mundo) */}
      {selectedComp === 'Copa do Mundo' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => setView('palpites')} style={{
            flex: 1, padding: '10px', borderRadius: 12, border: '1px solid',
            borderColor: view === 'palpites' ? 'var(--gold)' : 'var(--line)',
            background: view === 'palpites' ? 'var(--gold)' : 'var(--card)',
            color: view === 'palpites' ? '#1a1a1a' : 'var(--text)',
            fontWeight: view === 'palpites' ? 700 : 400, fontSize: 13, cursor: 'pointer'
          }}>⚽ Palpites</button>
          <button onClick={() => setView('chaveamento')} style={{
            flex: 1, padding: '10px', borderRadius: 12, border: '1px solid',
            borderColor: view === 'chaveamento' ? 'var(--gold)' : 'var(--line)',
            background: view === 'chaveamento' ? 'var(--gold)' : 'var(--card)',
            color: view === 'chaveamento' ? '#1a1a1a' : 'var(--text)',
            fontWeight: view === 'chaveamento' ? 700 : 400, fontSize: 13, cursor: 'pointer'
          }}>🗺️ Chaveamento</button>
        </div>
      )}

      {/* CHAVEAMENTO VISUAL */}
      {view === 'chaveamento' && selectedComp === 'Copa do Mundo' && (
        <Chaveamento matches={allCompMatches} myGuesses={myGuesses} />
      )}

      {/* JOGOS POR DIA */}
      {!selectedComp ? (
        <div className="empty" style={{ marginTop: 40 }}>
          👆 Selecione um campeonato acima para ver os jogos
        </div>
      ) : view === 'chaveamento' ? null : days.length === 0 ? (
        <div className="empty">Nenhum jogo encontrado.</div>
      ) : (
        days.map(day => {
          const dayMatches = byDay[day];
          const expanded   = !!expandedDays[day];
          const today      = day === todayBrazil();
          const palpitados = dayMatches.filter(m => myGuesses[m.id]).length;
          const novos      = palpitesDoDia(dayMatches);

          return (
            <div key={day} style={{ marginBottom: 8 }}>
              <button onClick={() => toggleDay(day)} style={{
                width: '100%', background: expanded ? 'var(--card)' : 'var(--bg-soft)',
                border: `1px solid ${today ? 'var(--gold)' : 'var(--line)'}`,
                borderRadius: expanded ? '14px 14px 0 0' : 14,
                padding: '14px 16px', cursor: 'pointer', color: 'var(--text)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {today && <span style={{
                    background: 'var(--gold)', color: '#1a1a1a',
                    fontSize: 10, fontWeight: 700, padding: '2px 8px',
                    borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.08em'
                  }}>Hoje</span>}
                  <span style={{
                    fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.08em', color: today ? 'var(--gold)' : 'var(--text)'
                  }}>
                    {fmtDay(day)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{palpitados}/{dayMatches.length} ✓</span>
                  <span style={{ color: 'var(--muted)', fontSize: 14 }}>{expanded ? '▲' : '▼'}</span>
                </div>
              </button>

              {expanded && (
                <div style={{
                  border: `1px solid ${today ? 'var(--gold)' : 'var(--line)'}`,
                  borderTop: 'none', borderRadius: '0 0 14px 14px', overflow: 'hidden'
                }}>
                  {dayMatches.map((m, i) => {
                    const saved   = myGuesses[m.id];
                    const started = jogoComecou(m.match_date);
                    const blocked = !saved && started;
                    const d       = draft[m.id] || { a: '', b: '', pen: '' };
                    const pts     = previewPts(m.id, m);
                    const isDraw  = saved
                      ? saved.guess_a === saved.guess_b
                      : (d.a !== '' && d.b !== '' && d.a === d.b);

                    return (
                      <div key={m.id} style={{
                        padding: 16,
                        borderTop: i > 0 ? '1px solid var(--line)' : 'none',
                        background: saved ? 'rgba(46,168,76,0.04)' : blocked ? 'rgba(227,93,93,0.04)' : 'var(--card)',
                      }}>
                        <div className="match-meta" style={{ marginBottom: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {m.phase.split('·').slice(1).join('·').trim() || m.phase}
                          </span>
                          <span style={{ fontSize: 12 }}>
                            {new Date(m.match_date).toLocaleTimeString('pt-BR', {
                              timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>

                        <div className="match">
                          <div className="team team-a" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            {toPT(m.team_a)}
                            <Crest name={m.team_a} crests={crests} />
                          </div>
                          <div className="score-row">
                            <input className="score-input" inputMode="numeric"
                              value={saved ? String(saved.guess_a) : d.a}
                              onChange={e => !blocked && setScore(m.id, 'a', e.target.value)}
                              disabled={!!saved || blocked}
                              style={{ opacity: blocked ? 0.4 : 1 }} />
                            <span className="vs">x</span>
                            <input className="score-input" inputMode="numeric"
                              value={saved ? String(saved.guess_b) : d.b}
                              onChange={e => !blocked && setScore(m.id, 'b', e.target.value)}
                              disabled={!!saved || blocked}
                              style={{ opacity: blocked ? 0.4 : 1 }} />
                          </div>
                          <div className="team team-b" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 6 }}>
                            <Crest name={m.team_b} crests={crests} />
                            {toPT(m.team_b)}
                          </div>
                        </div>

                        {m.is_knockout && isDraw && !blocked && (
                          <div style={{ marginTop: 12, textAlign: 'center' }}>
                            <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              Quem avança nos pênaltis?
                            </p>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                              {(['A', 'B'] as const).map(side => {
                                const isSelected = saved ? saved.guess_penalty_winner === side : d.pen === side;
                                return (
                                  <button key={side} onClick={() => !saved && setPen(m.id, isSelected ? '' : side)}
                                    style={{
                                      padding: '8px 16px', borderRadius: 10, border: '1px solid',
                                      borderColor: isSelected ? 'var(--gold)' : 'var(--line)',
                                      background: isSelected ? 'var(--gold)' : 'var(--bg-soft)',
                                      color: isSelected ? '#1a1a1a' : 'var(--text)',
                                      fontWeight: 700, fontSize: 13, cursor: saved ? 'default' : 'pointer'
                                    }}>
                                    {side === 'A' ? toPT(m.team_a) : toPT(m.team_b)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {saved    && <span className="locked-badge">🔒 Palpite enviado</span>}
                          {blocked  && <span style={{ fontSize: 11, color: 'var(--danger)' }}>⏰ Jogo já iniciou</span>}
                          {!saved && !blocked && <span />}
                          {pts !== null && <span style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 700 }}>+{pts} pts</span>}
                        </div>
                      </div>
                    );
                  })}

                  {novos > 0 && (
                    <div style={{ padding: '12px 16px', background: 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}>
                      <button className="btn" onClick={() => {
                        setConfirmDay(day);
                        setConfirmMatches(dayMatches);
                      }} disabled={saving}>
                        Salvar palpites do dia ({novos})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      <div style={{ height: 100 }} />
    </main>
  );
}
