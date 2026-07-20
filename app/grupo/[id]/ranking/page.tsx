'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase, calcPoints, type Match, type Guess } from '@/lib/supabase';

type Member = { id: string; user_id: string; name: string };
type SpecialResult = { top_scorer: string|null; champion: string|null; runner_up: string|null; third_place: string|null };
type SpecialBet    = { group_member_id: string; top_scorer: string; champion: string; runner_up: string; third_place: string };
type ViewRanking   = { user_id: string; name: string; total_points: number; exact_hits: number; result_hits: number; partial_hits: number };

function extractRound(phase: string): string {
  const match = phase.match(/Rodada (\d+)/);
  return match ? `R${match[1]}` : phase.split('·').pop()?.trim() ?? phase;
}

const COLORS = ['#d4a72c', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#fb923c', '#38bdf8', '#4ade80'];

function Avatar({ name, color, size = 32 }: { name: string; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${color}30`, border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontSize: size * 0.4, fontWeight: 700, color
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

const FLAG_CODES: Record<string, string> = {
  'Algeria': 'dz', 'Argentina': 'ar', 'Australia': 'au', 'Austria': 'at',
  'Belgium': 'be', 'Bosnia-Herzegovina': 'ba', 'Brazil': 'br', 'Canada': 'ca',
  'Cape Verde Islands': 'cv', 'Colombia': 'co', 'Congo DR': 'cd', 'Croatia': 'hr',
  'Curaçao': 'cw', 'Czechia': 'cz', 'Ecuador': 'ec', 'Egypt': 'eg',
  'England': 'gb-eng', 'France': 'fr', 'Germany': 'de', 'Ghana': 'gh',
  'Haiti': 'ht', 'Iran': 'ir', 'Iraq': 'iq', 'Ivory Coast': 'ci',
  'Japan': 'jp', 'Jordan': 'jo', 'Mexico': 'mx', 'Morocco': 'ma',
  'Netherlands': 'nl', 'New Zealand': 'nz', 'Norway': 'no', 'Panama': 'pa',
  'Paraguay': 'py', 'Portugal': 'pt', 'Qatar': 'qa', 'Saudi Arabia': 'sa',
  'Scotland': 'gb-sct', 'Senegal': 'sn', 'South Africa': 'za', 'South Korea': 'kr',
  'Spain': 'es', 'Sweden': 'se', 'Switzerland': 'ch', 'Tunisia': 'tn',
  'Turkey': 'tr', 'United States': 'us', 'Uruguay': 'uy', 'Uzbekistan': 'uz',
};

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
function getFlag(team: string): string | null {
  const code = FLAG_CODES[team];
  return code ? `https://flagcdn.com/w20/${code}.png` : null;
}

const medals = ['🥇', '🥈', '🥉'];

function ResultadosInline({ matches }: { matches: Match[] }) {
  const [filter, setFilter] = useState<'past' | 'today' | 'upcoming'>('today');

  function toBrazilDay(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
    }).split('/').reverse().join('-');
  }
  const todayStr = toBrazilDay(new Date().toISOString());

  const filtered = matches.filter(m => {
    const day = toBrazilDay(m.match_date);
    if (filter === 'today')    return day === todayStr;
    if (filter === 'past')     return day < todayStr;
    if (filter === 'upcoming') return day > todayStr;
    return true;
  }).sort((a, b) => filter === 'past'
    ? new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
    : new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  );

  const todayCount    = matches.filter(m => toBrazilDay(m.match_date) === todayStr).length;
  const pastCount     = matches.filter(m => toBrazilDay(m.match_date) < todayStr).length;
  const upcomingCount = matches.filter(m => toBrazilDay(m.match_date) > todayStr).length;

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {([
          { key: 'past',     label: '✅ Passados', count: pastCount },
          { key: 'today',    label: '⚡ Hoje',     count: todayCount },
          { key: 'upcoming', label: '⏳ Próximos', count: upcomingCount },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            flex: 1, padding: '7px 4px', borderRadius: 10, border: '1px solid',
            borderColor: filter === f.key ? 'var(--gold)' : 'var(--line)',
            background: filter === f.key ? 'var(--gold)' : 'var(--card)',
            color: filter === f.key ? '#1a1a1a' : 'var(--text)',
            fontWeight: filter === f.key ? 700 : 400, fontSize: 10, cursor: 'pointer', lineHeight: 1.4
          }}>
            {f.label}<br /><span style={{ fontSize: 9, opacity: 0.8 }}>({f.count})</span>
          </button>
        ))}
      </div>
      <div className="card" style={{ padding: 0 }}>
        {filtered.length === 0 && <div className="empty">Nenhum jogo neste período.</div>}
        {filtered.map((m, i) => {
          const isFinished = m.score_a !== null;
          const started    = new Date(m.match_date) <= new Date();
          return (
            <div key={m.id} style={{ padding: '12px 16px', borderTop: i > 0 ? '1px solid var(--line)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {m.phase.split('·').slice(1).join('·').trim()}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: isFinished ? '#2ea84c' : started ? '#f87171' : 'var(--muted)' }}>
                  {isFinished ? '✅ Finalizado' : started ? '🔴 Em andamento' : '⏳ Aguardando'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 6 }}>
                <span style={{ textAlign: 'right', fontWeight: 600, fontSize: 13 }}>{toPT(m.team_a)}</span>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: isFinished ? 'var(--gold)' : 'var(--muted)', textAlign: 'center', minWidth: 60 }}>
                  {isFinished ? `${m.score_a} x ${m.score_b}` :
                    new Date(m.match_date).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{ textAlign: 'left', fontWeight: 600, fontSize: 13 }}>{toPT(m.team_b)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RankingGrupo() {
  const params  = useParams();
  const groupId = String(params.id);

  const [members, setMembers]           = useState<Member[]>([]);
  const [matches, setMatches]           = useState<Match[]>([]);
  const [allMatches, setAllMatches]     = useState<Match[]>([]);
  const [allGuesses, setAllGuesses]     = useState<Guess[]>([]);
  const [specialBets, setSpecialBets]   = useState<SpecialBet[]>([]);
  const [specialResult, setSpecialResult] = useState<SpecialResult | null>(null);
  const [viewRanking, setViewRanking]   = useState<ViewRanking[]>([]);
  const [loading, setLoading]           = useState(true);
  const [myUserId, setMyUserId]         = useState<string | null>(null);
  const [showChart, setShowChart]       = useState(false);
  const [rankTab, setRankTab]           = useState<'campeonatos' | 'selecoes' | 'resultados'>('campeonatos');
  const [competitions, setCompetitions] = useState<{id: string; name: string; code: string}[]>([]);
  const [selectedCompRank, setSelectedCompRank] = useState<string | null>(null);
  const [compRankData, setCompRankData] = useState<{name: string; user_id: string; total_points: number; exact_hits: number; color: string}[]>([]);
  const [liveMatches, setLiveMatches]   = useState<Match[]>([]);
  const [liveGuesses, setLiveGuesses]   = useState<Record<string, Record<string, Guess>>>({});
  const [drilldown, setDrilldown]       = useState<any | null>(null);
  const [drilldownGuesses, setDrilldownGuesses] = useState<Record<string, Guess>>({});
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      setMyUserId(session.session?.user.id || null);

      const { data: ms } = await supabase
        .from('group_members').select('id, user_id').eq('group_id', groupId);
      if (!ms?.length) { setLoading(false); return; }

      const { data: profiles } = await supabase.from('profiles').select('id, name');
      const memberList: Member[] = ms.map((m: any) => ({
        id: m.id, user_id: m.user_id,
        name: profiles?.find((p: any) => p.id === m.user_id)?.name || 'Sem nome'
      }));
      setMembers(memberList);

      // Busca da view do banco — fonte de verdade para pontuação
      const { data: vr } = await supabase
        .from('ranking')
        .select('user_id, name, total_points, exact_hits, result_hits, partial_hits')
        .eq('group_id', groupId)
        .order('total_points', { ascending: false });
      setViewRanking(vr || []);

      // Jogos finalizados para cálculos locais (gráfico, melhor da rodada, seleções)
      const { data: matchData } = await supabase
        .from('matches').select('*').not('score_a', 'is', null).not('score_b', 'is', null)
        .order('match_date');
      setMatches(matchData || []);

      // Todos os jogos para aba resultados
      const { data: allMatchesData } = await supabase
        .from('matches').select('*').order('match_date');
      setAllMatches(allMatchesData || []);

      const memberIds = ms.map((m: any) => m.id);
      const { data: guessData } = await supabase
        .from('guesses').select('*').in('group_member_id', memberIds);
      setAllGuesses(guessData || []);

      // Jogos em andamento (após 10 minutos do início)
      const tenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: liveData } = await supabase
        .from('matches').select('*')
        .is('score_a', null)
        .lte('match_date', tenMinutesAgo)
        .order('match_date', { ascending: true });
      const lives = liveData || [];
      setLiveMatches(lives);

      if (lives.length > 0) {
        const liveMap: Record<string, Record<string, Guess>> = {};
        for (const live of lives) {
          const { data: liveG } = await supabase
            .from('guesses').select('*')
            .eq('match_id', live.id)
            .in('group_member_id', memberIds)
            .not('group_member_id', 'is', null);
          liveMap[live.id] = {};
          (liveG || []).forEach((g: any) => { liveMap[live.id][g.group_member_id] = g; });
        }
        setLiveGuesses(liveMap);
      }

      const { data: bets } = await supabase
        .from('special_bets').select('*').in('group_member_id', memberIds);
      setSpecialBets(bets || []);

      const { data: res } = await supabase.from('special_results').select('*').maybeSingle();
      setSpecialResult(res || null);

      // Campeonatos ativos no grupo
      const { data: gcData } = await supabase
        .from('group_competitions')
        .select('competition_id, competitions(id, name, code)')
        .eq('group_id', groupId);
      const activeComps = (gcData || []).map((gc: any) => gc.competitions).filter(Boolean);
      // Ordem: Brasileirão, Champions, Copa do Mundo 2026, Geral
      const wcComp      = { id: 'wc',    name: 'Copa do Mundo 2026', code: 'WC' };
      const geralComp   = { id: 'geral', name: 'Geral',              code: 'GERAL' };
      const orderedComps = [
        ...activeComps.filter((c: any) => c.code === 'BSA'),
        ...activeComps.filter((c: any) => c.code === 'CL'),
        wcComp,
        geralComp,
      ];
      setCompetitions(orderedComps);

      setLoading(false);
    })();
  }, [groupId]);

  // Monta memberStats combinando view (pontuação) com dados locais (cor, metadados)
  const memberStats = members.map((member, idx) => {
    const vr = viewRanking.find(r => r.user_id === member.user_id);
    const color = COLORS[idx % COLORS.length];

    // Dados locais para gráfico/drilldown
    const guessByMatch: Record<string, Guess> = {};
    allGuesses.filter(g => g.group_member_id === member.id).forEach(g => { guessByMatch[g.match_id] = g; });

    let winnerHits = 0;
    let specialPts = 0;
    matches.forEach(m => {
      const g = guessByMatch[m.id];
      if (!g) return;
      const pts = calcPoints(g.guess_a, g.guess_b, g.guess_penalty_winner, m.score_a!, m.score_b!, m.penalty_winner, m.is_knockout, m.phase);
      if (pts === 3 || pts === 4) winnerHits++;
    });

    if (specialResult) {
      const norm = (s: string | null) => s?.toLowerCase().trim() ?? '';
      const bet = specialBets.find(b => b.group_member_id === member.id);
      if (bet) {
        if (specialResult.champion    && norm(bet.champion)    === norm(specialResult.champion))    specialPts += 25;
        if (specialResult.runner_up   && norm(bet.runner_up)   === norm(specialResult.runner_up))   specialPts += 20;
        if (specialResult.third_place && norm(bet.third_place) === norm(specialResult.third_place)) specialPts += 15;
        if (specialResult.top_scorer  && norm(bet.top_scorer)  === norm(specialResult.top_scorer))  specialPts += 15;
      }
    }

    // Usa pontuação da view como fonte de verdade
    const grand_total  = vr ? vr.total_points : 0;
    const exact_hits   = vr ? vr.exact_hits   : 0;
    const winner_hits  = vr ? vr.result_hits  : winnerHits;

    return {
      ...member, color,
      grand_total, exact_hits, winner_hits, special_pts: specialPts,
      guessByMatch
    };
  }).sort((a, b) => b.grand_total - a.grand_total || b.exact_hits - a.exact_hits);

  // Posições compartilhadas
  const rankingWithPos = memberStats.map(r => {
    const pos = memberStats.filter(other =>
      other.grand_total > r.grand_total ||
      (other.grand_total === r.grand_total && other.exact_hits > r.exact_hits)
    ).length + 1;
    return { ...r, pos };
  });

  // Gráfico de evolução
  useEffect(() => {
    if (!showChart || !canvasRef.current || !matches.length) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const roundMap: Record<string, Match[]> = {};
    matches.forEach(m => {
      const round = extractRound(m.phase);
      if (!roundMap[round]) roundMap[round] = [];
      roundMap[round].push(m);
    });
    const rounds = Object.keys(roundMap).sort((a, b) => {
      const na = parseInt(a.replace('R', '')) || 0;
      const nb = parseInt(b.replace('R', '')) || 0;
      return na - nb;
    });

    const memberData = memberStats.map(member => {
      let accumulated = 0;
      const points = rounds.map(round => {
        roundMap[round].forEach(m => {
          const g = member.guessByMatch[m.id];
          if (!g) return;
          accumulated += calcPoints(g.guess_a, g.guess_b, g.guess_penalty_winner, m.score_a!, m.score_b!, m.penalty_winner, m.is_knockout, m.phase);
        });
        return accumulated;
      });
      return { name: member.name, color: member.color, points };
    });

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width  = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const padL = 40, padR = 16, padT = 16, padB = 40;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;
    ctx.clearRect(0, 0, width, height);

    const maxPts = Math.max(...memberData.flatMap(m => m.points), 1);
    const step   = chartW / Math.max(rounds.length - 1, 1);

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (chartH / 4) * i;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + chartW, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px Inter'; ctx.textAlign = 'right';
      ctx.fillText(String(Math.round(maxPts - (maxPts / 4) * i)), padL - 4, y + 3);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '9px Inter'; ctx.textAlign = 'center';
    const maxLabels = Math.min(rounds.length, 10);
    const labelStep = Math.ceil(rounds.length / maxLabels);
    rounds.forEach((r, i) => {
      if (i % labelStep !== 0 && i !== rounds.length - 1) return;
      ctx.fillText(r, padL + i * step, height - padB + 14);
    });

    memberData.forEach(member => {
      if (!member.points.length) return;
      ctx.beginPath();
      ctx.strokeStyle = member.color;
      ctx.lineWidth = 2; ctx.lineJoin = 'round';
      member.points.forEach((pts, i) => {
        const x = padL + i * step;
        const y = padT + chartH - (pts / maxPts) * chartH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      const lastX = padL + (member.points.length - 1) * step;
      const lastY = padT + chartH - ((member.points[member.points.length - 1] || 0) / maxPts) * chartH;
      ctx.beginPath(); ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
      ctx.fillStyle = member.color; ctx.fill();
    });
  }, [showChart, matches, allGuesses, memberStats, members]);

  // Melhor da rodada
  const lastRound = (() => {
    if (!matches.length) return null;
    const rounds = Array.from(new Set(matches.map(m => {
      const r = m.phase.match(/Rodada (\d+)/);
      return r ? parseInt(r[1]) : 0;
    }))).filter(r => r > 0).sort((a, b) => b - a);
    return rounds[0] ?? null;
  })();

  const roundStats = lastRound === null ? [] : memberStats.map(member => {
    const roundMatches = matches.filter(m => {
      const r = m.phase.match(/Rodada (\d+)/);
      return r && parseInt(r[1]) === lastRound;
    });
    let pts = 0;
    roundMatches.forEach(m => {
      const g = member.guessByMatch[m.id];
      if (!g) return;
      pts += calcPoints(g.guess_a, g.guess_b, g.guess_penalty_winner, m.score_a!, m.score_b!, m.penalty_winner, m.is_knockout, m.phase);
    });
    return { name: member.name, pts, color: member.color, user_id: member.user_id };
  }).filter(r => r.pts > 0).sort((a, b) => b.pts - a.pts).slice(0, 3);

  // Ranking de seleções
  const selectionRanking = (() => {
    const wcMatches = matches.filter(m => m.phase.includes('Copa do Mundo'));
    const teamPts: Record<string, number> = {};
    wcMatches.forEach(m => {
      memberStats.forEach(member => {
        const g = member.guessByMatch[m.id];
        if (!g) return;
        const pts = calcPoints(g.guess_a, g.guess_b, g.guess_penalty_winner, m.score_a!, m.score_b!, m.penalty_winner, m.is_knockout, m.phase);
        if (pts > 0) {
          teamPts[m.team_a] = (teamPts[m.team_a] ?? 0) + pts;
          teamPts[m.team_b] = (teamPts[m.team_b] ?? 0) + pts;
        }
      });
    });
    return Object.entries(teamPts).map(([team, pts]) => ({ team, pts })).sort((a, b) => b.pts - a.pts);
  })();

  const ptsBadge = (m: Match, g: Guess, pts: number) => {
    const isExact  = g.guess_a === m.score_a && g.guess_b === m.score_b;
    const isDraw   = m.score_a === m.score_b;
    const penRight = m.is_knockout && isDraw && g.guess_penalty_winner === m.penalty_winner;
    const realSign  = Math.sign((m.score_a ?? 0) - (m.score_b ?? 0));
    const guessSign = Math.sign(g.guess_a - g.guess_b);
    const rightWinner = realSign === guessSign && !isDraw;
    const oneGoal = g.guess_a === m.score_a || g.guess_b === m.score_b;

    if (isExact && penRight)  return { label: '🏆 Exato + pên', color: '#2ea84c' };
    if (isExact)              return { label: '🎯 Exato', color: '#2ea84c' };
    if (isDraw && g.guess_a === g.guess_b && penRight) return { label: '✅ Empate + pên', color: '#2ea84c' };
    if (rightWinner && oneGoal) return { label: '⚡ Vencedor+', color: 'var(--gold)' };
    if (rightWinner)            return { label: '✅ Vencedor', color: 'var(--gold)' };
    if (isDraw && g.guess_a === g.guess_b) return { label: '✅ Empate', color: 'var(--gold)' };
    return { label: '〰️ Parcial', color: '#8ba9ff' };
  };

  return (
    <main className="app">
      <h1 className="brand" style={{ fontSize: 28, marginBottom: 4, marginTop: 20 }}>Ranking</h1>
      <p className="subtitle" style={{ marginBottom: 20 }}>Quem manda nesse grupo.</p>

      {loading ? (
        <div className="empty">Carregando...</div>
      ) : (
        <>
          {/* Abas */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {([
              { key: 'campeonatos', label: '🏆 Rankings' },
              { key: 'selecoes',    label: '🌍 Times' },
              { key: 'resultados',  label: '📋 Resultados' },
            ] as const).map(tab => (
              <button key={tab.key} onClick={() => setRankTab(tab.key)} style={{
                flex: 1, padding: '8px 4px', borderRadius: 12, border: '1px solid',
                borderColor: rankTab === tab.key ? 'var(--gold)' : 'var(--line)',
                background: rankTab === tab.key ? 'var(--gold)' : 'var(--card)',
                color: rankTab === tab.key ? '#1a1a1a' : 'var(--text)',
                fontWeight: rankTab === tab.key ? 700 : 400, fontSize: 11, cursor: 'pointer'
              }}>{tab.label}</button>
            ))}
          </div>

          {/* Jogos em andamento */}
          {liveMatches.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {liveMatches.map((m, idx) => {
                const color = ['#f87171','#60a5fa','#34d399','#fb923c','#a78bfa'][idx % 5];
                return (
                  <div key={m.id} style={{
                    padding: '8px 14px', marginBottom: 6, borderRadius: 10,
                    background: `${color}15`, border: `1px solid ${color}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <span style={{ fontSize: 11, color, fontWeight: 700 }}>🔴 Em andamento</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {getFlag(m.team_a) && <img src={getFlag(m.team_a)!} alt="" style={{ width: 18, height: 13, objectFit: 'contain' }} />}
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{toPT(m.team_a)}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>vs</span>
                      {getFlag(m.team_b) && <img src={getFlag(m.team_b)!} alt="" style={{ width: 18, height: 13, objectFit: 'contain' }} />}
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{toPT(m.team_b)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {rankTab === 'campeonatos' ? (
            <div>
              {/* Seletor de campeonato */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {competitions.map(comp => (
                  <button key={comp.id} onClick={async () => {
                    setSelectedCompRank(comp.id);
                    // Calcula ranking para esse campeonato
                    const isWC    = comp.id === 'wc';
                    const isGeral = comp.id === 'geral';
                    const compMatches = isWC
                      ? allMatches.filter(m => m.phase.includes('Copa do Mundo') && m.score_a !== null)
                      : isGeral
                        ? allMatches.filter(m => m.score_a !== null)
                        : allMatches.filter(m => (m as any).competition_id === comp.id && m.score_a !== null);

                    let rankData;
                    if (isGeral) {
                      // Geral usa a view do banco (fonte de verdade)
                      rankData = memberStats.map(member => {
                        const vr = viewRanking.find(r => r.user_id === member.user_id);
                        return {
                          name: member.name,
                          user_id: member.user_id,
                          total_points: vr ? vr.total_points : member.grand_total,
                          exact_hits: vr ? vr.exact_hits : member.exact_hits,
                          color: member.color
                        };
                      }).sort((a, b) => b.total_points - a.total_points || b.exact_hits - a.exact_hits);
                    } else {
                      rankData = memberStats.map(member => {
                        let pts = 0;
                        let exact = 0;

                        compMatches.forEach(m => {
                          const g = member.guessByMatch[m.id];
                          if (!g) return;
                          const p = calcPoints(g.guess_a, g.guess_b, g.guess_penalty_winner, m.score_a!, m.score_b!, m.penalty_winner, m.is_knockout, m.phase);
                          pts += p;
                          if (g.guess_a === m.score_a && g.guess_b === m.score_b) exact++;
                        });

                        if (isWC && specialResult) {
                          const norm = (s: string | null) => s?.toLowerCase().trim() ?? '';
                          const bet = specialBets.find(b => b.group_member_id === member.id);
                          if (bet) {
                            if (specialResult.champion    && norm(bet.champion)    === norm(specialResult.champion))    pts += 25;
                            if (specialResult.runner_up   && norm(bet.runner_up)   === norm(specialResult.runner_up))   pts += 20;
                            if (specialResult.third_place && norm(bet.third_place) === norm(specialResult.third_place)) pts += 15;
                            if (specialResult.top_scorer  && norm(bet.top_scorer)  === norm(specialResult.top_scorer))  pts += 15;
                          }
                        }

                        return { name: member.name, user_id: member.user_id, total_points: pts, exact_hits: exact, color: member.color };
                      }).sort((a, b) => b.total_points - a.total_points || b.exact_hits - a.exact_hits);
                    }
                    setCompRankData(rankData);
                  }} style={{
                    padding: '8px 16px', borderRadius: 12, border: '1px solid',
                    borderColor: selectedCompRank === comp.id ? 'var(--gold)' : 'var(--line)',
                    background: selectedCompRank === comp.id ? 'var(--gold)' : 'var(--card)',
                    color: selectedCompRank === comp.id ? '#1a1a1a' : 'var(--text)',
                    fontWeight: selectedCompRank === comp.id ? 700 : 400,
                    fontSize: 13, cursor: 'pointer'
                  }}>{comp.name}</button>
                ))}
              </div>

              {/* Ranking do campeonato selecionado */}
              {selectedCompRank && compRankData.length > 0 && (
                <div className="card" style={{ padding: 0 }}>
                  {compRankData.map((r, i) => {
                    const isMe = r.user_id === myUserId;
                    const posLabel = i < 3 ? medals[i] : `${i+1}º`;
                    return (
                      <div key={r.user_id} className="rank-row" style={{
                        background: i === 0 ? 'rgba(212,167,44,0.12)' : isMe ? 'rgba(212,167,44,0.06)' : undefined,
                        borderLeft: i === 0 ? '3px solid var(--gold)' : undefined,
                      }}>
                        <span className="rank-pos">{posLabel}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${r.color}30`, border: `2px solid ${r.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: r.color }}>
                            {r.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="rank-name">
                              {r.name}
                              {isMe && <span style={{ fontSize: 11, color: 'var(--gold)', marginLeft: 6 }}>← você</span>}
                            </div>
                            <div className="rank-meta">{r.exact_hits} exato{r.exact_hits !== 1 ? 's' : ''}</div>
                          </div>
                        </div>
                        <span className="rank-points">{r.total_points}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedCompRank && compRankData.length === 0 && (
                <div className="empty">Nenhum jogo finalizado ainda neste campeonato.</div>
              )}

              {!selectedCompRank && (
                <div className="empty">Selecione um campeonato acima.</div>
              )}
            </div>
          ) : rankTab === 'resultados' ? (
            <ResultadosInline matches={allMatches} />
          ) : (
            <div className="card" style={{ padding: 0, marginBottom: 16 }}>
              {selectionRanking.length === 0 ? (
                <div className="empty">Nenhum ponto gerado ainda.</div>
              ) : selectionRanking.map((s, i) => (
                <div key={s.team} style={{
                  display: 'grid', gridTemplateColumns: '36px 1fr auto',
                  alignItems: 'center', padding: '12px 14px',
                  borderBottom: i < selectionRanking.length - 1 ? '1px solid var(--line)' : 'none'
                }}>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: 'var(--gold)' }}>{i + 1}º</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{toPT(s.team)}</span>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: 'var(--gold)' }}>{s.pts}</span>
                </div>
              ))}
            </div>
          )}

          {/* Botão gráfico */}
          <button className="btn btn-ghost" onClick={() => setShowChart(s => !s)} style={{ marginBottom: 16 }}>
            {showChart ? '▲ Ocultar gráfico' : '📊 Ver evolução de pontos'}
          </button>

          {showChart && (
            <div className="card" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Evolução por rodada</p>
              <canvas ref={canvasRef} style={{ width: '100%', height: 200, display: 'block' }} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                {memberStats.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <div style={{ width: 12, height: 3, background: m.color, borderRadius: 2 }} />
                    <span style={{ color: 'var(--muted)' }}>{m.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Melhor da rodada */}
          {roundStats.length > 0 && (
            <div className="card" style={{ marginBottom: 16, background: 'rgba(212,167,44,0.06)', border: '1px solid rgba(212,167,44,0.3)' }}>
              <p style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                🏅 Melhor da Rodada {lastRound}
              </p>
              {roundStats.map((r, i) => {
                const roundPos = roundStats.filter(other => other.pts > r.pts).length + 1;
                const roundPosLabel = roundPos <= 3 ? ['🥇','🥈','🥉'][roundPos - 1] : `${roundPos}º`;
                return (
                  <div key={r.user_id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 0', borderTop: i > 0 ? '1px solid var(--line)' : 'none'
                  }}>
                    <span style={{ fontSize: 20 }}>{roundPosLabel}</span>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>
                      {r.name}
                      {r.user_id === myUserId && <span style={{ fontSize: 11, color: 'var(--gold)', marginLeft: 6 }}>← você</span>}
                    </span>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: 'var(--gold)' }}>+{r.pts} pts</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legenda */}
          <div style={{ padding: '12px 16px', background: 'var(--card)', borderRadius: 14, border: '1px solid var(--line)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
            <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>Pontuação</strong>
            6 pts · placar exato · 4 pts · vencedor + gols · 3 pts · vencedor · 1 pt · gols
          </div>
        </>
      )}

      <style>{`
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Modal Drilldown */}
      {drilldown && (() => {
        const member = drilldown;
        const scoredMatches = matches.map(m => {
          const g = drilldownGuesses[m.id];
          if (!g) return null;
          const pts = calcPoints(g.guess_a, g.guess_b, g.guess_penalty_winner, m.score_a!, m.score_b!, m.penalty_winner, m.is_knockout, m.phase);
          if (pts === 0) return null;
          return { m, g, pts };
        }).filter(Boolean) as { m: Match; g: Guess; pts: number }[];
        scoredMatches.sort((a, b) => new Date(b.m.match_date).getTime() - new Date(a.m.match_date).getTime());

        return (
          <div onClick={() => { setDrilldown(null); setDrilldownGuesses({}); }} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: 'var(--card)', borderRadius: '20px 20px 0 0',
              width: '100%', maxWidth: 480, maxHeight: '80vh',
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
              animation: 'fadeIn 0.25s ease'
            }}>
              <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={member.name} color={member.color} size={40} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{member.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {scoredMatches.length} acerto{scoredMatches.length !== 1 ? 's' : ''} · {member.grand_total} pts total
                    </div>
                  </div>
                </div>
                <button onClick={() => { setDrilldown(null); setDrilldownGuesses({}); }} style={{
                  background: 'var(--bg-soft)', border: 'none', borderRadius: '50%',
                  width: 32, height: 32, fontSize: 16, cursor: 'pointer', color: 'var(--muted)'
                }}>✕</button>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, padding: '12px 0' }}>
                {drilldownLoading ? (
                  <div className="empty">Carregando...</div>
                ) : scoredMatches.length === 0 ? (
                  <div className="empty">Nenhum ponto ainda.</div>
                ) : scoredMatches.map(({ m, g, pts }) => {
                  const badge = ptsBadge(m, g, pts);
                  return (
                    <div key={m.id} style={{
                      padding: '12px 20px', borderBottom: '1px solid var(--line)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                          {new Date(m.match_date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {toPT(m.team_a)} {m.score_a} x {m.score_b} {toPT(m.team_b)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          Palpite: {g.guess_a} x {g.guess_b}
                          {m.is_knockout && g.guess_a === g.guess_b && g.guess_penalty_winner && (
                            <span style={{ marginLeft: 6, color: 'var(--gold)' }}>
                              (pên: {g.guess_penalty_winner === 'A' ? toPT(m.team_a) : toPT(m.team_b)})
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: badge.color, lineHeight: 1 }}>+{pts}</div>
                        <div style={{ fontSize: 10, color: badge.color, fontWeight: 700 }}>{badge.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{ height: 100 }} />
    </main>
  );
}
