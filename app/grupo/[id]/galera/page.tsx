'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase, type Match, type Guess } from '@/lib/supabase';

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

function Avatar({ name, color, size = 32 }: { name: string; color: string; size?: number }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${color}30`, border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontSize: size * 0.4, fontWeight: 700, color
    }}>
      {initial}
    </div>
  );
}

function toBrazilDay(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).split('/').reverse().join('-');
}

function todayBrazil() { return toBrazilDay(new Date().toISOString()); }

function fmtDay(dateYMD: string) {
  const [y, m, d] = dateYMD.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long'
  });
}


const STATUS_LABEL: Record<string, string> = {
  'SCHEDULED': 'Agendado',
  'IN_PLAY':   'Em andamento',
  'PAUSED':    'Pausado',
  'FINISHED':  'Finalizado',
  'POSTPONED': 'Adiado',
  'SUSPENDED': 'Suspenso',
  'CANCELLED': 'Cancelado',
};

const STATUS_COLOR: Record<string, string> = {
  'SCHEDULED': 'var(--muted)',
  'IN_PLAY':   '#f87171',
  'PAUSED':    'var(--gold)',
  'FINISHED':  '#2ea84c',
  'POSTPONED': '#fb923c',
  'SUSPENDED': '#fb923c',
  'CANCELLED': 'var(--danger)',
};

function jogoComecou(matchDate: string) {
  return new Date(matchDate) <= new Date();
}

function palpitesRevelados(matchDate: string) {
  return new Date(matchDate).getTime() + 15 * 60 * 1000 <= Date.now();
}

const MEMBER_COLORS = ['#d4a72c', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#fb923c', '#38bdf8', '#4ade80'];

type Member = { id: string; user_id: string; name: string };

export default function GaleraGrupo() {
  const params  = useParams();
  const groupId = String(params.id);

  const [members, setMembers]       = useState<Member[]>([]);
  const [matches, setMatches]       = useState<Match[]>([]);
  const [selected, setSelected]     = useState<Member | null>(null);
  const [guesses, setGuesses]       = useState<Guess[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied]         = useState(false);
  const [myUserId, setMyUserId]     = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [filter, setFilter]         = useState<'upcoming' | 'today' | 'past'>('today');
  const [memberColors, setMemberColors] = useState<Record<string, string>>({});
  const [isCreator, setIsCreator]   = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [payment, setPayment]       = useState({ id: '', entry_value: 0, prize_1st: 60, prize_2nd: 30, prize_3rd: 10, prize_locked: false });
  const [memberPayments, setMemberPayments] = useState<Record<string, boolean>>({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [configTab, setConfigTab]   = useState<'pagamentos' | 'premio'>('pagamentos');
  const [ranking, setRanking]       = useState<{ name: string; total_points: number }[]>([]);
  const [galeraMode, setGaleraMode] = useState<'pessoa' | 'jogo'>('pessoa');
  const [allGuessesMap, setAllGuessesMap] = useState<Record<string, Record<string, any>>>({});
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [showSpecials, setShowSpecials]   = useState(false);
  const [showCompetitions, setShowCompetitions] = useState(false);
  const [competitions, setCompetitions]   = useState<{id: string; name: string; code: string; active: boolean}[]>([]);
  const [groupComps, setGroupComps]       = useState<string[]>([]); // competition_ids ativos
  const [allSpecialBets, setAllSpecialBets] = useState<any[]>([]);
  const [allKnockoutPicks, setAllKnockoutPicks] = useState<any[]>([]);
  const [allChampionPicks, setAllChampionPicks] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      const userId = session.session.user.id;
      setMyUserId(userId);

      const { data: ms } = await supabase
        .from('group_members').select('id, user_id').eq('group_id', groupId);

      if (ms?.length) {
        const { data: profiles } = await supabase.from('profiles').select('id, name');
        const list: Member[] = (ms || []).map((m: any) => ({
          id: m.id, user_id: m.user_id,
          name: profiles?.find((p: any) => p.id === m.user_id)?.name || 'Sem nome'
        })).sort((a, b) => a.name.localeCompare(b.name));
        setMembers(list);

        const colorMap: Record<string, string> = {};
        list.forEach((m, i) => { colorMap[m.user_id] = MEMBER_COLORS[i % MEMBER_COLORS.length]; });
        setMemberColors(colorMap);
      }

      const { data: g } = await supabase.from('groups').select('invite_code, created_by').eq('id', groupId).maybeSingle();
      setInviteCode(g?.invite_code || '');
      setIsCreator(g?.created_by === userId);

      const { data: mt } = await supabase.from('matches').select('*').order('match_date');
      setMatches(mt || []);

      const { data: group } = await supabase.from('groups').select('created_by').eq('id', groupId).maybeSingle();
      setIsCreator(group?.created_by === session.session?.user.id);

      const { data: payData } = await supabase.from('group_payments').select('*').eq('group_id', groupId).maybeSingle();
      if (payData) setPayment(payData);

      const { data: memberPays } = await supabase.from('member_payments').select('user_id, paid').eq('group_id', groupId);
      const payMap: Record<string, boolean> = {};
      (memberPays || []).forEach((p: any) => { payMap[p.user_id] = p.paid; });
      setMemberPayments(payMap);

      const { data: rankData } = await supabase.from('ranking').select('name, total_points').eq('group_id', groupId).order('total_points', { ascending: false });
      setRanking(rankData || []);

      const allMemberIds = (ms || []).map((m: any) => m.id);
      const { data: allGuessesData } = await supabase.from('guesses').select('*').in('group_member_id', allMemberIds);
      const guessMap: Record<string, Record<string, any>> = {};
      (allGuessesData || []).forEach((g: any) => {
        if (!guessMap[g.match_id]) guessMap[g.match_id] = {};
        guessMap[g.match_id][g.group_member_id] = g;
      });
      setAllGuessesMap(guessMap);

      // Campeonatos disponíveis
      const { data: compsData } = await supabase.from('competitions').select('*').eq('active', true);
      setCompetitions(compsData || []);

      // Campeonatos ativos no grupo com valor de entrada
      const { data: gcData } = await supabase
        .from('group_competitions')
        .select('competition_id, entry_value, competitions(id, name, code)')
        .eq('group_id', groupId);
      setGroupComps((gcData || []).map((gc: any) => gc.competition_id));
      const compsWithVal = (gcData || []).map((gc: any) => ({
        id: gc.competitions?.id,
        name: gc.competitions?.name,
        code: gc.competitions?.code,
        entry_value: gc.entry_value || 0,
      })).filter((c: any) => c.id);
      setGroupCompsWithValue(compsWithVal);
      const valMap: Record<string, number> = {};
      compsWithVal.forEach((c: any) => { valMap[c.id] = c.entry_value; });
      setCompEntryValues(valMap);

      // Pagamentos por campeonato
      const { data: cpData } = await supabase
        .from('competition_payments')
        .select('competition_id, user_id, paid')
        .eq('group_id', groupId);
      const cpMap: Record<string, Record<string, boolean>> = {};
      (cpData || []).forEach((cp: any) => {
        if (!cpMap[cp.competition_id]) cpMap[cp.competition_id] = {};
        cpMap[cp.competition_id][cp.user_id] = cp.paid;
      });
      setCompPayments(cpMap);

      // Apostas especiais e mata-mata (visíveis após 28/06)
      const brDate2 = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const [dd, mm, yy] = brDate2.split('/').map(Number);
      const showSpecialsAfter = yy > 2026 || (yy === 2026 && mm > 6) || (yy === 2026 && mm === 6 && dd >= 28);
      if (showSpecialsAfter) {
        const { data: sbData } = await supabase.from('special_bets').select('*, group_members!inner(user_id)').in('group_member_id', allMemberIds);
        setAllSpecialBets(sbData || []);

        const { data: kpData } = await supabase.from('knockout_picks').select('*').in('group_member_id', allMemberIds);
        setAllKnockoutPicks(kpData || []);

        const { data: cpData } = await supabase.from('phase_champion_picks').select('*').in('group_member_id', allMemberIds);
        setAllChampionPicks(cpData || []);
      }

      setExpandedDays({ [todayBrazil()]: true });
    })();
  }, [groupId]);

  async function open(m: Member) {
    setSelected(m);
    setFilter('today');
    setExpandedDays({ [todayBrazil()]: true });
    const { data: gs } = await supabase.from('guesses').select('*').eq('group_member_id', m.id);
    setGuesses(gs || []);
  }

  function toggleDay(day: string) {
    setExpandedDays(d => ({ ...d, [day]: !d[day] }));
  }

  async function copyInvite() {
    const url = `${window.location.origin}/convite/${inviteCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function groupByDay(ms: Match[]) {
    const byDay: Record<string, Match[]> = {};
    ms.forEach(m => {
      const day = toBrazilDay(m.match_date);
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(m);
    });
    return byDay;
  }

  async function savePaymentConfig(lockPrize = false) {
    setSavingConfig(true);
    if (payment.id) {
      await supabase.from('group_payments').update({
        entry_value: payment.entry_value,
        prize_1st: payment.prize_1st,
        prize_2nd: payment.prize_2nd,
        prize_3rd: payment.prize_3rd,
        ...(lockPrize && { prize_locked: true }),
        updated_at: new Date().toISOString()
      }).eq('id', payment.id);
      if (lockPrize) setPayment(p => ({ ...p, prize_locked: true }));
    } else {
      const { data } = await supabase.from('group_payments').insert({
        group_id: groupId, entry_value: payment.entry_value,
        prize_1st: payment.prize_1st, prize_2nd: payment.prize_2nd,
        prize_3rd: payment.prize_3rd, ...(lockPrize && { prize_locked: true }),
      }).select().single();
      if (data) setPayment(data);
    }
    setSavingConfig(false);
  }

  async function toggleCompPayment(compId: string, userId: string, currentPaid: boolean) {
    const { data: existing } = await supabase.from('competition_payments').select('id')
      .eq('group_id', groupId).eq('competition_id', compId).eq('user_id', userId).maybeSingle();
    if (existing) {
      await supabase.from('competition_payments').update({ paid: !currentPaid, paid_at: !currentPaid ? new Date().toISOString() : null })
        .eq('id', existing.id);
    } else {
      await supabase.from('competition_payments').insert({ group_id: groupId, competition_id: compId, user_id: userId, paid: true, paid_at: new Date().toISOString() });
    }
    setCompPayments(prev => ({
      ...prev,
      [compId]: { ...(prev[compId] || {}), [userId]: !currentPaid }
    }));
  }

  async function saveCompEntryValue(compId: string, value: number) {
    setSavingCompValue(true);
    await supabase.from('group_competitions')
      .update({ entry_value: value })
      .eq('group_id', groupId)
      .eq('competition_id', compId);
    setCompEntryValues(prev => ({ ...prev, [compId]: value }));
    setSavingCompValue(false);
  }

  async function toggleCompetition(compId: string, currentActive: boolean) {
    if (currentActive) {
      await supabase.from('group_competitions').delete()
        .eq('group_id', groupId).eq('competition_id', compId);
      setGroupComps(gc => gc.filter(id => id !== compId));
    } else {
      await supabase.from('group_competitions').insert({ group_id: groupId, competition_id: compId });
      setGroupComps(gc => [...gc, compId]);
    }
  }

  async function togglePaid(userId: string, currentPaid: boolean) {
    const { data: existing } = await supabase.from('member_payments').select('id').eq('group_id', groupId).eq('user_id', userId).maybeSingle();
    if (existing) {
      await supabase.from('member_payments').update({
        paid: !currentPaid, paid_at: !currentPaid ? new Date().toISOString() : null
      }).eq('id', existing.id);
    } else {
      await supabase.from('member_payments').insert({
        group_id: groupId, user_id: userId, paid: true, paid_at: new Date().toISOString()
      });
    }
    setMemberPayments(mp => ({ ...mp, [userId]: !currentPaid }));
  }

  // ====== VISÃO DETALHE DE PESSOA ======
  if (selected) {
    const byMatch: Record<string, Guess> = {};
    guesses.forEach(g => { byMatch[g.match_id] = g; });
    const isMe = selected.user_id === myUserId;
    const todayStr = todayBrazil();

    const filteredMatches = matches.filter(m => {
      const day = toBrazilDay(m.match_date);
      if (filter === 'today')    return day === todayStr;
      if (filter === 'past')     return day < todayStr;
      if (filter === 'upcoming') return day > todayStr;
      return true;
    });

    const byDay = groupByDay(filteredMatches);
    const days = Object.keys(byDay).sort();
    if (filter === 'past') days.reverse();

    const todayCount    = matches.filter(m => toBrazilDay(m.match_date) === todayStr).length;
    const pastCount     = matches.filter(m => toBrazilDay(m.match_date) < todayStr).length;
    const upcomingCount = matches.filter(m => toBrazilDay(m.match_date) > todayStr).length;

    return (
      <main className="app">
        <button className="btn-ghost btn"
          style={{ width: 'auto', padding: '8px 16px', fontSize: 13, marginBottom: 16, marginTop: 20 }}
          onClick={() => setSelected(null)}>← Voltar</button>

        <h1 className="brand" style={{ fontSize: 28, marginBottom: 4 }}>{selected.name}</h1>
        {!isMe && (
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
            🔒 Palpites ocultos até o jogo começar
          </p>
        )}

        {matches.length === 0 && <div className="empty">Sem jogos.</div>}

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {([
            { key: 'past',     label: '✅ Passados', count: pastCount },
            { key: 'today',    label: '⚡ Hoje',     count: todayCount },
            { key: 'upcoming', label: '⏳ Próximos', count: upcomingCount },
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

        {days.map(day => {
          const dayMatches = byDay[day] ?? [];
          const expanded   = !!expandedDays[day];
          const isToday    = day === todayStr;

          return (
            <div key={day} style={{ marginBottom: 8 }}>
              <button onClick={() => toggleDay(day)} style={{
                width: '100%', background: expanded ? 'var(--card)' : 'var(--bg-soft)',
                border: `1px solid ${isToday ? 'var(--gold)' : 'var(--line)'}`,
                borderRadius: expanded ? '14px 14px 0 0' : 14,
                padding: '12px 16px', cursor: 'pointer', color: 'var(--text)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {isToday ? '⚡ Hoje' : fmtDay(day)}
                </span>
                <span style={{ color: 'var(--muted)', fontSize: 14 }}>{expanded ? '▲' : '▼'}</span>
              </button>

              {expanded && (
                <div style={{ border: '1px solid var(--line)', borderTop: 'none', borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
                  {dayMatches.map((m, i) => {
                    const g = byMatch[m.id];
                    const oculto = !isMe && !palpitesRevelados(m.match_date);

                    return (
                      <div key={m.id} style={{
                        padding: 16,
                        borderTop: i > 0 ? '1px solid var(--line)' : 'none',
                        background: 'var(--card)'
                      }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
                          {m.phase.split('·').slice(1).join('·').trim() || m.phase}
                        </div>

                        <div className="match">
                          <div className="team team-a">{toPT(m.team_a)}</div>
                          <div className="score-row">
                            {oculto ? (
                              <div style={{
                                display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center'
                              }}>
                                <div className="score-input" style={{ background: 'var(--bg-soft)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</div>
                                <span style={{ color: 'var(--muted)', fontSize: 12 }}>x</span>
                                <div className="score-input" style={{ background: 'var(--bg-soft)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</div>
                              </div>
                            ) : g ? (
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                                <div className="score-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{g.guess_a}</div>
                                <span style={{ color: 'var(--muted)', fontSize: 12 }}>x</span>
                                <div className="score-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{g.guess_b}</div>
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>
                            )}
                          </div>
                          <div className="team team-b">{toPT(m.team_b)}</div>
                        </div>

                        {!oculto && !g && (
                          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                            Sem palpite
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {/* Apostas Especiais e Mata-Mata — visível após 27/06 */}
        {(() => { const bd = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }); const [d,m,y] = bd.split('/').map(Number); return y > 2026 || (y===2026 && m>6) || (y===2026 && m===6 && d>=28); })() && (
          <div style={{ marginTop: 8 }}>
            <button onClick={() => setShowSpecials(s => !s)} className="btn btn-ghost" style={{ marginBottom: 8 }}>
              {showSpecials ? '▲ Ocultar apostas especiais' : '🌟 Ver apostas especiais'}
            </button>

            {showSpecials && (() => {
              const memberBet = allSpecialBets.find((b: any) => b.group_members?.user_id === selected.user_id);
              const memberKP  = allKnockoutPicks.filter((p: any) => p.group_member_id === selected.id);
              const memberCP  = allChampionPicks.filter((p: any) => p.group_member_id === selected.id);

              return (
                <div className="card" style={{ marginBottom: 12 }}>
                  {/* Apostas especiais da Copa */}
                  {memberBet && (
                    <>
                      <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>🌟 Apostas Especiais</p>
                      {[
                        { label: '🥇 Campeão', value: memberBet.champion },
                        { label: '🥈 Vice', value: memberBet.runner_up },
                        { label: '🥉 3º lugar', value: memberBet.third_place },
                        { label: '⚽ Artilheiro', value: memberBet.top_scorer },
                      ].filter(f => f.value).map(f => (
                        <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                          <span style={{ color: 'var(--muted)' }}>{f.label}</span>
                          <span style={{ fontWeight: 700 }}>{f.value}</span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Palpites mata-mata */}
                  {memberCP.length > 0 && (
                    <>
                      <div style={{ borderTop: '1px solid var(--line)', marginTop: 10, paddingTop: 10 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>🥊 Campeão por fase</p>
                        {memberCP.map((cp: any) => {
                          const phaseLabel: Record<string, string> = {
                            'ROUND_OF_16': 'Oitavas', 'QUARTER_FINALS': 'Quartas',
                            'SEMI_FINALS': 'Semi', 'FINAL': 'Final'
                          };
                          return (
                            <div key={cp.phase} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                              <span style={{ color: 'var(--muted)' }}>{phaseLabel[cp.phase] || cp.phase}</span>
                              <span style={{ fontWeight: 700 }}>{toPT(cp.champion)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {!memberBet && memberCP.length === 0 && (
                    <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>Sem apostas especiais</p>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        <div style={{ height: 100 }} />
      </main>
    );
  }

  // ====== TELA PRINCIPAL DA GALERA ======
  return (
    <main className="app">
      <h1 className="brand" style={{ fontSize: 28, marginBottom: 4, marginTop: 20 }}>A Galera</h1>
      <p className="subtitle" style={{ marginBottom: 16 }}>Toque em alguém pra ver os palpites.</p>

      {/* Card de convite + caixinha */}
      {inviteCode && (
        <div className="card" style={{ marginBottom: 20, background: 'rgba(212,167,44,0.08)' }}>
          <p style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Convidar mais gente
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Código:</span>
            <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: 'var(--gold)', letterSpacing: 2 }}>
              {inviteCode}
            </span>
          </div>
          <button className="btn btn-ghost" onClick={copyInvite} style={{ width: '100%', padding: '10px', fontSize: 12 }}>
            {copied ? '✅ Link copiado!' : '🔗 Copiar link de convite'}
          </button>
          <button onClick={() => setShowConfig(s => !s)} className="btn btn-ghost" style={{ width: '100%', marginTop: 8, fontSize: 12 }}>
            {showConfig ? '▲ Ocultar caixinha' : '💰 Caixinha do grupo'}
          </button>
        </div>
      )}

      {/* Conteúdo da caixinha */}
      {showConfig && (
        <div className="card" style={{ marginBottom: 16 }}>
          {/* Resumo financeiro */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: 'var(--gold)' }}>
                R$ {(Object.values(memberPayments).filter(Boolean).length * payment.entry_value).toFixed(0)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>arrecadado</div>
            </div>
            <div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: '#2ea84c' }}>
                {Object.values(memberPayments).filter(Boolean).length}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>pagaram</div>
            </div>
            <div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: 'var(--danger)' }}>
                {members.length - Object.values(memberPayments).filter(Boolean).length}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>pendentes</div>
            </div>
          </div>

          {/* Abas */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['pagamentos', 'premio'] as const).map(tab => (
              <button key={tab} onClick={() => setConfigTab(tab)} style={{
                flex: 1, padding: '8px', borderRadius: 10, border: '1px solid',
                borderColor: configTab === tab ? 'var(--gold)' : 'var(--line)',
                background: configTab === tab ? 'var(--gold)' : 'var(--bg-soft)',
                color: configTab === tab ? '#1a1a1a' : 'var(--text)',
                fontWeight: configTab === tab ? 700 : 400, fontSize: 12, cursor: 'pointer'
              }}>
                {tab === 'pagamentos' ? '💰 Pagamentos' : '🏆 Prêmio'}
              </button>
            ))}
          </div>

          {configTab === 'pagamentos' && (
            <>
              {isCreator && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Valor da entrada (R$)</label>
                  <input className="input" type="number" min="0"
                    value={payment.entry_value}
                    onChange={e => setPayment(p => ({ ...p, entry_value: Number(e.target.value) }))} />
                  <button className="btn" style={{ marginTop: 8 }} onClick={() => savePaymentConfig()} disabled={savingConfig}>
                    {savingConfig ? '...' : 'Salvar valor'}
                  </button>
                </div>
              )}
              {!isCreator && payment.entry_value > 0 && (
                <div style={{ marginBottom: 12, padding: '10px 12px', background: 'var(--bg-soft)', borderRadius: 10, fontSize: 13 }}>
                  Valor da entrada: <strong style={{ color: 'var(--gold)' }}>R$ {payment.entry_value.toFixed(2)}</strong>
                </div>
              )}
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Status de pagamento:</p>
                {members.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</span>
                    {isCreator ? (
                      <button onClick={() => togglePaid(m.user_id, memberPayments[m.user_id] || false)} style={{
                        padding: '6px 12px', borderRadius: 8, border: '1px solid',
                        borderColor: memberPayments[m.user_id] ? '#2ea84c' : 'var(--line)',
                        background: memberPayments[m.user_id] ? 'rgba(46,168,76,0.15)' : 'var(--bg-soft)',
                        color: memberPayments[m.user_id] ? '#2ea84c' : 'var(--muted)',
                        fontSize: 12, cursor: 'pointer', fontWeight: 600
                      }}>
                        {memberPayments[m.user_id] ? '✅ Pago' : '⏳ Pendente'}
                      </button>
                    ) : (
                      <span style={{
                        padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        color: memberPayments[m.user_id] ? '#2ea84c' : 'var(--danger)',
                      }}>
                        {memberPayments[m.user_id] ? '✅ Pago' : '⏳ Pendente'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {configTab === 'premio' && (
            <>
              {isCreator && !payment.prize_locked && (() => {
                const total = Object.values(memberPayments).filter(Boolean).length * payment.entry_value;
                const max2  = 100 - payment.prize_1st;
                const prize3 = Math.max(0, max2 - payment.prize_2nd);

                return (
                  <>
                    <style>{`
                      .prize-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 3px; outline: none; cursor: pointer; }
                      .prize-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 22px; height: 22px; border-radius: 50%; background: var(--gold); cursor: pointer; border: 2px solid #1a1a1a; }
                    `}</style>

                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>🥇 1º lugar</span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: 'var(--gold)' }}>{payment.prize_1st}%</span>
                          {total > 0 && <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>R$ {(total * payment.prize_1st / 100).toFixed(2)}</span>}
                        </div>
                      </div>
                      <input type="range" className="prize-slider" min="0" max="100" step="1"
                        value={payment.prize_1st}
                        style={{ background: `linear-gradient(to right, var(--gold) ${payment.prize_1st}%, var(--line) ${payment.prize_1st}%)` }}
                        onChange={e => {
                          const v1 = Number(e.target.value);
                          const remaining = 100 - v1;
                          const v2 = Math.min(payment.prize_2nd, remaining);
                          const v3 = remaining - v2;
                          setPayment(p => ({ ...p, prize_1st: v1, prize_2nd: v2, prize_3rd: Math.max(0, v3) }));
                        }} />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>🥈 2º lugar</span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: 'var(--gold)' }}>{payment.prize_2nd}%</span>
                          {total > 0 && <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>R$ {(total * payment.prize_2nd / 100).toFixed(2)}</span>}
                        </div>
                      </div>
                      <input type="range" className="prize-slider" min="0" max={max2} step="1"
                        value={payment.prize_2nd}
                        style={{ background: `linear-gradient(to right, var(--gold) ${max2 > 0 ? (payment.prize_2nd / max2 * 100) : 0}%, var(--line) ${max2 > 0 ? (payment.prize_2nd / max2 * 100) : 0}%)` }}
                        onChange={e => {
                          const v2 = Number(e.target.value);
                          setPayment(p => ({ ...p, prize_2nd: v2, prize_3rd: Math.max(0, max2 - v2) }));
                        }} />
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Disponível: {max2}%</div>
                    </div>

                    <div style={{ marginBottom: 16, padding: '12px', background: 'var(--bg-soft)', borderRadius: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>🥉 3º lugar</span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: 'var(--gold)' }}>{prize3}%</span>
                          {total > 0 && <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>R$ {(total * prize3 / 100).toFixed(2)}</span>}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Calculado automaticamente</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                      <button className="btn btn-ghost" onClick={() => savePaymentConfig(false)} disabled={savingConfig}>
                        Salvar rascunho
                      </button>
                      <button className="btn" style={{ background: '#2ea84c' }}
                        onClick={() => { if (confirm('Confirmar e bloquear? Não poderá ser alterado depois.')) savePaymentConfig(true); }}
                        disabled={savingConfig}>
                        🔒 Confirmar e bloquear
                      </button>
                    </div>
                  </>
                );
              })()}

              {(payment.prize_locked || !isCreator) && (
                <div style={{ marginBottom: 12 }}>
                  {payment.prize_locked && (
                    <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(46,168,76,0.1)', border: '1px solid #2ea84c', textAlign: 'center', fontSize: 12, color: '#2ea84c', marginBottom: 12 }}>
                      🔒 Distribuição confirmada
                    </div>
                  )}
                  {[
                    { label: '🥇 1º lugar', pct: payment.prize_1st },
                    { label: '🥈 2º lugar', pct: payment.prize_2nd },
                    { label: '🥉 3º lugar', pct: payment.prize_3rd },
                  ].map(f => (
                    <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                      <span>{f.label} — {f.pct}%</span>
                      <span style={{ color: 'var(--gold)', fontWeight: 700 }}>
                        R$ {((Object.values(memberPayments).filter(Boolean).length * payment.entry_value) * f.pct / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {ranking.length > 0 && (
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Projeção atual:</p>
                  {[
                    { pos: 0, pct: payment.prize_1st },
                    { pos: 1, pct: payment.prize_2nd },
                    { pos: 2, pct: payment.prize_3rd },
                  ].map(({ pos, pct }) => ranking[pos] && (
                    <div key={pos} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13 }}>{['🥇','🥈','🥉'][pos]} {ranking[pos].name}</span>
                      <span style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 700 }}>
                        R$ {((Object.values(memberPayments).filter(Boolean).length * payment.entry_value) * pct / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Caixinha por campeonato */}
      {groupCompsWithValue.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setShowCompPayments(s => !s)} className="btn btn-ghost" style={{ width: '100%', fontSize: 12 }}>
            {showCompPayments ? '▲ Ocultar caixinha por campeonato' : '💰 Caixinha por campeonato'}
          </button>
          {showCompPayments && (
            <div className="card" style={{ marginTop: 8 }}>
              {/* Seletor de campeonato */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                {groupCompsWithValue.map(comp => (
                  <button key={comp.id} onClick={() => setSelectedCompPay(comp.id)} style={{
                    padding: '6px 12px', borderRadius: 20, border: '1px solid',
                    borderColor: selectedCompPay === comp.id ? 'var(--gold)' : 'var(--line)',
                    background: selectedCompPay === comp.id ? 'var(--gold)' : 'var(--bg-soft)',
                    color: selectedCompPay === comp.id ? '#1a1a1a' : 'var(--text)',
                    fontWeight: selectedCompPay === comp.id ? 700 : 400, fontSize: 12, cursor: 'pointer'
                  }}>{comp.name}</button>
                ))}
              </div>

              {selectedCompPay && (() => {
                const comp = groupCompsWithValue.find(c => c.id === selectedCompPay)!;
                const pays = compPayments[selectedCompPay] || {};
                const paidCount = Object.values(pays).filter(Boolean).length;
                const entryVal = compEntryValues[selectedCompPay] || 0;
                const total = paidCount * entryVal;

                return (
                  <>
                    {/* Resumo */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center', marginBottom: 16 }}>
                      <div>
                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: 'var(--gold)' }}>R$ {total.toFixed(0)}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>arrecadado</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: '#2ea84c' }}>{paidCount}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>pagaram</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: 'var(--danger)' }}>{members.length - paidCount}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>pendentes</div>
                      </div>
                    </div>

                    {/* Valor de entrada — só criador edita */}
                    {isCreator && (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Valor da entrada (R$)</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input className="input" type="number" min="0"
                            value={entryVal}
                            onChange={e => setCompEntryValues(prev => ({ ...prev, [selectedCompPay]: Number(e.target.value) }))}
                            style={{ flex: 1 }} />
                          <button className="btn" onClick={() => saveCompEntryValue(selectedCompPay, entryVal)} disabled={savingCompValue} style={{ whiteSpace: 'nowrap' }}>
                            {savingCompValue ? '...' : 'Salvar'}
                          </button>
                        </div>
                      </div>
                    )}

                    {!isCreator && entryVal > 0 && (
                      <div style={{ marginBottom: 12, padding: '10px 12px', background: 'var(--bg-soft)', borderRadius: 10, fontSize: 13 }}>
                        Valor da entrada: <strong style={{ color: 'var(--gold)' }}>R$ {entryVal.toFixed(2)}</strong>
                      </div>
                    )}

                    {/* Status de pagamento */}
                    <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Status de pagamento:</p>
                      {members.map(m => (
                        <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</span>
                          {isCreator ? (
                            <button onClick={() => toggleCompPayment(selectedCompPay, m.user_id, pays[m.user_id] || false)} style={{
                              padding: '6px 12px', borderRadius: 8, border: '1px solid',
                              borderColor: pays[m.user_id] ? '#2ea84c' : 'var(--line)',
                              background: pays[m.user_id] ? 'rgba(46,168,76,0.15)' : 'var(--bg-soft)',
                              color: pays[m.user_id] ? '#2ea84c' : 'var(--muted)',
                              fontSize: 12, cursor: 'pointer', fontWeight: 600
                            }}>
                              {pays[m.user_id] ? '✅ Pago' : '⏳ Pendente'}
                            </button>
                          ) : (
                            <span style={{
                              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                              color: pays[m.user_id] ? '#2ea84c' : 'var(--danger)',
                            }}>
                              {pays[m.user_id] ? '✅ Pago' : '⏳ Pendente'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Campeonatos do grupo — só criador vê */}
      {isCreator && competitions.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setShowCompetitions(s => !s)} className="btn btn-ghost" style={{ width: '100%', fontSize: 12 }}>
            {showCompetitions ? '▲ Ocultar campeonatos' : '⚽ Campeonatos do grupo'}
          </button>
          {showCompetitions && (
            <div className="card" style={{ marginTop: 8 }}>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                Ative os campeonatos que seu grupo vai participar:
              </p>
              {competitions.map(comp => {
                const isActive = groupComps.includes(comp.id);
                return (
                  <div key={comp.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: '1px solid var(--line)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{comp.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{comp.code}</div>
                    </div>
                    <button onClick={() => toggleCompetition(comp.id, isActive)} style={{
                      padding: '6px 14px', borderRadius: 10, border: '1px solid',
                      borderColor: isActive ? '#2ea84c' : 'var(--line)',
                      background: isActive ? 'rgba(46,168,76,0.15)' : 'var(--bg-soft)',
                      color: isActive ? '#2ea84c' : 'var(--muted)',
                      fontWeight: 700, fontSize: 12, cursor: 'pointer'
                    }}>
                      {isActive ? '✅ Ativo' : '+ Ativar'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Toggle modo */}
      {members.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => setGaleraMode('pessoa')} style={{
            flex: 1, padding: '10px', borderRadius: 12, border: '1px solid',
            borderColor: galeraMode === 'pessoa' ? 'var(--gold)' : 'var(--line)',
            background: galeraMode === 'pessoa' ? 'var(--gold)' : 'var(--card)',
            color: galeraMode === 'pessoa' ? '#1a1a1a' : 'var(--text)',
            fontWeight: galeraMode === 'pessoa' ? 700 : 400, fontSize: 13, cursor: 'pointer'
          }}>👥 Por pessoa</button>
          <button onClick={() => setGaleraMode('jogo')} style={{
            flex: 1, padding: '10px', borderRadius: 12, border: '1px solid',
            borderColor: galeraMode === 'jogo' ? 'var(--gold)' : 'var(--line)',
            background: galeraMode === 'jogo' ? 'var(--gold)' : 'var(--card)',
            color: galeraMode === 'jogo' ? '#1a1a1a' : 'var(--text)',
            fontWeight: galeraMode === 'jogo' ? 700 : 400, fontSize: 13, cursor: 'pointer'
          }}>⚽ Por jogo</button>
        </div>
      )}

      {members.length === 0 && <div className="empty">Ninguém entrou ainda.</div>}

      {/* Visão por jogo */}
      {galeraMode === 'jogo' && (() => {
        const now = new Date();
        const startedMatches = matches
          .filter(m => new Date(m.match_date) <= now)
          .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());

        if (startedMatches.length === 0) {
          return <div className="empty">Nenhum jogo iniciado ainda.</div>;
        }

        return (
          <div>
            {startedMatches.map(m => {
              const guessesForMatch = allGuessesMap[m.id] || {};
              const isFinished = m.score_a !== null;
              const isExpanded = expandedMatch === m.id;

              return (
                <div key={m.id} className="card" style={{ marginBottom: 12, padding: 0 }}>
                  <div onClick={() => setExpandedMatch(isExpanded ? null : m.id)}
                    style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--line)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {m.phase.split('·').slice(1).join('·').trim() || m.phase}
                      </span>
                      <span style={{ fontSize: 11, color: isFinished ? '#2ea84c' : 'var(--gold)', fontWeight: 700 }}>
                        {isFinished ? '✅ Finalizado' : '🔴 Em andamento'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
                      <span style={{ textAlign: 'right', fontWeight: 700, fontSize: 14 }}>{toPT(m.team_a)}</span>
                      <div style={{ textAlign: 'center' }}>
                        {isFinished ? (
                          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: 'var(--gold)' }}>
                            {m.score_a} x {m.score_b}
                          </span>
                        ) : (
                          <span style={{ fontSize: 13, color: 'var(--muted)' }}>vs</span>
                        )}
                      </div>
                      <span style={{ textAlign: 'left', fontWeight: 700, fontSize: 14 }}>{toPT(m.team_b)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8, fontSize: 11, color: 'var(--muted)', gap: 6 }}>
                      <span>{Object.keys(guessesForMatch).length}/{members.length} palpites</span>
                      <span>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isExpanded && members.map((member, i) => {
                    const memberGuess = Object.values(guessesForMatch).find((g: any) =>
                      member.id === g.group_member_id
                    ) as any;

                    return (
                      <div key={member.id} style={{
                        padding: '10px 16px',
                        borderTop: i > 0 ? '1px solid var(--line)' : 'none',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={member.name} color={memberColors[member.user_id] || '#d4a72c'} size={28} />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{member.name}</span>
                        </div>
                        {memberGuess ? (
                          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18 }}>
                            {memberGuess.guess_a} x {memberGuess.guess_b}
                            {m.is_knockout && memberGuess.guess_a === memberGuess.guess_b && memberGuess.guess_penalty_winner && (
                              <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>
                                (pên: {memberGuess.guess_penalty_winner === 'A' ? toPT(m.team_a) : toPT(m.team_b)})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>— sem palpite</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Visão por pessoa */}
      {galeraMode === 'pessoa' && (
        <div className="card" style={{ padding: 0 }}>
          {members.map((m, i) => (
            <div key={m.id} className="person-item"
              style={{ borderTop: i > 0 ? '1px solid var(--line)' : 'none' }}
              onClick={() => open(m)}>
              <Avatar name={m.name} color={memberColors[m.user_id] || '#d4a72c'} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{m.name}
                  {m.user_id === myUserId && <span style={{ fontSize: 11, color: 'var(--gold)', marginLeft: 6 }}>← você</span>}
                </div>
              </div>
              <span className="chevron">›</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 100 }} />
    </main>
  );
}
