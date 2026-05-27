'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function GrupoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const groupId = String(params.id);
  const [groupName, setGroupName] = useState('');
  const [memberId, setMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { router.push('/login'); return; }

      // verifica se é membro
      const { data: member } = await supabase
        .from('group_members').select('id, groups(name)')
        .eq('group_id', groupId).eq('user_id', session.session.user.id).maybeSingle();

      if (!member) { router.push('/grupos'); return; }

      setMemberId(member.id);
      setGroupName((member as any).groups?.name || '');
      sessionStorage.setItem('current_group_id', groupId);
      sessionStorage.setItem('current_member_id', member.id);
      setLoading(false);
    })();
  }, [groupId, router]);

  if (loading) return <main className="app"><div className="empty">Carregando...</div></main>;

  return (
    <>
      {/* Header com nome do grupo */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(10,31,23,0.95)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--line)',
        padding: '12px 20px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center'
      }}>
        <Link href="/grupos" style={{
          color: 'var(--muted)', textDecoration: 'none',
          fontSize: 13, display: 'flex', alignItems: 'center', gap: 6
        }}>
          ← Grupos
        </Link>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>{groupName}</span>
      </div>

      {children}

      {/* Bottom nav do grupo */}
      <nav className="nav">
        {[
          { href: `/grupo/${groupId}/palpites`, label: 'Palpites', icon: '⚽' },
          { href: `/grupo/${groupId}/galera`,   label: 'Galera',   icon: '👥' },
          { href: `/grupo/${groupId}/ranking`,  label: 'Ranking',  icon: '🏆' },
          { href: `/grupo/${groupId}/faq`,      label: 'Regras',   icon: '📖' }
        ].map(it => (
          <NavLink key={it.href} href={it.href} label={it.label} icon={it.icon} />
        ))}
      </nav>
    </>
  );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  const params = useParams();
  const isActive = typeof window !== 'undefined' && window.location.pathname === href;
  return (
    <Link href={href} className={isActive ? 'active' : ''}>
      <span className="nav-icon">{icon}</span>
      {label}
    </Link>
  );
}
