'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Mode = 'loading' | 'login' | 'signup' | 'joining' | 'done' | 'error';

export default function Convite() {
  const router = useRouter();
  const params = useParams();
  const code = String(params.code || '').toUpperCase();

  const [mode, setMode]           = useState<Mode>('loading');
  const [groupName, setGroupName] = useState('');
  const [groupId, setGroupId]     = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [name, setName]           = useState('');
  const [err, setErr]             = useState('');
  const [saving, setSaving]       = useState(false);
  const [authMode, setAuthMode]   = useState<'login' | 'signup'>('login');

  useEffect(() => {
    (async () => {
      const { data: group } = await supabase
        .from('groups').select('id, name').eq('invite_code', code).maybeSingle();

      if (!group) { setMode('error'); return; }

      setGroupName(group.name);
      setGroupId(group.id);

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setMode('login');
        return;
      }

      // Já logado — entra direto
      await entrarNoGrupo(group.id, session.session.user.id);
    })();
  }, [code]);

  async function entrarNoGrupo(gId: string, userId: string) {
    setMode('joining');
    const { data: existing } = await supabase
      .from('group_members').select('id')
      .eq('group_id', gId).eq('user_id', userId).maybeSingle();

    if (existing) {
      // Já é membro
      router.push(`/grupo/${gId}/palpites`);
      return;
    }

    const { error } = await supabase.from('group_members')
      .insert({ group_id: gId, user_id: userId });

    if (error) { setMode('error'); return; }
    setMode('done');
    setTimeout(() => router.push(`/grupo/${gId}/palpites`), 1500);
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setSaving(true);

    if (authMode === 'signup') {
      if (!name.trim()) { setErr('Digite seu nome para continuar.'); setSaving(false); return; }
      if (name.trim().length < 2) { setErr('Nome deve ter pelo menos 2 caracteres.'); setSaving(false); return; }

      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { name: name.trim() } }
      });
      if (error) {
        if (error.message.includes('already registered')) {
          setErr('Este email já está cadastrado.');
        } else if (error.message.includes('unique') || error.message.includes('duplicate')) {
          setErr('Este nome já está em uso. Escolha outro.');
        } else {
          setErr(error.message);
        }
        setSaving(false); return;
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setErr('Email ou senha incorretos'); setSaving(false); return; }

    setSaving(false);
    // Pequeno delay para garantir que o profile foi criado pelo trigger
    await new Promise(r => setTimeout(r, 500));
    await entrarNoGrupo(groupId, data.session!.user.id);
  }

  if (mode === 'loading' || mode === 'joining') {
    return (
      <main className="app">
        <div style={{ textAlign: 'center', marginTop: 100 }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>⚽</div>
          <p style={{ color: 'var(--muted)' }}>
            {mode === 'loading' ? 'Verificando convite...' : 'Entrando no grupo...'}
          </p>
        </div>
      </main>
    );
  }

  if (mode === 'done') {
    return (
      <main className="app">
        <div style={{ textAlign: 'center', marginTop: 100 }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🎉</div>
          <h2 style={{ color: 'var(--gold)', marginBottom: 8 }}>Bem-vindo!</h2>
          <p style={{ color: 'var(--muted)' }}>Entrando em "{groupName}"...</p>
        </div>
      </main>
    );
  }

  if (mode === 'error') {
    return (
      <main className="app">
        <div style={{ textAlign: 'center', marginTop: 100 }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>❌</div>
          <p style={{ color: 'var(--danger)' }}>Código de convite inválido.</p>
          <button className="btn" style={{ marginTop: 20 }} onClick={() => router.push('/login')}>
            Ir para o login
          </button>
        </div>
      </main>
    );
  }

  // mode === 'login' — mostra formulário de login ou cadastro
  return (
    <main className="app">
      <div style={{ textAlign: 'center', marginTop: 40, marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
        <h1 className="brand" style={{ fontSize: 28, marginBottom: 8 }}>Convite</h1>
        <p style={{ color: 'var(--muted)', fontSize: 15 }}>
          Você foi convidado para o grupo
        </p>
        <p style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 18, marginTop: 4 }}>
          {groupName}
        </p>
      </div>

      {/* Toggle login/cadastro */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => { setAuthMode('login'); setErr(''); }} style={{
          flex: 1, padding: '10px', borderRadius: 12, border: '1px solid',
          borderColor: authMode === 'login' ? 'var(--gold)' : 'var(--line)',
          background: authMode === 'login' ? 'var(--gold)' : 'var(--card)',
          color: authMode === 'login' ? '#1a1a1a' : 'var(--text)',
          fontWeight: authMode === 'login' ? 700 : 400, fontSize: 14, cursor: 'pointer'
        }}>Já tenho conta</button>
        <button onClick={() => { setAuthMode('signup'); setErr(''); }} style={{
          flex: 1, padding: '10px', borderRadius: 12, border: '1px solid',
          borderColor: authMode === 'signup' ? 'var(--gold)' : 'var(--line)',
          background: authMode === 'signup' ? 'var(--gold)' : 'var(--card)',
          color: authMode === 'signup' ? '#1a1a1a' : 'var(--text)',
          fontWeight: authMode === 'signup' ? 700 : 400, fontSize: 14, cursor: 'pointer'
        }}>Criar conta</button>
      </div>

      <form onSubmit={handleAuth}>
        {authMode === 'signup' && (
          <input className="input" placeholder="Seu nome"
            value={name} onChange={e => setName(e.target.value)}
            required maxLength={30} style={{ marginBottom: 10 }} />
        )}
        <input className="input" type="email" placeholder="Email"
          value={email} onChange={e => setEmail(e.target.value)}
          required style={{ marginBottom: 10 }} />
        <input className="input" type="password" placeholder="Senha (mín. 6 caracteres)"
          value={password} onChange={e => setPassword(e.target.value)}
          required minLength={6} style={{ marginBottom: 10 }} />

        {err && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>⚠️ {err}</p>}

        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Aguarde...' : authMode === 'login' ? 'Entrar no grupo' : 'Criar conta e entrar'}
        </button>
      </form>
    </main>
  );
}
