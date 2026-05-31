'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, type Group } from '@/lib/supabase';

export default function Grupos() {
  const router = useRouter();
  const [groups, setGroups]     = useState<Group[]>([]);
  const [loading, setLoading]   = useState(true);
  const [userName, setUserName] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [code, setCode]         = useState('');
  const [joining, setJoining]   = useState(false);
  const [err, setErr]           = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) { router.push('/login'); return; }

    const userId = session.session.user.id;

    // pega nome do profile
    const { data: profile } = await supabase
      .from('profiles').select('name').eq('id', userId).maybeSingle();
    setUserName(profile?.name || '');

    // pega memberships
    const { data: members } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);

    if (!members?.length) { setGroups([]); setLoading(false); return; }

    // pega detalhes dos grupos
    const groupIds = members.map((m: any) => m.group_id);
    const { data: gs } = await supabase
      .from('groups')
      .select('id, name, invite_code, created_at')
      .in('id', groupIds);

    setGroups(gs || []);
    setLoading(false);
  }

  async function entrarComCodigo() {
    setErr(''); setJoining(true);
    const clean = code.trim().toUpperCase();

    const { data: g } = await supabase
      .from('groups').select('id, name').eq('invite_code', clean).maybeSingle();

    if (!g) { setErr('Código inválido'); setJoining(false); return; }

    const { data: session } = await supabase.auth.getSession();
    const userId = session.session!.user.id;

    const { error } = await supabase
      .from('group_members').insert({ group_id: g.id, user_id: userId });

    if (error && !error.message.includes('duplicate')) {
      setErr('Erro ao entrar: ' + error.message); setJoining(false); return;
    }

    setJoining(false); setShowJoin(false); setCode('');
    load();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) return <main className="app"><div className="empty">Carregando...</div></main>;

  return (
    <main className="app">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 className="brand" style={{ fontSize: 28 }}>Meus<br /><span>Bolões</span></h1>
        </div>
        <button onClick={logout} style={{
          background: 'transparent', border: '1px solid var(--line)',
          color: 'var(--muted)', padding: '6px 12px', borderRadius: 8,
          fontSize: 12, cursor: 'pointer'
        }}>Sair</button>
      </div>

      <p className="subtitle" style={{ marginBottom: 24 }}>Oi, {userName}! Escolha um grupo:</p>

      {groups.length === 0 ? (
        <div className="empty" style={{ marginBottom: 16 }}>
          Você ainda não participa de nenhum grupo.<br />
          Entre com um código de convite abaixo.
        </div>
      ) : (
        groups.map(g => (
          <Link key={g.id} href={`/grupo/${g.id}/palpites`} className="card"
            style={{ display: 'block', textDecoration: 'none', color: 'inherit', cursor: 'pointer', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 18, marginBottom: 4 }}>{g.name}</h3>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Código: <strong style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>{g.invite_code}</strong>
                </p>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: 20 }}>›</span>
            </div>
          </Link>
        ))
      )}

      {showJoin ? (
        <div className="card" style={{ marginTop: 20 }}>
          <p style={{ fontSize: 13, marginBottom: 10 }}>Digite o código de 6 letras do grupo:</p>
          <input className="input" placeholder="ABC123" maxLength={6}
            value={code} onChange={e => setCode(e.target.value.toUpperCase())}
            style={{ marginBottom: 10, fontFamily: 'monospace', textAlign: 'center', fontSize: 18, letterSpacing: 4 }} />
          {err && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 10 }}>{err}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => { setShowJoin(false); setCode(''); setErr(''); }}
              style={{ flex: 1 }}>Cancelar</button>
            <button className="btn" onClick={entrarComCodigo} disabled={!code.trim() || joining}
              style={{ flex: 1 }}>{joining ? '...' : 'Entrar'}</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-ghost" onClick={() => setShowJoin(true)} style={{ marginTop: 20 }}>
          + Entrar em grupo com código
        </button>
      )}

      <p style={{ marginTop: 24, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
        Não tem um grupo? Peça pra quem criou te mandar o código ou link de convite.
      </p>
    </main>
  );
}
