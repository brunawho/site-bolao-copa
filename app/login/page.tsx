'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const router = useRouter();
  const [mode, setMode]         = useState<'login' | 'signup'>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push('/grupos');
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setLoading(true);

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { name: name.trim() } }
      });
      if (error) { setErr(error.message); setLoading(false); return; }
      // Login automático depois do signup
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
      if (loginErr) { setErr(loginErr.message); setLoading(false); return; }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setErr('Email ou senha incorretos'); setLoading(false); return; }
    }

    router.push('/grupos');
  }

  return (
    <main className="app">
      <div style={{ marginTop: 60 }}>
        <h1 className="brand">Bolão<br /><span>da Copa</span></h1>
        <p className="subtitle">
          {mode === 'login' ? 'Faça login pra entrar nos seus bolões.' : 'Crie sua conta e comece a palpitar.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: 40 }}>
        {mode === 'signup' && (
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

        {err && (
          <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>
            ⚠️ {err}
          </p>
        )}

        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Aguarde...' : (mode === 'login' ? 'Entrar' : 'Criar conta')}
        </button>
      </form>

      <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErr(''); }}
        style={{
          marginTop: 16, width: '100%', padding: 12,
          background: 'transparent', border: 'none',
          color: 'var(--gold)', fontSize: 13, cursor: 'pointer'
        }}>
        {mode === 'login' ? 'Não tem conta? Criar uma' : 'Já tem conta? Fazer login'}
      </button>
    </main>
  );
}
