'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ThemeToggle } from '@/components/theme-provider';

type Edition = { id: string; name: string; code: string; season: number };

export default function GrupoLayout({ children }: { children: React.ReactNode }) {
  const router       = useRouter();
  const params       = useParams();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const groupId      = String(params.id);

  const [groupName, setGroupName]     = useState('');
  const [loading, setLoading]         = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [editions, setEditions]       = useState<Edition[]>([]);
  const [wcEnded, setWcEnded]         = useState(false);

  // Edição ativa — lida da query param ou 'all'
  const activeEdition = searchParams.get('edition') || 'all';

  function navigate(href: string, editionId?: string) {
    const ed = editionId ?? activeEdition;
    const sep = href.includes('?') ? '&' : '?';
    router.push(ed && ed !== 'all' ? `${href}${sep}edition=${ed}` : href);
  }

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { router.push('/login'); return; }

      const { data: member } = await supabase
        .from('group_members').select('id')
        .eq('group_id', groupId).eq('user_id', session.session.user.id).maybeSingle();
      if (!member) { router.push('/grupos'); return; }

      const { data: group } = await supabase
        .from('groups').select('name').eq('id', groupId).maybeSingle();
      setGroupName(group?.name || '');

      // Campeonatos ativos no grupo = edições
      const { data: gcData } = await supabase
        .from('group_competitions')
        .select('competitions(id, name, code, season:currentSeason)')
        .eq('group_id', groupId);

      const eds: Edition[] = [];
      // Copa do Mundo sempre aparece como edição
      eds.push({ id: 'wc', name: 'Copa 2026', code: 'WC', season: 2026 });
      (gcData || []).forEach((gc: any) => {
        const c = gc.competitions;
        if (c && c.code !== 'WC') {
          eds.push({ id: c.id, name: c.name, code: c.code, season: c.season || new Date().getFullYear() });
        }
      });
      setEditions(eds);

      // Badge de palpites pendentes hoje
      const today = new Date().toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
      }).split('/').reverse().join('-');
      const { data: todayMatches } = await supabase
        .from('matches').select('id')
        .gte('match_date', today + 'T00:00:00-03:00')
        .lte('match_date', today + 'T23:59:59-03:00')
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

  if (loading) return (
    <main className="app">
      <div style={{ marginTop: 20 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ height: 80, background: 'var(--bg3)', borderRadius: 'var(--radius)', marginBottom: 10, animation: 'shimmer 1.5s infinite' }} />
        ))}
      </div>
      <style>{`@keyframes shimmer{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
    </main>
  );

  const navItems = [
    { href: `/grupo/${groupId}/palpites`,      label: 'Palpites', icon: '⚽', badge: pendingCount },
    { href: `/grupo/${groupId}/galera`,        label: 'Galera',   icon: '👥', badge: 0 },
    { href: `/grupo/${groupId}/ranking`,       label: 'Ranking',  icon: '📊', badge: 0 },
    { href: `/grupo/${groupId}/apostas-grupo`, label: 'Apostas',  icon: '⭐', badge: 0 },
    { href: `/grupo/${groupId}/faq`,           label: 'Regras',   icon: '📖', badge: 0 },
    ...(wcEnded ? [{ href: `/grupo/${groupId}/encerramento`, label: 'Final', icon: '🏆', badge: 0 }] : []),
  ];

  // Nome curto da edição ativa
  const activeEd = editions.find(e => e.id === activeEdition);
  const edLabel  = activeEdition === 'all' ? 'Geral' : activeEd?.name || 'Geral';

  return (
    <>
      {/* HEADER */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(5,10,5,0.96)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--line2)',
      }}>
        {/* Linha 1: navegação */}
        <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <Link href="/grupos" style={{ color: 'var(--sub)', textDecoration: 'none', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>
            ← Grupos
          </Link>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: '.08em', color: 'var(--neon)', textShadow: 'var(--shadow-neon)', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {groupName}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <ThemeToggle />
            <Link href={`/grupo/${groupId}/perfil`} style={{ color: 'var(--sub)', textDecoration: 'none', fontSize: 18 }}>👤</Link>
          </div>
        </div>

        {/* Linha 2: seletor de edição */}
        {editions.length > 0 && (
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto', borderTop: '1px solid var(--line)', padding: '0 0' }}>
            {/* Botão Geral */}
            <button onClick={() => navigate(pathname, 'all')} style={{
              padding: '8px 16px', border: 'none', background: 'transparent',
              borderBottom: activeEdition === 'all' ? '2px solid var(--neon)' : '2px solid transparent',
              color: activeEdition === 'all' ? 'var(--neon)' : 'var(--sub)',
              fontSize: 11, fontWeight: activeEdition === 'all' ? 800 : 600,
              cursor: 'pointer', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '.06em',
              transition: 'all .2s',
            }}>
              🌐 Geral
            </button>
            {editions.map(ed => (
              <button key={ed.id} onClick={() => navigate(pathname, ed.id)} style={{
                padding: '8px 16px', border: 'none', background: 'transparent',
                borderBottom: activeEdition === ed.id ? '2px solid var(--neon)' : '2px solid transparent',
                color: activeEdition === ed.id ? 'var(--neon)' : 'var(--sub)',
                fontSize: 11, fontWeight: activeEdition === ed.id ? 800 : 600,
                cursor: 'pointer', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '.06em',
                transition: 'all .2s',
              }}>
                {ed.code === 'WC' ? '🏆' : ed.code === 'BSA' ? '🇧🇷' : ed.code === 'CL' ? '⭐' : '🏅'} {ed.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CONTEÚDO */}
      {children}

      {/* NAV */}
      <nav className="nav" style={{ justifyContent: 'space-around', padding: '6px 4px' }}>
        {navItems.map(it => {
          const itemFontSize = navItems.length > 5 ? 8 : 9;
          const iconSize     = navItems.length > 5 ? 18 : 20;
          // Compara pathname sem query params
          const isActive = pathname === it.href;
          // Mantém edition na navegação
          const hrefWithEdition = activeEdition !== 'all'
            ? `${it.href}?edition=${activeEdition}`
            : it.href;
          return (
            <Link key={it.href} href={hrefWithEdition}
              className={isActive ? 'active' : ''}
              style={{
                fontSize: itemFontSize, position: 'relative', flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                minWidth: 0, padding: '2px 2px', textAlign: 'center',
                color: isActive ? 'var(--neon)' : 'var(--sub)',
                textDecoration: 'none', fontWeight: isActive ? 800 : 400,
                textTransform: 'uppercase', letterSpacing: '.05em',
              }}>
              <span style={{ fontSize: iconSize, position: 'relative', display: 'inline-block', lineHeight: 1 }}>
                {it.icon}
                {it.badge > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -6,
                    background: 'var(--red)', color: '#fff',
                    borderRadius: '50%', width: 14, height: 14,
                    fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{it.badge}</span>
                )}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                {it.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
