'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('participant_name');
    if (saved) setName(saved);
  }, []);

  async function entrar() {
    const clean = name.trim();
    if (!clean) return;
    setLoading(true);

    // procura participante
    const { data: existing } = await supabase
      .from('participants')
      .select('id, name')
      .eq('name', clean)
      .maybeSingle();

    let participant = existing;
    if (!participant) {
      const { data: created, error } = await supabase
        .from('participants')
        .insert({ name: clean })
        .select()
        .single();
      if (error) { alert('Erro ao entrar: ' + error.message); setLoading(false); return; }
      participant = created;
    }

    localStorage.setItem('participant_id', participant!.id);
    localStorage.setItem('participant_name', participant!.name);
    router.push('/palpites');
  }

  return (
    <main className="app">
      <div style={{ marginTop: 60 }}>
        <h1 className="brand">Bolão<br/><span>da Copa</span></h1>
        <p className="subtitle">
          Palpite nos jogos, dispute com a galera e descubra quem realmente entende de futebol.
          Sem cadastro chato. Só seu nome.
        </p>
      </div>

      <div style={{ marginTop: 48 }}>
        <input
          className="input"
          placeholder="Seu nome ou apelido"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && entrar()}
          maxLength={30}
        />
        <button
          className="btn"
          style={{ marginTop: 12 }}
          onClick={entrar}
          disabled={!name.trim() || loading}
        >
          {loading ? 'Entrando...' : 'Entrar no bolão'}
        </button>
      </div>

      <p style={{ marginTop: 32, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
        3 pts placar exato · 1 pt vencedor · 0 pt erro
      </p>
    </main>
  );
}
