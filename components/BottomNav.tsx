'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/palpites', label: 'Palpites', icon: '⚽' },
  { href: '/galera',   label: 'Galera',   icon: '👥' },
  { href: '/ranking',  label: 'Ranking',  icon: '🏆' }
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="nav">
      {items.map((it) => (
        <Link key={it.href} href={it.href} className={pathname === it.href ? 'active' : ''}>
          <span className="nav-icon">{it.icon}</span>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
