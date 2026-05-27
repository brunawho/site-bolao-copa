'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

      <Link href="/faq" style={{
        display: 'block', textAlign: 'center', marginTop: 32,
        fontSize: 13, color: 'var(--gold)', textDecoration: 'none',
        padding: '12px', border: '1px solid var(--line)', borderRadius: 12
      }}>
        📖 Ver regras do bolão
      </Link>
    </main>
  );
}
