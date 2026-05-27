'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase, type Match, type Guess } from '@/lib/supabase';

type Member = { id: string; user_id: string; name: string };

export default function GaleraGrupo() {
  const params = useParams();
  const groupId = String(params.id);
  const [members, setMembers] = useState<Member[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      // grupo + código
      const { data: g } = await supabase
        .from('groups').select('invite_code').eq('id', groupId).maybeSingle();
      setInviteCode(g?.invite_code || '');

      // membros
      const { data: ms } = await supabase
        .from('group_members')
        .select('id, user_id, profiles(name)')
        .eq('group_id', groupId);

      const list: Member[] = (ms || []).map((m: any) => ({
        id: m.id, user_id: m.user_id, name: m.profiles?.name || 'Sem nome'
      })).sort((a, b) => a.name.localeCompare(b.name));
      setMembers(list);

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

  if (selected) {
    const byMatch: Record<string, Guess> = {};
    guesses.forEach(g => { byMatch[g.match_id] = g; });

    return (
      <main className="app">
        <button className="btn-ghost btn"
          style={{ width: 'auto', padding: '8px 16px', fontSize: 13, marginBottom: 16, marginTop: 20 }}
          onClick={() => setSelected(null)}>← Voltar</button>
        <h1 className="brand" style={{ fontSize: 28, marginBottom: 16 }}>{selected.name}</h1>

        {matches.length === 0 && <div className="empty">Sem jogos.</div>}

        {matches.map(m => {
          const g = byMatch[m.id];
          return (
            <div key={m.id} className="card">
              <div className="match-meta">
                <span>{m.phase}</span>
                <span>{g ? 'Palpitou' : 'Sem palpite'}</span>
              </div>
              <div className="match">
                <div className="team team-a">{m.team_a}</div>
                <div className="score-row">
                  <div className="score-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {g ? g.guess_a : '–'}
                  </div>
                  <span className="vs">x</span>
                  <div className="score-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {g ? g.guess_b : '–'}
                  </div>
                </div>
                <div className="team team-b">{m.team_b}</div>
              </div>
            </div>
          );
        })}
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
    </main>
  );
}
