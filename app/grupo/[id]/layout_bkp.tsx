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
  const [groupName, setGroupName]   = useState('');
  const [loading, setLoading]       = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

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

      // Conta palpites pendentes de hoje
      const today = new Date().toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
      }).split('/').reverse().join('-');
      const todayStart = today + 'T00:00:00-03:00';
      const todayEnd   = today + 'T23:59:59-03:00';

      const { data: todayMatches } = await supabase
        .from('matches').select('id')
        .gte('match_date', todayStart).lte('match_date', todayEnd)
        .gt('match_date', new Date().toISOString());

      if (todayMatches?.length) {
        const { data: myGuesses } = await supabase
          .from('guesses').select('match_id')
          .eq('group_member_id', member.id)
          .in('match_id', todayMatches.map((m: any) => m.id));
        const guessedIds = new Set((myGuesses || []).map((g: any) => g.match_id));
        setPendingCount(todayMatches.filter((m: any) => !guessedIds.has(m.id)).length);
      }

      setLoading(false);
    })();
  }, [groupId, router]);

  if (loading) return <main className="app"><div className="empty">Carregando...</div></main>;

  const navItems = [
    { href: `/grupo/${groupId}/palpites`,    label: 'Palpites',  icon: '⚽', badge: pendingCount },
    { href: `/grupo/${groupId}/apostas`,     label: 'Especiais', icon: '🏆', badge: 0 },
    { href: `/grupo/${groupId}/galera`,      label: 'Galera',    icon: '👥', badge: 0 },
    { href: `/grupo/${groupId}/ranking`,     label: 'Ranking',   icon: '📊', badge: 0 },
    { href: `/grupo/${groupId}/meus-pontos`, label: 'Meus pts',  icon: '⭐', badge: 0 },
    { href: `/grupo/${groupId}/faq`,         label: 'Regras',    icon: '📖', badge: 0 },
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
            style={{ fontSize: 9, position: 'relative' }}>
            <span className="nav-icon" style={{ fontSize: 16, position: 'relative', display: 'inline-block' }}>
              {it.icon}
              {it.badge > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -6,
                  background: 'var(--danger)', color: '#fff',
                  borderRadius: '50%', width: 14, height: 14,
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1
                }}>{it.badge}</span>
              )}
            </span>
            {it.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
