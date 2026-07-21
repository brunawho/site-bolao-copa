'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

function palpitesRevelados(matchDate: string) {
  return new Date(matchDate).getTime() + 15 * 60 * 1000 <= Date.now();
}

function extractComp(phase: string): string {
  if (phase.includes('Copa do Mundo')) return '🏆 Copa do Mundo';
  if (phase.includes('Brasileirão'))   return 'Brasileirão';
  if (phase.includes('Champions'))     return 'Champions League';
  if (phase.includes('Libertadores'))  return 'Libertadores';
  return phase.split(' ·')[0].split(' -')[0].trim();
}

function extractRoundFromPhase(phase: string): number | null {
  const m = phase.match(/Rodada (\d+)/);
  return m ? parseInt(m[1]) : null;
}

function extractSubPhase(phase: string): string {
  if (phase.includes('LAST_32')) return '🥊 16 Avos';
  if (phase.includes('LAST_16') || phase.includes('ROUND_OF_16')) return '⚽ Oitavas';
  if (phase.includes('QUARTER')) return '⚽ Quartas';
  if (phase.includes('SEMI')) return '⚽ Semifinais';
  if (phase.includes('THIRD') || phase.includes('3RD')) return '⚽ 3º Lugar';
  if (phase.includes('FINAL') && !phase.includes('SEMI') && !phase.includes('QUARTER')) return '⚽ Final';
  return '📅 Fase de Grupos';
}

function Crest({ name, crests, size = 24 }: { name: string; crests: Record<string, string>; size?: number }) {
  const url = crests[name];
  if (!url) return null;
  return (
    <img src={url} alt={name} width={size} height={size}
      style={{ objectFit: 'contain', flexShrink: 0 }}
      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
  );
}

