'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase, calcPoints, type Match, type Guess } from '@/lib/supabase';

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

function toPT(name: string) { return TEAM_TRANSLATIONS[name] || name; }
function getFlag(team: string) {
  const code = FLAG_CODES[team];
  return code ? `https://flagcdn.com/w40/${code}.png` : null;
}

const PHASES = [
  { key: 'ROUND_OF_16',    label: 'Oitavas de Final',  slots: 16, advancePts: 3,  championPts: 15 },
  { key: 'QUARTER_FINALS', label: 'Quartas de Final',  slots: 8,  advancePts: 5,  championPts: 10 },
  { key: 'SEMI_FINALS',    label: 'Semifinais',        slots: 4,  advancePts: 8,  championPts: 5  },
  { key: 'FINAL',          label: 'Final',             slots: 2,  advancePts: 0,  championPts: 0  },
];

type KnockoutPick = { id: string; phase: string; team: string };
type ChampionPick = { id: string; phase: string; champion: string };
type FinalPick    = { id: string; guess_a: number; guess_b: number };

export default function MataMataPage() {
  const params  = useParams();
  const groupId = String(params.id);

  const [loading, setLoading]       = useState(true);
  const [memberId, setMemberId]     = useState('');
  const [matches, setMatches]       = useState<Match[]>([]);
  const [knockoutPicks, setKnockoutPicks] = useState<KnockoutPick[]>([]);
  const [championPicks, setChampionPicks] = useState<ChampionPick[]>([]);
  const [finalPick, setFinalPick]   = useState<FinalPick | null>(null);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState('');
  const [finalA, setFinalA]         = useState<string | number>('');
  const [finalB, setFinalB]         = useState<string | number>('');
  const COLORS = ['#d4a72c', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#fb923c', '#38bdf8', '#4ade80'];

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { data: member } = await supabase
        .from('group_members').select('id, user_id').eq('group_id', groupId)
        .eq('user_id', session.session.user.id).maybeSingle();
      if (!member) return;
      setMemberId(member.id);

      // Jogos do mata-mata
      const { data: ms } = await supabase.from('matches').select('*')
        .ilike('phase', '%Copa do Mundo%').order('match_date');
      const koMatches = (ms || []).filter((m: any) =>
        PHASES.some(p => m.phase.toUpperCase().includes(p.key))
      );
      setMatches(koMatches);

      // Picks do usuário
      const { data: kp } = await supabase.from('knockout_picks').select('*').eq('group_member_id', member.id);
      setKnockoutPicks(kp || []);

      const { data: cp } = await supabase.from('phase_champion_picks').select('*').eq('group_member_id', member.id);
      setChampionPicks(cp || []);

      const { data: fp } = await supabase.from('final_score_pick').select('*').eq('group_member_id', member.id).maybeSingle();
      setFinalPick(fp || null);
      if (fp) { setFinalA(fp.guess_a); setFinalB(fp.guess_b); }



      setLoading(false);
    })();
  }, [groupId]);

  // Times disponíveis por fase
  function getTeamsForPhase(phaseKey: string): string[] {
    const phaseMatches = matches.filter(m => m.phase.toUpperCase().includes(phaseKey));
    const teams = new Set<string>();
    phaseMatches.forEach(m => {
      if (m.team_a && m.team_a !== 'TBD') teams.add(m.team_a);
      if (m.team_b && m.team_b !== 'TBD') teams.add(m.team_b);
    });
    return Array.from(teams).sort();
  }

  // Verifica se fase está bloqueada (primeiro jogo já começou)
  function phaseBlocked(phaseKey: string): boolean {
    const phaseMatches = matches.filter(m => m.phase.toUpperCase().includes(phaseKey));
    if (!phaseMatches.length) return false;
    const first = phaseMatches.sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())[0];
    return new Date(first.match_date) <= new Date();
  }

  // Times classificados (score_a não null em fases anteriores)
  function getAdvancedTeams(phaseKey: string): string[] {
    const prevPhaseIdx = PHASES.findIndex(p => p.key === phaseKey) - 1;
    if (prevPhaseIdx < 0) return getTeamsForPhase(phaseKey);
    const prevPhase = PHASES[prevPhaseIdx];
    const prevMatches = matches.filter(m => m.phase.toUpperCase().includes(prevPhase.key) && m.score_a !== null);
    const advanced = new Set<string>();
    prevMatches.forEach(m => {
      if (m.score_a! > m.score_b!) advanced.add(m.team_a);
      else if (m.score_b! > m.score_a!) advanced.add(m.team_b);
      else if (m.penalty_winner === 'A') advanced.add(m.team_a);
      else if (m.penalty_winner === 'B') advanced.add(m.team_b);
    });
    return advanced.size > 0 ? Array.from(advanced) : getTeamsForPhase(phaseKey);
  }

  async function toggleKnockoutPick(phase: string, team: string) {
    if (phaseBlocked(phase)) return;
    const existing = knockoutPicks.find(p => p.phase === phase && p.team === team);
    if (existing) {
      await supabase.from('knockout_picks').delete().eq('id', existing.id);
      setKnockoutPicks(kp => kp.filter(p => p.id !== existing.id));
    } else {
      const { data } = await supabase.from('knockout_picks').insert({ group_member_id: memberId, phase, team }).select().single();
      if (data) setKnockoutPicks(kp => [...kp, data]);
    }
  }

  async function saveChampionPick(phase: string, champion: string) {
    if (phaseBlocked(phase)) return;
    const existing = championPicks.find(p => p.phase === phase);
    if (existing) {
      await supabase.from('phase_champion_picks').update({ champion }).eq('id', existing.id);
      setChampionPicks(cp => cp.map(p => p.phase === phase ? { ...p, champion } : p));
    } else {
      const { data } = await supabase.from('phase_champion_picks').insert({ group_member_id: memberId, phase, champion }).select().single();
      if (data) setChampionPicks(cp => [...cp, data]);
    }
    showToast('Campeão salvo! ✅');
  }

  async function saveFinalPick(guess_a: number, guess_b: number) {
    if (phaseBlocked('FINAL')) return;
    if (finalPick) {
      await supabase.from('final_score_pick').update({ guess_a, guess_b }).eq('id', finalPick.id);
      setFinalPick(fp => fp ? { ...fp, guess_a, guess_b } : fp);
    } else {
      const { data } = await supabase.from('final_score_pick').insert({ group_member_id: memberId, guess_a, guess_b }).select().single();
      if (data) setFinalPick(data);
    }
    showToast('Palpite da final salvo! ✅');
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  if (loading) return <main className="app"><div className="empty">Carregando...</div></main>;

  return (
    <main className="app">
      {toast && <div className="toast" style={{ background: 'var(--gold)', color: '#1a1a1a' }}>{toast}</div>}

      <h1 className="brand" style={{ fontSize: 28, marginBottom: 4, marginTop: 20 }}>🥊 Mata-Mata</h1>
      <p className="subtitle" style={{ marginBottom: 16 }}>Palpites especiais para o mata-mata da Copa.</p>

      {(
        <>
          {PHASES.map(phase => {
            const teams = getTeamsForPhase(phase.key);
            const blocked = phaseBlocked(phase.key);
            const myKP = knockoutPicks.filter(p => p.phase === phase.key).map(p => p.team);
            const myCP = championPicks.find(p => p.phase === phase.key)?.champion || '';
            if (!teams.length) return null;

            return (
              <div key={phase.key} className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700 }}>{phase.label}</h3>
                  {blocked
                    ? <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 700 }}>🔒 Fechado</span>
                    : <span style={{ fontSize: 11, color: '#2ea84c', fontWeight: 700 }}>✅ Aberto</span>
                  }
                </div>

                {/* Quem avança */}
                {phase.key !== 'FINAL' && (
                  <>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                      Quem avança? <span style={{ color: 'var(--gold)' }}>+{phase.advancePts} pts cada acerto</span>
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                      {teams.map(team => {
                        const selected = myKP.includes(team);
                        return (
                          <button key={team} onClick={() => toggleKnockoutPick(phase.key, team)}
                            disabled={blocked}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '6px 10px', borderRadius: 10, border: '1px solid',
                              borderColor: selected ? 'var(--gold)' : 'var(--line)',
                              background: selected ? 'rgba(212,167,44,0.15)' : 'var(--bg-soft)',
                              color: selected ? 'var(--gold)' : 'var(--text)',
                              fontWeight: selected ? 700 : 400, fontSize: 12,
                              cursor: blocked ? 'not-allowed' : 'pointer',
                              opacity: blocked ? 0.6 : 1
                            }}>
                            {getFlag(team) && <img src={getFlag(team)!} alt="" style={{ width: 18, height: 12, objectFit: 'contain' }} />}
                            {toPT(team)}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Campeão por fase */}
                {phase.championPts > 0 && (
                  <>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                      Quem vai ser campeão? <span style={{ color: 'var(--gold)' }}>+{phase.championPts} pts</span>
                    </p>
                    <select
                      value={myCP}
                      onChange={e => !blocked && saveChampionPick(phase.key, e.target.value)}
                      disabled={blocked}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 10,
                        border: `1px solid ${myCP ? 'var(--gold)' : 'var(--line)'}`,
                        background: 'var(--bg-soft)', color: 'var(--text)',
                        fontSize: 13, cursor: blocked ? 'not-allowed' : 'pointer',
                        opacity: blocked ? 0.6 : 1, marginBottom: 6
                      }}>
                      <option value="">Selecione o campeão...</option>
                      {teams.map(team => (
                        <option key={team} value={team}>{toPT(team)}</option>
                      ))}
                    </select>
                  </>
                )}

                {/* Placar da final */}
                {phase.key === 'FINAL' && (
                  <>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                      Placar da final <span style={{ color: 'var(--gold)' }}>+20 pts se exato!</span>
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1, textAlign: 'right', fontSize: 13, fontWeight: 600 }}>
                        {teams[0] ? toPT(teams[0]) : 'Time A'}
                      </div>
                      <input type="number" min="0" max="15"
                        value={finalA}
                        onChange={e => setFinalA(e.target.value)}
                        disabled={blocked}
                        style={{ width: 52, height: 44, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--text)', fontSize: 20, fontWeight: 700, textAlign: 'center', opacity: blocked ? 0.6 : 1 }} />
                      <span style={{ color: 'var(--muted)' }}>x</span>
                      <input type="number" min="0" max="15"
                        value={finalB}
                        onChange={e => setFinalB(e.target.value)}
                        disabled={blocked}
                        style={{ width: 52, height: 44, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--text)', fontSize: 20, fontWeight: 700, textAlign: 'center', opacity: blocked ? 0.6 : 1 }} />
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                        {teams[1] ? toPT(teams[1]) : 'Time B'}
                      </div>
                    </div>
                    {!blocked && (
                      <button className="btn" onClick={() => saveFinalPick(Number(finalA), Number(finalB))} disabled={finalA === '' || finalB === ''}>
                        Salvar palpite da final
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* Legenda de pontuação */}
      <div className="card" style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8, marginTop: 16 }}>
        <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 6 }}>Pontuação Mata-Mata</strong>
        <div>✅ Acertar quem avança nas Oitavas: <span style={{ color: 'var(--gold)' }}>3 pts</span></div>
        <div>✅ Acertar quem avança nas Quartas: <span style={{ color: 'var(--gold)' }}>5 pts</span></div>
        <div>✅ Acertar quem avança na Semi: <span style={{ color: 'var(--gold)' }}>8 pts</span></div>
        <div>🏆 Campeão antes das Oitavas: <span style={{ color: 'var(--gold)' }}>15 pts</span></div>
        <div>🏆 Campeão antes das Quartas: <span style={{ color: 'var(--gold)' }}>10 pts</span></div>
        <div>🏆 Campeão antes da Semi: <span style={{ color: 'var(--gold)' }}>5 pts</span></div>
        <div>🎯 Placar exato da Final: <span style={{ color: 'var(--gold)' }}>+20 pts bônus</span></div>
      </div>

      <div style={{ height: 100 }} />
    </main>
  );
}
