'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase, type Match, type Guess } from '@/lib/supabase';

type Member = { id: string; user_id: string; name: string };

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

export default function GaleraGrupo() {
  const params = useParams();
  const groupId = String(params.id);
  const [members, setMembers]       = useState<Member[]>([]);
  const [matches, setMatches]       = useState<Match[]>([]);
  const [selected, setSelected]     = useState<Member | null>(null);
  const [guesses, setGuesses]       = useState<Guess[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied]         = useState(false);
  const [myUserId, setMyUserId]     = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'upcoming' | 'today' | 'past'>('today');

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      setMyUserId(session.session?.user.id || null);

      const { data: g } = await supabase
        .from('groups').select('invite_code').eq('id', groupId).maybeSingle();
      setInviteCode(g?.invite_code || '');

      const { data: ms } = await supabase
        .from('group_members').select('id, user_id').eq('group_id', groupId);

      if (ms?.length) {
        const { data: profiles } = await supabase.from('profiles').select('id, name');
        const list: Member[] = (ms || []).map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          name: profiles?.find((p: any) => p.id === m.user_id)?.name || 'Sem nome'
        })).sort((a, b) => a.name.localeCompare(b.name));
        setMembers(list);
      }

      const { data: mt } = await supabase.from('matches').select('*').order('match_date');
      setMatches(mt || []);

      // Expande hoje por padrão
      setExpandedDays({ [todayBrazil()]: true });
    })();
  }, [groupId]);

  async function open(m: Member) {
    setSelected(m);
    setFilter('today');
    setExpandedDays({ [todayBrazil()]: true });
    const { data } = await supabase.from('guesses').select('*').eq('group_member_id', m.id);
    setGuesses(data || []);
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

  // Agrupa por dia no timezone Brasil
  function groupByDay(ms: Match[]) {
    const byDay: Record<string, Match[]> = {};
    ms.forEach(m => {
      const day = toBrazilDay(m.match_date);
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(m);
    });
    return byDay;
  }

  if (selected) {
    const byMatch: Record<string, Guess> = {};
    guesses.forEach(g => { byMatch[g.match_id] = g; });
    const isMe = selected.user_id === myUserId;
    const now = new Date();
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
              flex: 1, padding: '8px 4px', borderRadius: 10, border: '1px solid',
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

        {days.length === 0 && <div className="empty">Nenhum jogo neste período.</div>}

        {days.map(day => {
          const expanded = !!expandedDays[day];
          const dayMatches = byDay[day];
          const palpitados = dayMatches.filter(m => byMatch[m.id]).length;
          const isToday = day === todayBrazil();

          return (
            <div key={day} style={{ marginBottom: 8 }}>
              <button onClick={() => toggleDay(day)} style={{
                width: '100%',
                background: expanded ? 'var(--card)' : 'var(--bg-soft)',
                border: `1px solid ${isToday ? 'var(--gold)' : 'var(--line)'}`,
                borderRadius: expanded ? '14px 14px 0 0' : 14,
                padding: '14px 16px', cursor: 'pointer', color: 'var(--text)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isToday && <span style={{
                    background: 'var(--gold)', color: '#1a1a1a',
                    fontSize: 10, fontWeight: 700, padding: '2px 8px',
                    borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.08em'
                  }}>Hoje</span>}
                  <span style={{
                    fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.08em', color: isToday ? 'var(--gold)' : 'var(--text)'
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
                  border: `1px solid ${isToday ? 'var(--gold)' : 'var(--line)'}`,
                  borderTop: 'none', borderRadius: '0 0 14px 14px', overflow: 'hidden'
                }}>
                  {dayMatches.map((m, i) => {
                    const g = byMatch[m.id];
                    const started = jogoComecou(m.match_date);
                    const oculto = !isMe && !started;

                    return (
                      <div key={m.id} style={{
                        padding: 16,
                        borderTop: i > 0 ? '1px solid var(--line)' : 'none',
                        background: 'var(--card)'
                      }}>
                        <div className="match-meta" style={{ marginBottom: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{m.phase}</span>
                          <span style={{ fontSize: 12 }}>
                            {new Date(m.match_date).toLocaleTimeString('pt-BR', {
                              timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>

                        <div className="match">
                          <div className="team team-a">{m.team_a}</div>
                          <div className="score-row">
                            {oculto ? (
                              <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: 8, padding: '8px 12px',
                                background: 'var(--bg-soft)', borderRadius: 12,
                                border: '1px solid var(--line)'
                              }}>
                                <span style={{ fontSize: 16 }}>🔒</span>
                                <span style={{ fontSize: 10, color: 'var(--muted)' }}>Aguardando</span>
                              </div>
                            ) : (
                              <>
                                <div className="score-input" style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  opacity: g ? 1 : 0.3
                                }}>
                                  {g ? g.guess_a : '–'}
                                </div>
                                <span className="vs">x</span>
                                <div className="score-input" style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  opacity: g ? 1 : 0.3
                                }}>
                                  {g ? g.guess_b : '–'}
                                </div>
                              </>
                            )}
                          </div>
                          <div className="team team-b">{m.team_b}</div>
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
        <div style={{ height: 100 }} />
      </main>
    );
  }

  return (
    <main className="app">
      <h1 className="brand" style={{ fontSize: 28, marginBottom: 4, marginTop: 20 }}>A Galera</h1>
      <p className="subtitle" style={{ marginBottom: 16 }}>Toque em alguém pra ver os palpites.</p>

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
        </div>
      )}

      {members.length === 0 && <div className="empty">Ninguém entrou ainda.</div>}

      <div className="card" style={{ padding: 0 }}>
        {members.map(m => (
          <div key={m.id} className="person-item" onClick={() => open(m)}>
            <span style={{ fontWeight: 600 }}>
              {m.name} {m.user_id === myUserId && <span style={{ fontSize: 11, color: 'var(--gold)' }}>(você)</span>}
            </span>
            <span className="chevron">›</span>
          </div>
        ))}
      </div>

      <div style={{ height: 100 }} />
    </main>
  );
}
