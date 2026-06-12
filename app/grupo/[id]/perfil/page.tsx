'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase, calcPoints, type Match, type Guess } from '@/lib/supabase';

export default function PerfilPage() {
  const router  = useRouter();
  const params  = useParams();
  const groupId = String(params.id);

  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [newName, setNewName]     = useState('');
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName]   = useState(false);
  const [nameErr, setNameErr]     = useState('');
  const [toast, setToast]         = useState('');
  const [loading, setLoading]     = useState(true);
  const [stats, setStats]         = useState({
    total: 0, exact: 0, winner: 0, partial: 0, zero: 0, points: 0, groups: 0
  });

  // Redefinir senha
  const [showReset, setShowReset]   = useState(false);
  const [resetSent, setResetSent]   = useState(false);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { router.push('/login'); return; }

      const userId = session.session.user.id;
      setEmail(session.session.user.email || '');

      const { data: profile } = await supabase
        .from('profiles').select('name').eq('id', userId).maybeSingle();
      setName(profile?.name || '');
      setNewName(profile?.name || '');

      // Estatísticas gerais (todos os grupos)
      const { data: members } = await supabase
        .from('group_members').select('id').eq('user_id', userId);
      const memberIds = (members || []).map((m: any) => m.id);

      const { data: allGuesses } = await supabase
        .from('guesses').select('*').in('group_member_id', memberIds);

      const { data: allMatches } = await supabase
        .from('matches').select('*').not('score_a', 'is', null).not('score_b', 'is', null);

      const matchMap: Record<string, Match> = {};
      (allMatches || []).forEach((m: any) => { matchMap[m.id] = m; });

      let total = 0, exact = 0, winner = 0, partial = 0, zero = 0, points = 0;
      const counted = new Set<string>();

      for (const g of (allGuesses || []) as Guess[]) {
        const m = matchMap[g.match_id];
        if (!m || counted.has(g.match_id)) continue;
        counted.add(g.match_id);
        const pts = calcPoints(g.guess_a, g.guess_b, g.guess_penalty_winner, m.score_a!, m.score_b!, m.penalty_winner, m.is_knockout);
        total++;
        points += pts;
        if (pts >= 6 && g.guess_a === m.score_a && g.guess_b === m.score_b) exact++;
        else if (pts === 3 || pts === 4) winner++;
        else if (pts === 1) partial++;
        else zero++;
      }

      setStats({ total, exact, winner, partial, zero, points, groups: members?.length || 0 });
      setLoading(false);
    })();
  }, [groupId, router]);

  async function salvarNome() {
    if (!newName.trim()) { setNameErr('Nome não pode ser vazio'); return; }
    if (newName.trim() === name) { setEditingName(false); return; }
    setSavingName(true); setNameErr('');

    const { data: available } = await supabase.rpc('check_name_available', { check_name: newName.trim() });
    if (!available) { setNameErr('Este nome já está em uso'); setSavingName(false); return; }

    const { data: session } = await supabase.auth.getSession();
    const { error } = await supabase
      .from('profiles').update({ name: newName.trim() }).eq('id', session.session!.user.id);

    if (error) { setNameErr('Erro ao salvar'); setSavingName(false); return; }
    setName(newName.trim());
    setEditingName(false);
    setSavingName(false);
    showToast('Nome atualizado! ✅');
  }

  async function enviarResetSenha() {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`
    });
    setResetSent(true);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  const pct = (v: number) => stats.total > 0 ? Math.round(v / stats.total * 100) : 0;

  if (loading) return (
    <main className="app">
      {[1,2,3].map(i => (
        <div key={i} style={{ height: 80, borderRadius: 14, background: 'var(--card)', marginBottom: 12, animation: 'pulse 1.5s infinite' }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
    </main>
  );

  return (
    <main className="app">
      {toast && <div className="toast" style={{ background: 'var(--gold)', color: '#1a1a1a' }}>{toast}</div>}

      <h1 className="brand" style={{ fontSize: 28, marginBottom: 4, marginTop: 20 }}>Meu Perfil</h1>
      <p className="subtitle" style={{ marginBottom: 20 }}>Suas informações e estatísticas.</p>

      {/* Avatar grande */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(212,167,44,0.2)', border: '3px solid var(--gold)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, fontWeight: 700, color: 'var(--gold)', marginBottom: 8
        }}>
          {name.charAt(0).toUpperCase()}
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>{email}</p>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>{stats.groups} grupo{stats.groups !== 1 ? 's' : ''}</p>
      </div>

      {/* Editar nome */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingName ? 12 : 0 }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>Nome de usuário</p>
            {!editingName && <p style={{ fontSize: 16, fontWeight: 700 }}>{name}</p>}
          </div>
          {!editingName && (
            <button onClick={() => setEditingName(true)} style={{
              background: 'var(--bg-soft)', border: '1px solid var(--line)',
              borderRadius: 8, padding: '6px 12px', fontSize: 12,
              color: 'var(--muted)', cursor: 'pointer'
            }}>✏️ Editar</button>
          )}
        </div>
        {editingName && (
          <>
            <input className="input" value={newName}
              onChange={e => { setNewName(e.target.value); setNameErr(''); }}
              maxLength={30} style={{ marginBottom: 8 }}
              onKeyDown={e => e.key === 'Enter' && salvarNome()} />
            {nameErr && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 8 }}>{nameErr}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => { setEditingName(false); setNewName(name); setNameErr(''); }} style={{ flex: 1 }}>
                Cancelar
              </button>
              <button className="btn" onClick={salvarNome} disabled={savingName} style={{ flex: 1 }}>
                {savingName ? '...' : 'Salvar'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Estatísticas gerais */}
      {stats.total > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>📊 Estatísticas gerais</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-soft)', borderRadius: 12 }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: 'var(--gold)' }}>{stats.points}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>pontos totais</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-soft)', borderRadius: 12 }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: 'var(--gold)' }}>{stats.total}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>palpites feitos</div>
            </div>
          </div>

          {[
            { label: '🎯 Placar exato', value: stats.exact, color: '#2ea84c' },
            { label: '✅ Vencedor acertado', value: stats.winner, color: 'var(--gold)' },
            { label: '〰️ Parcial (1pt)', value: stats.partial, color: '#8ba9ff' },
            { label: '❌ Errou', value: stats.zero, color: 'var(--danger)' },
          ].map(s => (
            <div key={s.label} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>{s.label}</span>
                <span style={{ color: s.color, fontWeight: 700 }}>{s.value} ({pct(s.value)}%)</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--line)' }}>
                <div style={{ height: '100%', borderRadius: 3, background: s.color, width: `${pct(s.value)}%`, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Opções de conta */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>⚙️ Conta</p>

        {!showReset ? (
          <button onClick={() => setShowReset(true)} className="btn btn-ghost" style={{ marginBottom: 8 }}>
            🔑 Redefinir senha
          </button>
        ) : resetSent ? (
          <div style={{ padding: '12px', background: 'rgba(46,168,76,0.1)', border: '1px solid #2ea84c', borderRadius: 10, fontSize: 13, color: '#2ea84c', marginBottom: 8 }}>
            ✅ Email enviado para {email}
          </div>
        ) : (
          <div style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
              Enviaremos um link para {email}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setShowReset(false)} style={{ flex: 1 }}>Cancelar</button>
              <button className="btn" onClick={enviarResetSenha} style={{ flex: 1 }}>Enviar email</button>
            </div>
          </div>
        )}

        <button onClick={logout} style={{
          width: '100%', padding: '12px', borderRadius: 12,
          background: 'rgba(227,93,93,0.1)', border: '1px solid var(--danger)',
          color: 'var(--danger)', fontWeight: 700, fontSize: 14, cursor: 'pointer'
        }}>
          🚪 Sair da conta
        </button>
      </div>

      <div style={{ height: 100 }} />
    </main>
  );
}
