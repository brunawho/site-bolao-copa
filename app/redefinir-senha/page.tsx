'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RedefinirSenha() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState('');
  const [success, setSuccess]   = useState(false);

  useEffect(() => {
    // Supabase redireciona com token na URL — ele processa automaticamente
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // usuário está autenticado com token de recovery — pode redefinir
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (password !== confirm) { setErr('As senhas não coincidem'); return; }
    if (password.length < 6)  { setErr('Senha precisa ter pelo menos 6 caracteres'); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) { setErr(error.message); return; }
    setSuccess(true);
    setTimeout(() => router.push('/grupos'), 2500);
  }

  return (
    <main className="app">
      <div style={{ marginTop: 60 }}>
        <h1 className="brand">Nova<br /><span>Senha</span></h1>
        <p className="subtitle">Digite sua nova senha abaixo.</p>
      </div>

      {success ? (
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 40 }}>✅</p>
          <p style={{ marginTop: 16, color: 'var(--green)' }}>Senha redefinida! Redirecionando...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ marginTop: 40 }}>
          <input className="input" type="password" placeholder="Nova senha (mín. 6 caracteres)"
            value={password} onChange={e => setPassword(e.target.value)}
            required minLength={6} style={{ marginBottom: 10 }} />
          <input className="input" type="password" placeholder="Confirmar nova senha"
            value={confirm} onChange={e => setConfirm(e.target.value)}
            required minLength={6} style={{ marginBottom: 10 }} />

          {err && (
            <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>
              ⚠️ {err}
            </p>
          )}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      )}
    </main>
  );
}
