'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase, type Match } from '@/lib/supabase';

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

function toPT(name: string) { return TEAM_TRANSLATIONS[name] || name; }

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

function extractComp(phase: string): string {
  if (phase.includes('LAST_32')) return '16 Avos';
  if (phase.includes('Copa do Mundo')) return 'Copa do Mundo';
  if (phase.includes('Brasileirão'))   return 'Brasileirão';
  if (phase.includes('Champions'))     return 'Champions League';
  return phase.split(' ·')[0].trim();
}

function getStatus(match: any): { label: string; color: string; icon: string } {
  const statusMap: Record<string, { label: string; color: string; icon: string }> = {
    'FINISHED':  { label: 'Finalizado',   color: '#2ea84c',        icon: '✅' },
    'IN_PLAY':   { label: 'Em andamento', color: '#f87171',        icon: '🔴' },
    'PAUSED':    { label: 'Pausado',      color: 'var(--gold)',    icon: '⏸️' },
    'POSTPONED': { label: 'Adiado',       color: '#fb923c',        icon: '⚠️' },
    'SUSPENDED': { label: 'Suspenso',     color: '#fb923c',        icon: '🚫' },
    'CANCELLED': { label: 'Cancelado',    color: 'var(--danger)',  icon: '❌' },
    'SCHEDULED': { label: 'Agendado',     color: 'var(--muted)',   icon: '⏳' },
  };
  if (match.status && statusMap[match.status]) return statusMap[match.status];
  if (match.score_a !== null) return { label: 'Finalizado', color: '#2ea84c', icon: '✅' };
  if (new Date(match.match_date) <= new Date()) return { label: 'Em andamento', color: '#f87171', icon: '🔴' };
  return { label: 'Agendado', color: 'var(--muted)', icon: '⏳' };
}

