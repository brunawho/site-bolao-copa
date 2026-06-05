'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function GrupoLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const params   = useParams();
  const pathname = usePathname();
  const groupId  = String(params.id);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { router.push('/login'); return; }

      const { data: member } = await supabase
        .from('group_members').select('id')
        .eq('group_id', groupId).eq('user_id', session.session.user.id).maybeSingle();

      if (!member) { router.push('/grupos'); return; }

      const { data: group } = await supabase
        .from('groups').select('name, created_by').eq('id', groupId).maybeSingle();

      setGroupName(group?.name || '');
      setLoading(false);
    })();
  }, [groupId, router]);

  if (loading) return <main className="app"><div className="empty">Carregando...</div></main>;

  const navItems = [
    { href: `/grupo/${groupId}/palpites`,    label: 'Palpites',  icon: '⚽' },
    { href: `/grupo/${groupId}/apostas`,     label: 'Especiais', icon: '🏆' },
    { href: `/grupo/${groupId}/galera`,      label: 'Galera',    icon: '👥' },
    { href: `/grupo/${groupId}/ranking`,     label: 'Ranking',   icon: '📊' },
    { href: `/grupo/${groupId}/meus-pontos`, label: 'Meus pts',  icon: '⭐' },
    { href: `/grupo/${groupId}/faq`,         label: 'Regras',    icon: '📖' },
  ];

  return (
    <>
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(10,15,31,0.95)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--line)',
        padding: '12px 20px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center'
      }}>
        <Link href="/grupos" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: 13 }}>
          ← Grupos
        </Link>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>{groupName}</span>
      </div>

      {children}

      <nav className="nav" style={{ justifyContent: 'space-around' }}>
        {navItems.map(it => (
          <Link key={it.href} href={it.href} className={pathname === it.href ? 'active' : ''}
            style={{ fontSize: 9 }}>
            <span className="nav-icon" style={{ fontSize: 16 }}>{it.icon}</span>
            {it.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
