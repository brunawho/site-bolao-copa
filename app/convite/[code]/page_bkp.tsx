'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Convite() {
  const router = useRouter();
  const params = useParams();
  const code = String(params.code || '').toUpperCase();
  const [status, setStatus] = useState('Verificando convite...');
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    (async () => {
      // 1. Procura grupo pelo código
      const { data: group } = await supabase
        .from('groups').select('id, name').eq('invite_code', code).maybeSingle();

      if (!group) {
        setStatus('❌ Código de convite inválido');
        setTimeout(() => router.push('/login'), 2500);
        return;
      }

      setGroupName(group.name);

      // 2. Verifica se está logado
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        // Salva o código pra entrar depois do login
        localStorage.setItem('pending_invite', code);
        setStatus(`Faça login para entrar em "${group.name}"`);
        setTimeout(() => router.push('/login'), 1500);
        return;
      }

      const userId = session.session.user.id;

      // 3. Tenta entrar
      const { error } = await supabase.from('group_members')
        .insert({ group_id: group.id, user_id: userId });

      if (error && !error.message.includes('duplicate')) {
        setStatus('Erro: ' + error.message);
        return;
      }

      setStatus(`✅ Entrou em "${group.name}"!`);
      setTimeout(() => router.push(`/grupo/${group.id}/palpites`), 1500);
    })();
  }, [code, router]);

  return (
    <main className="app">
      <div style={{ textAlign: 'center', marginTop: 100 }}>
        <h1 className="brand" style={{ fontSize: 36 }}>🎉</h1>
        <p style={{ marginTop: 20, fontSize: 16 }}>{status}</p>
        {groupName && <p style={{ marginTop: 8, color: 'var(--gold)', fontWeight: 700 }}>{groupName}</p>}
      </div>
    </main>
  );
}
