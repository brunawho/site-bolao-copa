'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ThemeToggle } from '@/components/theme-provider';

export default function GrupoLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const params   = useParams();
  const pathname = usePathname();
  const groupId  = String(params.id);
  const [groupName, setGroupName]   = useState('');
  const [loading, setLoading]       = useState(true);
  const [wcEnded, setWcEnded]       = useState(false);
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
    { href: `/grupo/${groupId}/galera`,      label: 'Galera',    icon: '👥', badge: 0 },
    { href: `/grupo/${groupId}/ranking`,     label: 'Ranking',   icon: '📊', badge: 0 },
    { href: `/grupo/${groupId}/meus-pontos`, label: 'Meus pts',  icon: '⭐', badge: 0 },
    { href: `/grupo/${groupId}/faq`,         label: 'Regras',    icon: '📖', badge: 0 },
    ...(wcEnded ? [{ href: `/grupo/${groupId}/encerramento`, label: 'Final', icon: '🏆', badge: 0 }] : []),
  ];

  return (
    <>
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(5,10,5,0.96)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--line2)',
        padding: '10px 16px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
        gap: 10,
      }}>
        <Link href="/grupos" style={{ color: 'var(--sub)', textDecoration: 'none', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>
          ← Grupos
        </Link>
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: '.08em', color: 'var(--neon)', textShadow: 'var(--shadow-neon)', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {groupName}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <ThemeToggle />
          <Link href={`/grupo/${groupId}/perfil`} style={{ color: 'var(--sub)', textDecoration: 'none', fontSize: 18 }}>
            👤
          </Link>
        </div>
      </div>

      {children}

      <nav className="nav" style={{ justifyContent: 'space-around', padding: '6px 4px' }}>
        {navItems.map(it => {
          const itemFontSize = navItems.length > 5 ? 8 : 9;
          const iconSize     = navItems.length > 5 ? 18 : 20;
          const isActive     = pathname === it.href;
          return (
            <Link key={it.href} href={it.href}
              className={isActive ? 'active' : ''}
              style={{
                fontSize: itemFontSize,
                position: 'relative',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                minWidth: 0,
                padding: '2px 2px',
                textAlign: 'center',
                color: isActive ? 'var(--neon)' : 'var(--sub)',
                textDecoration: 'none',
                fontWeight: isActive ? 800 : 400,
                textTransform: 'uppercase',
                letterSpacing: '.05em',
              }}>
              <span style={{ fontSize: iconSize, position: 'relative', display: 'inline-block', lineHeight: 1 }}>
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
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
                display: 'block',
              }}>{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