function Chaveamento({ matches, myGuesses }: { matches: any[], myGuesses: Record<string, any> }) {
  const stages = [
    { key: 'LAST_32',        label: '16 Avos',    rounds: 16 },
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
    return (
      <div style={{ background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 4, padding: '8px 10px', minWidth: 160, fontSize: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {toPT(m.team_a) || '?'}
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 4 }}>
            {isDone && <span style={{ fontWeight: 700, fontSize: 14, color: m.score_a > m.score_b ? 'var(--gold)' : 'var(--sub)' }}>{m.score_a}</span>}
            {guess && <span style={{ fontSize: 10, color: 'var(--sub)', background: 'var(--bg2)', padding: '1px 4px', borderRadius: 2 }}>{guess.guess_a}</span>}
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--line)', margin: '4px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {toPT(m.team_b) || '?'}
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 4 }}>
            {isDone && <span style={{ fontWeight: 700, fontSize: 14, color: m.score_b > m.score_a ? 'var(--gold)' : 'var(--sub)' }}>{m.score_b}</span>}
            {guess && <span style={{ fontSize: 10, color: 'var(--sub)', background: 'var(--bg2)', padding: '1px 4px', borderRadius: 2 }}>{guess.guess_b}</span>}
          </div>
        </div>
        {m.score_a === null && (
          <div style={{ fontSize: 10, color: 'var(--sub)', marginTop: 4, textAlign: 'center' }}>
            {new Date(m.match_date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })}
          </div>
        )}
      </div>
    );
  }

  const knockoutMatches = matches.filter(m => stages.some(s => m.phase.toUpperCase().includes(s.key)));
  if (knockoutMatches.length === 0) {
    return <div className="empty" style={{ marginTop: 20 }}>⏳ O chaveamento será exibido quando o mata-mata começar.</div>;
  }

  return (
    <div style={{ marginBottom: 20 }}>
      {stages.map(stage => {
        const stageMatches = getStageMatches(stage.key);
        if (!stageMatches.length) return null;
        return (
          <div key={stage.key} style={{ marginBottom: 24 }}>
            <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: '.06em', color: 'var(--gold)', marginBottom: 10 }}>
              {stage.label} <span style={{ color: 'var(--sub)', fontSize: 12 }}>({stageMatches.length} jogos)</span>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stageMatches.map(m => <MatchCard key={m.id} m={m} />)}
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

function toPT(name: string): string { return TEAM_TRANSLATIONS[name] || name; }

export default function PalpitesGrupo() {
  const params  = useParams();
  const router  = useRouter();
  const groupId = String(params.id);

  const [matches, setMatches]     = useState<Match[]>([]);
  const [myGuesses, setMyGuesses] = useState<Record<string, Guess>>({});
  const [draft, setDraft]         = useState<Draft>({});
  const [memberId, setMemberId]   = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState('');
  const [confirmDay, setConfirmDay]         = useState<string | null>(null);
  const [confirmMatches, setConfirmMatches] = useState<Match[]>([]);
  const [modalPens, setModalPens]           = useState<Record<string, 'A' | 'B' | ''>>({});
  const [crests, setCrests]       = useState<Record<string, string>>({});
  const [selectedComp, setSelectedComp]   = useState<string | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [expandedDays, setExpandedDays]   = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'upcoming' | 'today' | 'past'>('today');
  const [view, setView]     = useState<'palpites' | 'chaveamento'>('palpites');
  const [savedRecently, setSavedRecently] = useState<Set<string>>(new Set());
  // Poder 2x Brasileirão
  const [roundPowers, setRoundPowers] = useState<Record<string, string>>({});  // key: "compId-season-round" → match_id
  const [bsaCompId, setBsaCompId]     = useState<string | null>(null);
  const [savingPower, setSavingPower] = useState(false);

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
      fetch('/api/wc-data').then(r => r.json()).then(d => {
        const crestMap: Record<string, string> = {};
        if (d.crests) Object.entries(d.crests).forEach(([name, url]) => { if (url) crestMap[name as string] = url as string; });
        (d.teams ?? []).forEach((t: any) => { if (t.flag) crestMap[t.name] = t.flag; });
        setCrests(crestMap);
      }).catch(() => {});
    })();
  }, [groupId]);

  async function load(mid: string) {
    const { data: ms } = await supabase.from('matches').select('*').order('match_date');
    const { data: gs } = await supabase.from('guesses').select('*').eq('group_member_id', mid);
    setMatches(ms || []);

    const { data: gcData } = await supabase
      .from('group_competitions')
      .select('competitions(id, code)')
      .eq('group_id', groupId);

    const bsa = (gcData || []).find((gc: any) => gc.competitions?.code === 'BSA');
    const bsaId = bsa ? (bsa.competitions as any).id as string : null;
    setBsaCompId(bsaId);

    if (bsaId) {
      const { data: powers } = await supabase
        .from('round_powers')
        .select('match_id, round, competition_id, season')
        .eq('group_member_id', mid);
      const powerMap: Record<string, string> = {};
      (powers || []).forEach((p: any) => {
        powerMap[`${p.competition_id}-${p.season}-${p.round}`] = p.match_id;
      });
      setRoundPowers(powerMap);
    }

    const map: Record<string, Guess> = {};
    (gs || []).forEach(g => { map[g.match_id] = g; });
    setMyGuesses(map);

    const today2 = new Date().toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
    }).split('/').reverse().join('-');

    const localCompMap: Record<string, string[]> = {};
    (ms || []).forEach((m: any) => {
      const comp = m.phase.includes('Copa do Mundo') ? '🏆 Copa do Mundo' : m.phase.split(' ·')[0].trim();
      if (!localCompMap[comp]) localCompMap[comp] = [];
      localCompMap[comp].push(m.match_date);
    });

    const compWithToday = Object.keys(localCompMap).find(c =>
      (localCompMap[c] || []).some(d =>
        new Date(d).toLocaleDateString('pt-BR', {
          timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
        }).split('/').reverse().join('-') === today2
      )
    );

    if (compWithToday) {
      setSelectedComp(compWithToday);
      if (compWithToday === '🏆 Copa do Mundo') {
        const wcM = (ms || []).filter((m: any) => m.phase.includes('Copa do Mundo'));
        const phaseToday = wcM.find((m: any) =>
          new Date(m.match_date).toLocaleDateString('pt-BR', {
            timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
          }).split('/').reverse().join('-') === today2
        );
        if (phaseToday) setSelectedPhase(extractSubPhase(phaseToday.phase));
      }
      setFilter('today');
      setExpandedDays({ [today2]: true });
      setTimeout(() => {
        document.getElementById('day-today')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    } else {
      setExpandedDays({ [todayBrazil()]: true });
    }
  }

  async function togglePower(m: Match) {
    if (!memberId || !bsaCompId) return;
    const round = extractRoundFromPhase(m.phase);
    if (!round) return;

    // Verifica se o primeiro jogo da rodada já começou
    const roundMatches = matches.filter(mx =>
      mx.competition_id === bsaCompId && extractRoundFromPhase(mx.phase) === round
    );
    const firstKickoff = roundMatches.reduce((min, mx) =>
      new Date(mx.match_date) < new Date(min.match_date) ? mx : min
    , roundMatches[0]);
    if (firstKickoff && jogoComecou(firstKickoff.match_date)) return;

    const season = new Date(m.match_date).getFullYear();
    const powerKey = `${bsaCompId}-${season}-${round}`;
    const currentPower = roundPowers[powerKey];

    setSavingPower(true);
    if (currentPower === m.id) {
      await supabase.from('round_powers').delete()
        .eq('group_member_id', memberId)
        .eq('competition_id', bsaCompId)
        .eq('season', season)
        .eq('round', round);
      setRoundPowers(prev => { const n = { ...prev }; delete n[powerKey]; return n; });
    } else {
      await supabase.from('round_powers').upsert({
        group_member_id: memberId,
        competition_id: bsaCompId,
        match_id: m.id,
        season,
        round,
      }, { onConflict: 'group_member_id,competition_id,season,round' });
      setRoundPowers(prev => ({ ...prev, [powerKey]: m.id }));
    }
    setSavingPower(false);
  }

  function toggleDay(day: string) { setExpandedDays(d => ({ ...d, [day]: !d[day] })); }

  function setScore(mid: string, side: 'a' | 'b', val: string) {
    const v = val.replace(/\D/g, '').slice(0, 2);
    setDraft(d => ({ ...d, [mid]: { ...(d[mid] || { a: '', b: '', pen: '' }), [side]: v } }));
  }

  function setPen(mid: string, val: 'A' | 'B' | '') {
    setDraft(d => ({ ...d, [mid]: { ...(d[mid] || { a: '', b: '', pen: '' }), pen: val } }));
  }

  function palpitesDoDia(dayMatches: Match[]) {
    return dayMatches.filter(m => {
      const d = draft[m.id];
      const saved = myGuesses[m.id];
      if (jogoComecou(m.match_date)) return false;
      const effectiveD = d || (saved ? { a: String(saved.guess_a), b: String(saved.guess_b), pen: saved.guess_penalty_winner || '' } : undefined);
      return effectiveD !== undefined && effectiveD.a !== '' && effectiveD.b !== '';
    }).length;
  }

  async function confirmarSalvar(dayMatches: Match[]) {
    if (!memberId) return;
    const toInsert = dayMatches
      .filter(m => {
        if (jogoComecou(m.match_date)) return false;
        const d = draft[m.id];
        const saved = myGuesses[m.id];
        const effectiveD = d || (saved ? { a: String(saved.guess_a), b: String(saved.guess_b) } : undefined);
        return effectiveD !== undefined && effectiveD.a !== '' && effectiveD.b !== '';
      })
      .map(m => {
        const savedGuess = myGuesses[m.id];
        const draftVal = draft[m.id];
        const v = (draftVal && (draftVal.a !== '' || draftVal.b !== ''))
          ? draftVal
          : savedGuess
            ? { a: String(savedGuess.guess_a), b: String(savedGuess.guess_b), pen: savedGuess.guess_penalty_winner || '' }
            : { a: '', b: '', pen: '' };
        const penVal = modalPens[m.id] || v.pen || null;
        return {
          group_member_id: memberId,
          match_id: m.id,
          guess_a: Number(v.a),
          guess_b: Number(v.b),
          guess_penalty_winner: (m.is_knockout && penVal) ? penVal : null,
        };
      });

    setSaving(true);
    let saved = 0, lastError = '';
    for (const guess of toInsert) {
      const existingGuess = myGuesses[guess.match_id];
      let error;
      if (existingGuess) {
        ({ error } = await supabase.from('guesses').update({
          guess_a: guess.guess_a, guess_b: guess.guess_b,
          guess_penalty_winner: guess.guess_penalty_winner,
        }).eq('id', existingGuess.id));
      } else {
        ({ error } = await supabase.from('guesses').insert(guess));
      }
      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) continue;
        lastError = error.message;
      } else saved++;
    }
    setSaving(false); setConfirmDay(null); setConfirmMatches([]); setModalPens({});
    if (lastError && saved === 0) { alert('Erro: ' + lastError); return; }
    if (saved > 0) {
      const resumo = toInsert.slice(0, 3).map(g => {
        const m = dayMatches.find(mx => mx.id === g.match_id);
        return m ? `${g.guess_a}x${g.guess_b}` : '';
      }).filter(Boolean).join(' · ');
      showToast(`⚽ ${saved} palpite${saved > 1 ? 's' : ''} salvo${saved > 1 ? 's' : ''}${resumo ? ` · ${resumo}` : ''}`);
    }
    const savedIds = new Set(toInsert.map(g => g.match_id));
    setSavedRecently(new Set(savedIds));
    setTimeout(() => setSavedRecently(new Set()), 2500);
    setDraft({});
    load(memberId);
  }

  function showToast(msg: string) {
    setToast(msg);
    if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
    setTimeout(() => setToast(''), 3500);
  }

  function previewPts(mid: string, m: Match) {
    const d = draft[mid];
    if (!d || d.a === '' || d.b === '') return null;
    if (m.score_a === null) return null;
    return calcPoints(Number(d.a), Number(d.b), (d.pen || null) as 'A' | 'B' | null, m.score_a, m.score_b!, m.penalty_winner, m.is_knockout);
  }

  const compMap: Record<string, Match[]> = {};
  matches.forEach(m => {
    const comp = extractComp(m.phase);
    if (!compMap[comp]) compMap[comp] = [];
    compMap[comp].push(m);
  });
  const comps = [...Object.keys(compMap).sort(), '⭐ Especiais'];

  const wcPhases = selectedComp === '🏆 Copa do Mundo' ? (() => {
    const phases = new Set<string>();
    (compMap['🏆 Copa do Mundo'] || []).forEach(m => phases.add(extractSubPhase(m.phase)));
    const order = ['📅 Fase de Grupos', '🥊 16 Avos', '⚽ Oitavas', '⚽ Quartas', '⚽ Semifinais', '⚽ 3º Lugar', '⚽ Final'];
    return order.filter(p => phases.has(p));
  })() : [];

  const allCompMatches = (() => {
    if (!selectedComp) return [];
    const base = compMap[selectedComp] ?? [];
    if (selectedComp === '🏆 Copa do Mundo' && selectedPhase) {
      return base.filter(m => extractSubPhase(m.phase) === selectedPhase);
    }
    return base;
  })();

  const todayStr = todayBrazil();
  const pastMatches     = allCompMatches.filter(m => toBrazilDay(m.match_date) < todayStr);
  const todayMatches    = allCompMatches.filter(m => toBrazilDay(m.match_date) === todayStr);
  const upcomingMatches = allCompMatches.filter(m => toBrazilDay(m.match_date) > todayStr);
  const filteredMatches = filter === 'past' ? pastMatches : filter === 'today' ? todayMatches : upcomingMatches;

  const byDay: Record<string, Match[]> = {};
  filteredMatches.forEach(m => {
    const day = toBrazilDay(m.match_date);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(m);
  });
  const days = Object.keys(byDay).sort();
  const confirmDayMatches = confirmMatches ?? [];

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && memberId) load(memberId);
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [memberId]);

  if (!memberId && matches.length === 0) return (
    <main className="app">
      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <div style={{ width: 140, height: 44, background: 'var(--bg3)', borderRadius: 'var(--radius)', marginBottom: 14, animation: 'shimmer 1.5s infinite' }} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[1,2,3].map(i => <div key={i} style={{ flex: 1, height: 34, background: 'var(--bg3)', borderRadius: 'var(--radius)', animation: 'shimmer 1.5s infinite' }} />)}
        </div>
        {[1,2,3].map(i => <div key={i} style={{ background: 'var(--bg3)', borderRadius: 'var(--radius)', height: 110, marginBottom: 10, animation: 'shimmer 1.5s infinite' }} />)}
      </div>
      <style>{`@keyframes shimmer { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>
    </main>
  );

  return (
    <main className="app">
      {toast && (
        <div className="toast" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20, animation: 'ballSpin 0.5s ease' }}>⚽</span>
          {toast}
        </div>
      )}
      <style>{`
        @keyframes ballSpin { from { transform: rotate(0deg) scale(0); } to { transform: rotate(360deg) scale(1); } }
        @keyframes shimmer { 0%,100%{opacity:.4} 50%{opacity:.8} }
      `}</style>

      {/* MODAL CONFIRMAR */}
      {confirmDay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
          onClick={() => !saving && setConfirmDay(null)}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 16, padding: 24, maxWidth: 400, width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: 'var(--gold)', textAlign: 'center', marginBottom: 12 }}>
              Confirmar palpites?
            </div>
            <p style={{ fontSize: 13, color: 'var(--sub)', lineHeight: 1.6, textAlign: 'center', marginBottom: 16 }}>
              Após salvar, não dá pra editar.
            </p>

            {/* Pênaltis obrigatórios */}
            {confirmDayMatches.filter(m => {
              const dv = draft[m.id]; const sv = myGuesses[m.id];
              const aVal = dv?.a !== undefined && dv.a !== '' ? dv.a : sv ? String(sv.guess_a) : '';
              const bVal = dv?.b !== undefined && dv.b !== '' ? dv.b : sv ? String(sv.guess_b) : '';
              return m.is_knockout && aVal !== '' && bVal !== '' && aVal === bVal && !jogoComecou(m.match_date) && !modalPens[m.id];
            }).map(m => (
              <div key={m.id} style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg2)', borderRadius: 8 }}>
                <p style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 8, textAlign: 'center' }}>
                  🥊 <strong style={{ color: 'var(--text)' }}>{toPT(m.team_a)} x {toPT(m.team_b)}</strong> — quem avança?
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['A', 'B'] as const).map(side => (
                    <button key={side} onClick={() => setModalPens(p => ({ ...p, [m.id]: p[m.id] === side ? '' : side }))}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8, border: '1px solid',
                        borderColor: modalPens[m.id] === side ? 'var(--neon)' : 'var(--line2)',
                        background: modalPens[m.id] === side ? 'var(--neon)' : 'var(--bg3)',
                        color: modalPens[m.id] === side ? '#020A02' : 'var(--sub)',
                        fontWeight: 700, fontSize: 13, cursor: 'pointer'
                      }}>
                      {side === 'A' ? toPT(m.team_a) : toPT(m.team_b)}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-ghost" disabled={saving}
                onClick={() => { setConfirmDay(null); setConfirmMatches([]); setModalPens({}); }} style={{ flex: 1 }}>Cancelar</button>
              <button className="btn" disabled={saving} onClick={() => {
                const pendingPen = confirmDayMatches.find(m => {
                  const dv = draft[m.id]; const sv = myGuesses[m.id];
                  const aVal = dv?.a !== undefined && dv.a !== '' ? dv.a : sv ? String(sv.guess_a) : '';
                  const bVal = dv?.b !== undefined && dv.b !== '' ? dv.b : sv ? String(sv.guess_b) : '';
                  return m.is_knockout && aVal !== '' && bVal !== '' && aVal === bVal && !jogoComecou(m.match_date) && !modalPens[m.id];
                });
                if (pendingPen) { alert(`Escolha quem avança em ${toPT(pendingPen.team_a)} x ${toPT(pendingPen.team_b)}!`); return; }
                confirmarSalvar(confirmDayMatches);
              }} style={{ flex: 1 }}>
                {saving ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="brand" style={{ marginTop: 16, marginBottom: 16 }}>PAL<span style={{ color: 'var(--neon)', textShadow: 'var(--shadow-neon)' }}>PITES</span></h1>

      {/* CAMPEONATOS */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 }}>
        {comps.map(comp => {
          const total      = (compMap[comp] ?? []).length;
          const palpitados = (compMap[comp] ?? []).filter(m => myGuesses[m.id]).length;
          const isSelected = selectedComp === comp;
          return (
            <button key={comp} onClick={() => {
              if (comp === '⭐ Especiais') { router.push(`/grupo/${groupId}/apostas`); return; }
              setSelectedComp(isSelected ? null : comp);
              setSelectedPhase(null); setFilter('today'); setView('palpites');
              setExpandedDays({ [todayBrazil()]: true });
            }} style={{
              padding: '7px 14px', borderRadius: 100, border: '1px solid',
              borderColor: isSelected ? 'var(--neon)' : 'var(--line2)',
              background: isSelected ? 'var(--neon)' : 'var(--bg3)',
              color: isSelected ? '#020A02' : 'var(--sub)',
              fontWeight: isSelected ? 800 : 600, fontSize: 11, cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {comp} <span style={{ opacity: 0.7 }}>({palpitados}/{total})</span>
            </button>
          );
        })}
      </div>

      {/* APOSTAS ESPECIAIS — campeonatos não-Copa */}
      {selectedComp && selectedComp !== '🏆 Copa do Mundo' && selectedComp !== '⭐ Especiais' && (
        <button onClick={() => router.push(`/grupo/${groupId}/apostas-comp`)} style={{
          width: '100%', marginBottom: 10, padding: '9px', borderRadius: 'var(--radius)',
          border: '1px solid rgba(255,215,0,0.3)', background: 'rgba(255,215,0,0.06)',
          color: 'var(--gold)', fontWeight: 800, fontSize: 11, cursor: 'pointer',
          textTransform: 'uppercase', letterSpacing: '.06em'
        }}>⭐ Apostas especiais do {selectedComp}</button>
      )}

      {/* SUB-FASES COPA */}
      {selectedComp === '🏆 Copa do Mundo' && wcPhases.length > 1 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 8 }}>
          <button onClick={() => setSelectedPhase(null)} style={{
            padding: '6px 12px', borderRadius: 100, border: '1px solid',
            borderColor: !selectedPhase ? 'var(--neon)' : 'var(--line2)',
            background: !selectedPhase ? 'var(--neon)' : 'var(--bg3)',
            color: !selectedPhase ? '#020A02' : 'var(--sub)',
            fontWeight: !selectedPhase ? 800 : 600, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0
          }}>Todas</button>
          {wcPhases.map(phase => (
            <button key={phase} onClick={() => setSelectedPhase(phase)} style={{
              padding: '6px 12px', borderRadius: 100, border: '1px solid',
              borderColor: selectedPhase === phase ? 'var(--neon)' : 'var(--line2)',
              background: selectedPhase === phase ? 'var(--neon)' : 'var(--bg3)',
              color: selectedPhase === phase ? '#020A02' : 'var(--sub)',
              fontWeight: selectedPhase === phase ? 800 : 600, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0
            }}>{phase}</button>
          ))}
        </div>
      )}

      {/* FILTROS */}
      {selectedComp && (
        <div style={{ display: 'flex', background: 'var(--bg3)', border: '1px solid var(--line2)', borderRadius: 'var(--radius)', padding: 3, gap: 3, marginBottom: 14 }}>
          {(['past', 'today', 'upcoming'] as const).map((f, i) => {
            const labels = ['Passados', 'Hoje', 'Próximos'];
            const counts = [pastMatches.length, todayMatches.length, upcomingMatches.length];
            return (
              <button key={f} onClick={() => { setFilter(f); setExpandedDays(f === 'today' ? { [todayBrazil()]: true } : {}); }} style={{
                flex: 1, padding: '8px', borderRadius: 'calc(var(--radius) - 2px)', border: 'none',
                background: filter === f ? 'var(--bg2)' : 'transparent',
                color: filter === f ? 'var(--text)' : 'var(--sub)',
                fontWeight: filter === f ? 800 : 400, fontSize: 11, cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: '.04em',
                border: filter === f ? '1px solid var(--line2)' : '1px solid transparent',
              }}>
                {labels[i]} ({counts[i]})
              </button>
            );
          })}
        </div>
      )}

      {/* TOGGLE PALPITES/CHAVEAMENTO */}
      {selectedComp === '🏆 Copa do Mundo' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {(['palpites', 'chaveamento'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              flex: 1, padding: '9px', borderRadius: 'var(--radius)', border: '1px solid',
              borderColor: view === v ? 'var(--neon)' : 'var(--line2)',
              background: view === v ? 'var(--neon)' : 'var(--bg3)',
              color: view === v ? '#020A02' : 'var(--sub)',
              fontWeight: view === v ? 800 : 600, fontSize: 12, cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: '.04em'
            }}>
              {v === 'palpites' ? '⚽ Palpites' : '🗺️ Chaveamento'}
            </button>
          ))}
        </div>
      )}

      {/* CHAVEAMENTO */}
      {view === 'chaveamento' && selectedComp === '🏆 Copa do Mundo' && (
        <Chaveamento matches={compMap['🏆 Copa do Mundo'] || []} myGuesses={myGuesses} />
      )}

      {/* JOGOS */}
      {!selectedComp ? (
        <div className="empty" style={{ marginTop: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏟️</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: 'var(--neon)', marginBottom: 6 }}>ESCOLHA SEU CAMPO</div>
          <div style={{ fontSize: 12, color: 'var(--sub)' }}>Selecione um campeonato acima</div>
        </div>
      ) : view === 'chaveamento' ? null : days.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: 40, marginBottom: 12 }}>😴</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: 'var(--neon)', marginBottom: 6 }}>SILÊNCIO NO ESTÁDIO</div>
          <div style={{ fontSize: 12, color: 'var(--sub)' }}>Nenhum jogo neste período</div>
        </div>
      ) : (
        days.map(day => {
          const dayMatches = byDay[day] ?? [];
          const expanded   = !!expandedDays[day];
          const today      = day === todayBrazil();
          const palpitados = dayMatches.filter(m => myGuesses[m.id]).length;
          const novos      = palpitesDoDia(dayMatches);

          return (
            <div key={day} style={{ marginBottom: 8 }}>
              <button id={today ? 'day-today' : undefined} onClick={() => toggleDay(day)} style={{
                width: '100%', background: 'var(--bg3)', border: `1px solid ${today ? 'var(--neon)' : 'var(--line2)'}`,
                borderRadius: expanded ? '4px 4px 0 0' : 'var(--radius)',
                padding: '13px 16px', cursor: 'pointer', color: 'var(--text)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {today && <span style={{ background: 'var(--neon)', color: '#020A02', fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '.08em' }}>Hoje</span>}
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: '.04em', color: today ? 'var(--neon)' : 'var(--text)', textTransform: 'uppercase' }}>
                    {fmtDay(day)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--sub)', fontWeight: 700 }}>{palpitados}/{dayMatches.length}</span>
                  <span style={{ color: 'var(--sub)', fontSize: 14 }}>{expanded ? '▲' : '▼'}</span>
                </div>
              </button>

              {expanded && (
                <div style={{ border: `1px solid ${today ? 'var(--neon)' : 'var(--line2)'}`, borderTop: 'none', borderRadius: '0 0 var(--radius) var(--radius)', overflow: 'hidden' }}>
                  {dayMatches.map((m, i) => {
                    const saved   = myGuesses[m.id] as Guess | undefined;
                    const started = jogoComecou(m.match_date);
                    const blocked = started;
                    const draftVal = draft[m.id];
                    const d = (draftVal && (draftVal.a !== '' || draftVal.b !== ''))
                      ? draftVal
                      : saved
                        ? { a: String(saved.guess_a), b: String(saved.guess_b), pen: saved.guess_penalty_winner || '' }
                        : { a: '', b: '', pen: '' };
                    const pts = previewPts(m.id, m);
                    const isDraw = (draftVal && draftVal.a !== '' && draftVal.b !== '')
                      ? draftVal.a === draftVal.b
                      : saved ? saved.guess_a === saved.guess_b : false;

                    // Poder Brasileirão
                    const isBsa = m.phase.includes('Brasileir');
                    const bsaRound = isBsa ? extractRoundFromPhase(m.phase) : null;
                    const bsaSeason = isBsa ? new Date(m.match_date).getFullYear() : null;
                    const powerKey = (bsaCompId && bsaRound && bsaSeason) ? `${bsaCompId}-${bsaSeason}-${bsaRound}` : null;
                    const isMyPower = powerKey ? roundPowers[powerKey] === m.id : false;
                    const hasPowerElsewhere = powerKey ? (!!roundPowers[powerKey] && roundPowers[powerKey] !== m.id) : false;

                    // Verifica se o primeiro jogo da rodada já começou (para bloquear poder)
                    const roundBlocked = (() => {
                      if (!isBsa || !bsaCompId || !bsaRound) return false;
                      const roundMs = matches.filter(mx => mx.competition_id === bsaCompId && extractRoundFromPhase(mx.phase) === bsaRound);
                      const first = roundMs.reduce((min, mx) => new Date(mx.match_date) < new Date(min.match_date) ? mx : min, roundMs[0]);
                      return first ? jogoComecou(first.match_date) : false;
                    })();

                    return (
                      <div key={m.id} style={{
                        background: 'var(--card)', borderTop: i > 0 ? `1px solid var(--line)` : 'none',
                        position: 'relative', overflow: 'hidden'
                      }}>
                        {/* Stripe topo */}
                        <div style={{ height: 2, background: blocked ? 'linear-gradient(90deg,var(--red),transparent)' : isMyPower ? 'linear-gradient(90deg,var(--gold),transparent)' : 'linear-gradient(90deg,var(--neon),transparent)', opacity: blocked ? 0.6 : 0.4 }} />

                        <div style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '.1em', background: 'var(--bg2)', padding: '2px 8px', borderRadius: 2 }}>
                              {m.phase.split('·').slice(1).join('·').trim() || m.phase}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--sub)', fontWeight: 700 }}>
                              {new Date(m.match_date).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* BOTÃO PODER — Brasileirão */}
                          {isBsa && !blocked && !roundBlocked && (
                            <button onClick={() => togglePower(m)} disabled={savingPower || hasPowerElsewhere} style={{
                              width: '100%', marginBottom: 10, padding: '8px',
                              borderRadius: 'var(--radius)', border: '1px solid',
                              borderColor: isMyPower ? 'var(--gold)' : 'var(--line2)',
                              background: isMyPower ? 'rgba(255,215,0,0.1)' : 'var(--bg2)',
                              color: isMyPower ? 'var(--gold)' : hasPowerElsewhere ? 'var(--dim)' : 'var(--sub)',
                              fontWeight: 800, fontSize: 10, cursor: hasPowerElsewhere ? 'not-allowed' : 'pointer',
                              textTransform: 'uppercase', letterSpacing: '.06em',
                              opacity: hasPowerElsewhere ? 0.5 : 1,
                            }}>
                              {isMyPower ? '⚡ PODER ATIVO · 2× PONTOS NESTE JOGO' : hasPowerElsewhere ? '⚡ PODER JÁ USADO NESTA RODADA' : '⚡ USAR PODER · 2× PONTOS NESTE JOGO'}
                            </button>
                          )}
                          {isBsa && !blocked && roundBlocked && !isMyPower && (
                            <div style={{ fontSize: 10, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8, textAlign: 'center' }}>
                              ⚡ Poder bloqueado — rodada já iniciou
                            </div>
                          )}

                          <div className="match">
                            <div className="team team-a" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                              {toPT(m.team_a)}
                              <Crest name={m.team_a} crests={crests} />
                            </div>
                            <div className="score-row">
                              <input className="score-input" inputMode="numeric"
                                value={draft[m.id]?.a !== undefined ? draft[m.id].a : saved ? String(saved.guess_a) : d.a}
                                onChange={e => !blocked && setScore(m.id, 'a', e.target.value)}
                                disabled={blocked} style={{ opacity: blocked ? 0.4 : 1 }} />
                              <span className="vs">:</span>
                              <input className="score-input" inputMode="numeric"
                                value={draft[m.id]?.b !== undefined ? draft[m.id].b : saved ? String(saved.guess_b) : d.b}
                                onChange={e => !blocked && setScore(m.id, 'b', e.target.value)}
                                disabled={blocked} style={{ opacity: blocked ? 0.4 : 1 }} />
                            </div>
                            <div className="team team-b" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 6 }}>
                              <Crest name={m.team_b} crests={crests} />
                              {toPT(m.team_b)}
                            </div>
                          </div>

                          {m.is_knockout && isDraw && !blocked && (
                            <div style={{ marginTop: 10, textAlign: 'center' }}>
                              <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--sub)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                                Quem avança?
                              </p>
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                {(['A', 'B'] as const).map(side => {
                                  const penVal = draft[m.id]?.pen || (saved as Guess | undefined)?.guess_penalty_winner || '';
                                  const isSelected = penVal === side;
                                  return (
                                    <button key={side} onClick={() => !blocked && setPen(m.id, isSelected ? '' : side)} style={{
                                      padding: '8px 16px', borderRadius: 'var(--radius)', border: '1px solid',
                                      borderColor: isSelected ? 'var(--neon)' : 'var(--line2)',
                                      background: isSelected ? 'var(--neon)' : 'var(--bg2)',
                                      color: isSelected ? '#020A02' : 'var(--sub)',
                                      fontWeight: 800, fontSize: 12, cursor: blocked ? 'default' : 'pointer',
                                      textTransform: 'uppercase', letterSpacing: '.04em'
                                    }}>
                                      {side === 'A' ? toPT(m.team_a) : toPT(m.team_b)}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {saved && !blocked && <span style={{ fontSize: 10, color: 'var(--neon)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>✏️ Editar até o início</span>}
                            {saved && blocked  && <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>🔒 Bloqueado</span>}
                            {!saved && blocked && <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>⏰ Jogo iniciado</span>}
                            {!saved && !blocked && <span />}
                            {pts !== null && (
                              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: 'var(--gold)', textShadow: 'var(--shadow-gold)' }}>
                                +{isMyPower ? pts * 2 : pts} pts{isMyPower ? ' ⚡' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {novos > 0 && (
                    <div style={{ padding: '12px 14px', background: 'var(--bg2)', borderTop: `1px solid var(--line2)` }}>
                      <button className="btn" onClick={() => {
                        setConfirmDay(day);
                        setConfirmMatches(dayMatches);
                        const pens: Record<string, 'A' | 'B' | ''> = {};
                        dayMatches.forEach(m => {
                          if (m.is_knockout) pens[m.id] = (draft[m.id]?.pen || myGuesses[m.id]?.guess_penalty_winner || '') as 'A' | 'B' | '';
                        });
                        setModalPens(pens);
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
