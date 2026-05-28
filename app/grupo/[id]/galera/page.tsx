'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase, type Match, type Guess } from '@/lib/supabase';

type Member = { id: string; user_id: string; name: string };

export default function GaleraGrupo() {
  const params = useParams();
  const groupId = String(params.id);
  const [members, setMembers]     = useState<Member[]>([]);
  const [matches, setMatches]     = useState<Match[]>([]);
  const [selected, setSelected]   = useState<Member | null>(null);
  const [guesses, setGuesses]     = useState<Guess[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied]       = useState(false);

  useEffect(() => {
    (async () => {
      // código do grupo
      const { data: g } = await supabase
        .from('groups').select('invite_code').eq('id', groupId).maybeSingle();
      setInviteCode(g?.invite_code || '');

      // membros — duas queries separadas
      const { data: ms } = await supabase
        .from('group_members')
        .select('id, user_id')
        .eq('group_id', groupId);

      if (ms?.length) {
        const userIds = ms.map((m: any) => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);

        const list: Member[] = ms.map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          name: profiles?.find((p: any) => p.id === m.user_id)?.name || 'Sem nome'
        })).sort((a, b) => a.name.localeCompare(b.name));

        setMembers(list);
      }

      // jogos
      const { data: mt } = await supabase.from('matches').select('*').order('match_date');
      setMatches(mt || []);
    })();
  }, [groupId]);

  async function open(m: Member) {
    setSelected(m);
    const { data } = await supabase.from('guesses').select('*').eq('group_member_id', m.id);
    setGuesses(data || []);
  }

  async function copyInvite() {
    const url = `${window.location.origin}/convite/${inviteCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  }

  if (selected) {
    const byMatch: Record<string, Guess> = {};
    guesses.forEach(g => { byMatch[g.match_id] = g; });

    // Agrupa por dia
    const byDay: Record<string, Match[]> = {};
    matches.forEach(m => {
      const day = new Date(m.match_date).toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(m);
    });
    const days = Object.keys(byDay).sort();

    return (
      <main className="app">
        <button className="btn-ghost btn"
          style={{ width: 'auto', padding: '8px 16px', fontSize: 13, marginBottom: 16, marginTop: 20 }}
          onClick={() => setSelected(null)}>← Voltar</button>
        <h1 className="brand" style={{ fontSize: 28, marginBottom: 16 }}>{selected.name}</h1>

        {matches.length === 0 && <div className="empty">Sem jogos.</div>}

        {days.map(day => (
          <div key={day}>
            <div style={{
              margin: '20px 0 10px',
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              <span style={{
                fontSize: 11, color: 'var(--gold)', textTransform: 'uppercase',
                letterSpacing: '0.1em', fontWeight: 700, whiteSpace: 'nowrap'
              }}>
                {new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', {
                  weekday: 'short', day: '2-digit', month: 'short'
                })}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            </div>

            {byDay[day].map(m => {
              const g = byMatch[m.id];
              return (
                <div key={m.id} className="card">
                  <div className="match-meta">
                    <span style={{ fontSize: 11 }}>{m.phase}</span>
                    <span>{new Date(m.match_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="match">
                    <div className="team team-a">{m.team_a}</div>
                    <div className="score-row">
                      <div className="score-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: g ? 1 : 0.3 }}>
                        {g ? g.guess_a : '–'}
                      </div>
                      <span className="vs">x</span>
                      <div className="score-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: g ? 1 : 0.3 }}>
                        {g ? g.guess_b : '–'}
                      </div>
                    </div>
                    <div className="team team-b">{m.team_b}</div>
                  </div>
                  {!g && (
                    <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                      Sem palpite
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ height: 100 }} />
      </main>
    );
  }

  return (
    <main className="app">
      <h1 className="brand" style={{ fontSize: 28, marginBottom: 4, marginTop: 20 }}>A Galera</h1>
      <p className="subtitle" style={{ marginBottom: 16 }}>Toque em alguém pra ver os palpites.</p>

      {/* Convite */}
      {inviteCode && (
        <div className="card" style={{ marginBottom: 20, background: 'rgba(212,167,44,0.08)' }}>
          <p style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Convidar mais gente
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Código:</span>
            <span style={{
              fontFamily: 'monospace', fontSize: 18, fontWeight: 700,
              color: 'var(--gold)', letterSpacing: 2
            }}>{inviteCode}</span>
          </div>
          <button className="btn btn-ghost" onClick={copyInvite}
            style={{ width: '100%', padding: '10px', fontSize: 12 }}>
            {copied ? '✅ Link copiado!' : '🔗 Copiar link de convite'}
          </button>
        </div>
      )}

      {members.length === 0 && <div className="empty">Ninguém entrou ainda.</div>}

      <div className="card" style={{ padding: 0 }}>
        {members.map(m => (
          <div key={m.id} className="person-item" onClick={() => open(m)}>
            <span style={{ fontWeight: 600 }}>{m.name}</span>
            <span className="chevron">›</span>
          </div>
        ))}
      </div>

      <div style={{ height: 100 }} />
    </main>
  );
}