export default function ResultadosPage() {
  const params  = useParams();
  const [matches, setMatches]         = useState<Match[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [filter, setFilter]           = useState<'past' | 'today' | 'upcoming'>('today');
  const [crests, setCrests]           = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data: ms } = await supabase.from('matches').select('*').order('match_date');
      setMatches(ms || []);
      setExpandedDays({ [todayBrazil()]: true });
      setLoading(false);
    })();

    fetch('/api/wc-data').then(r => r.json()).then(d => {
      const map: Record<string, string> = {};
      if (d.crests) Object.entries(d.crests).forEach(([k, v]) => { if (v) map[k] = v as string; });
      (d.teams ?? []).forEach((t: any) => { if (t.flag) map[t.name] = t.flag; });
      setCrests(map);
    }).catch(() => {});
  }, []);

  const todayStr = todayBrazil();
  const filtered = matches.filter(m => {
    const day = toBrazilDay(m.match_date);
    if (filter === 'today')    return day === todayStr;
    if (filter === 'past')     return day < todayStr;
    if (filter === 'upcoming') return day > todayStr;
    return true;
  });

  const byDay: Record<string, Match[]> = {};
  filtered.forEach(m => {
    const day = toBrazilDay(m.match_date);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(m);
  });
  const days = Object.keys(byDay).sort();
  if (filter === 'past') days.reverse();

  const todayCount    = matches.filter(m => toBrazilDay(m.match_date) === todayStr).length;
  const pastCount     = matches.filter(m => toBrazilDay(m.match_date) < todayStr).length;
  const upcomingCount = matches.filter(m => toBrazilDay(m.match_date) > todayStr).length;
  const finishedCount = matches.filter(m => m.score_a !== null).length;

  if (loading) return (
    <main className="app">
      {[1,2,3].map(i => (
        <div key={i} style={{ height: 80, borderRadius: 14, background: 'var(--card)', marginBottom: 12, animation: 'pulse 1.5s infinite', opacity: 1 - i * 0.2 }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
    </main>
  );

  return (
    <main className="app">
      <h1 className="brand" style={{ fontSize: 28, marginBottom: 4, marginTop: 20 }}>Resultados</h1>
      <p className="subtitle" style={{ marginBottom: 16 }}>
        {finishedCount} jogo{finishedCount !== 1 ? 's' : ''} finalizado{finishedCount !== 1 ? 's' : ''} de {matches.length} no total.
      </p>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
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

      {days.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>
            {filter === 'today' ? '🌤️' : filter === 'upcoming' ? '⏳' : '📅'}
          </div>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>
            {filter === 'today' ? 'Nenhum jogo hoje' : filter === 'upcoming' ? 'Sem próximos jogos' : 'Sem jogos passados'}
          </p>
        </div>
      )}

      {days.map(day => {
        const expanded  = !!expandedDays[day];
        const dayItems  = byDay[day];
        const isToday   = day === todayStr;
        const finished  = dayItems.filter(m => m.score_a !== null).length;

        return (
          <div key={day} style={{ marginBottom: 8 }}>
            <button onClick={() => setExpandedDays(d => ({ ...d, [day]: !d[day] }))} style={{
              width: '100%', background: expanded ? 'var(--card)' : 'var(--bg-soft)',
              border: `1px solid ${isToday ? 'var(--gold)' : 'var(--line)'}`,
              borderRadius: expanded ? '14px 14px 0 0' : 14,
              padding: '14px 16px', cursor: 'pointer', color: 'var(--text)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {isToday ? '⚡ Hoje' : fmtDay(day)}
                </span>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {finished}/{dayItems.length} finalizado{finished !== 1 ? 's' : ''}
                </div>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: 14 }}>{expanded ? '▲' : '▼'}</span>
            </button>

            {expanded && (
              <div style={{ border: '1px solid var(--line)', borderTop: 'none', borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
                {dayItems.map((m, i) => {
                  const status = getStatus(m);
                  const comp   = extractComp(m.phase).replace('Copa do Mundo', 'Copa 2026');
                  const phase  = m.phase.split('·').slice(1).join('·').trim() || '';

                  return (
                    <div key={m.id} style={{
                      padding: '14px 16px',
                      borderTop: i > 0 ? '1px solid var(--line)' : 'none',
                      background: 'var(--card)'
                    }}>
                      {/* Header do jogo */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {comp}{phase ? ` · ${phase}` : ''}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 10, color: status.color, fontWeight: 700 }}>
                            {status.icon} {status.label}
                          </span>
                        </div>
                      </div>

                      {/* Times e placar */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
                        {/* Time A */}
                        <div style={{ textAlign: 'right' }}>
                          {crests[m.team_a] && (
                            <img src={crests[m.team_a]} alt="" style={{ width: 24, height: 18, objectFit: 'contain', display: 'block', marginLeft: 'auto', marginBottom: 4 }} />
                          )}
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{toPT(m.team_a)}</span>
                        </div>

                        {/* Placar */}
                        <div style={{ textAlign: 'center' }}>
                          {m.score_a !== null ? (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{
                                width: 40, height: 40, background: 'var(--bg-soft)',
                                borderRadius: 10, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: 20, fontWeight: 700,
                                border: '1px solid var(--line)'
                              }}>{m.score_a}</div>
                              <span style={{ fontSize: 12, color: 'var(--muted)' }}>x</span>
                              <div style={{
                                width: 40, height: 40, background: 'var(--bg-soft)',
                                borderRadius: 10, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: 20, fontWeight: 700,
                                border: '1px solid var(--line)'
                              }}>{m.score_b}</div>
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>
                                {new Date(m.match_date).toLocaleTimeString('pt-BR', {
                                  timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit'
                                })}
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--muted)' }}>horário</div>
                            </div>
                          )}
                          {m.penalty_winner && (
                            <div style={{ fontSize: 10, color: 'var(--gold)', marginTop: 4 }}>
                              Pênaltis: {m.penalty_winner === 'A' ? toPT(m.team_a) : toPT(m.team_b)}
                            </div>
                          )}
                        </div>

                        {/* Time B */}
                        <div style={{ textAlign: 'left' }}>
                          {crests[m.team_b] && (
                            <img src={crests[m.team_b]} alt="" style={{ width: 24, height: 18, objectFit: 'contain', display: 'block', marginRight: 'auto', marginBottom: 4 }} />
                          )}
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{toPT(m.team_b)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ height: 100 }} />
    </main>
  );
}
