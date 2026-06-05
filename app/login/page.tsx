'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Mode = 'login' | 'signup' | 'reset';

export default function Login() {
  const router = useRouter();
  const [mode, setMode]         = useState<Mode>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState('');
  const [success, setSuccess]   = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push('/grupos');
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setSuccess(''); setLoading(true);

    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`
      });
      setLoading(false);
      if (error) { setErr(error.message); return; }
      setSuccess('Email enviado! Verifique sua caixa de entrada.');
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) { setErr('Digite seu nome para continuar.'); setLoading(false); return; }
      if (name.trim().length < 2) { setErr('Nome deve ter pelo menos 2 caracteres.'); setLoading(false); return; }

      // Verifica nome duplicado via function (sem precisar de autenticação)
      const { data: nameAvailable } = await supabase
        .rpc('check_name_available', { check_name: name.trim() });
      if (!nameAvailable) { setErr('Este nome já está em uso. Escolha outro.'); setLoading(false); return; }

      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { name: name.trim() } }
      });
      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          setErr('Este email já está cadastrado.');
        } else {
          setErr(error.message);
        }
        setLoading(false); return;
      }
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
      if (loginErr) {
        setErr('Erro ao fazer login após cadastro. Tente novamente.');
        setLoading(false); return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setErr('Email ou senha incorretos'); setLoading(false); return; }
    }

    // Verifica se tem convite pendente
    const pending = localStorage.getItem('pending_invite');
    if (pending) {
      localStorage.removeItem('pending_invite');
      router.push(`/convite/${pending}`);
    } else {
      router.push('/grupos');
    }
  }

  return (
    <main className="app">
      <div style={{ marginTop: 60 }}>
        <h1 className="brand">Bolão<br /><span>da Copa</span></h1>
        <p className="subtitle">
          {mode === 'login' && 'Faça login pra entrar nos seus bolões.'}
          {mode === 'signup' && 'Crie sua conta e comece a palpitar.'}
          {mode === 'reset' && 'Digite seu email pra redefinir a senha.'}
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

        {mode !== 'reset' && (
          <input className="input" type="password" placeholder="Senha (mín. 6 caracteres)"
            value={password} onChange={e => setPassword(e.target.value)}
            required minLength={6} style={{ marginBottom: 10 }} />
        )}

        {err && (
          <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>
            ⚠️ {err}
          </p>
        )}

        {success && (
          <p style={{ color: 'var(--green)', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>
            ✅ {success}
          </p>
        )}

        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Aguarde...' : (
            mode === 'login' ? 'Entrar' :
            mode === 'signup' ? 'Criar conta' :
            'Enviar email de redefinição'
          )}
        </button>
      </form>

      {/* Links de navegação */}
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        {mode === 'login' && (
          <>
            <button onClick={() => { setMode('signup'); setErr(''); setSuccess(''); setPassword(''); }}
              style={{ background: 'transparent', border: 'none', color: 'var(--gold)', fontSize: 13, cursor: 'pointer' }}>
              Não tem conta? Criar uma
            </button>
            <button onClick={() => { setMode('reset'); setErr(''); setSuccess(''); setPassword(''); }}
              style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer' }}>
              Esqueci minha senha
            </button>
          </>
        )}
        {mode === 'signup' && (
          <button onClick={() => { setMode('login'); setErr(''); setSuccess(''); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--gold)', fontSize: 13, cursor: 'pointer' }}>
            Já tem conta? Fazer login
          </button>
        )}
        {mode === 'reset' && (
          <button onClick={() => { setMode('login'); setErr(''); setSuccess(''); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--gold)', fontSize: 13, cursor: 'pointer' }}>
            ← Voltar ao login
          </button>
        )}
      </div>
    </main>
  );
}
