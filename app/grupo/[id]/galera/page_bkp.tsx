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
  const [isCreator, setIsCreator]   = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [payment, setPayment]       = useState({ id: '', entry_value: 0, prize_1st: 60, prize_2nd: 30, prize_3rd: 10, prize_locked: false });
  const [memberPayments, setMemberPayments] = useState<Record<string, boolean>>({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [configTab, setConfigTab]   = useState<'pagamentos' | 'premio'>('pagamentos');
  const [ranking, setRanking]       = useState<{ name: string; total_points: number }[]>([]);
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

      // Verifica se é criador
      const { data: group } = await supabase
        .from('groups').select('created_by').eq('id', groupId).maybeSingle();
      setIsCreator(group?.created_by === session.session?.user.id);

      // Busca config de pagamento
      const { data: payData } = await supabase
        .from('group_payments').select('*').eq('group_id', groupId).maybeSingle();
      if (payData) setPayment(payData);

      // Busca status de pagamentos
      const { data: memberPays } = await supabase
        .from('member_payments').select('user_id, paid').eq('group_id', groupId);
      const payMap: Record<string, boolean> = {};
      (memberPays || []).forEach((p: any) => { payMap[p.user_id] = p.paid; });
      setMemberPayments(payMap);

      // Ranking
      const { data: rankData } = await supabase
        .from('ranking').select('name, total_points').eq('group_id', groupId)
        .order('total_points', { ascending: false });
      setRanking(rankData || []);

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

  async function savePaymentConfig(lockPrize = false) {
    setSavingConfig(true);
    const total = payment.prize_1st + payment.prize_2nd + payment.prize_3rd;
    if (total !== 100) { alert('A soma das % deve ser 100%'); setSavingConfig(false); return; }
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

  async function togglePaid(userId: string, currentPaid: boolean) {
    const { data: existing } = await supabase
      .from('member_payments').select('id').eq('group_id', groupId).eq('user_id', userId).maybeSingle();
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

      {/* CAIXINHA — visível para todos, editável só pelo criador */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setShowConfig(s => !s)} className="btn btn-ghost">
          {showConfig ? '▲ Ocultar caixinha' : '💰 Caixinha do grupo'}
        </button>

        {showConfig && (
          <div className="card" style={{ marginTop: 8 }}>
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
                {/* Valor da entrada — só criador edita */}
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

                {/* Status de pagamento */}
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
                {/* Distribuição — só criador edita se não bloqueado */}
                {isCreator && !payment.prize_locked && (
                  <>
                    {[
                      { label: '🥇 1º lugar', key: 'prize_1st' as const },
                      { label: '🥈 2º lugar', key: 'prize_2nd' as const },
                      { label: '🥉 3º lugar', key: 'prize_3rd' as const },
                    ].map(f => (
                      <div key={f.key} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <label style={{ fontSize: 12 }}>{f.label}</label>
                          <span style={{ fontSize: 12, color: 'var(--gold)' }}>
                            R$ {((Object.values(memberPayments).filter(Boolean).length * payment.entry_value) * payment[f.key] / 100).toFixed(2)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input className="input" type="number" min="0" max="100"
                            value={payment[f.key]}
                            onChange={e => setPayment(p => ({ ...p, [f.key]: Number(e.target.value) }))} />
                          <span style={{ color: 'var(--muted)', fontSize: 13 }}>%</span>
                        </div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, marginBottom: 12 }}>
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
                )}

                {/* Visualização da distribuição para todos */}
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

                {/* Projeção com ranking */}
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
      </div>

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
