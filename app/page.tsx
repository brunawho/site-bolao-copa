'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      router.replace(data.session ? '/grupos' : '/login');
    });
  }, [router]);

  return (
    <main className="app">
      <div style={{ textAlign: 'center', marginTop: 100 }}>
        <h1 className="brand">Bolão<br /><span>da Copa</span></h1>
        <p style={{ marginTop: 20, color: 'var(--muted)' }}>Carregando...</p>
      </div>
    </main>
  );
}
