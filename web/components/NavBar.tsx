'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { COLORS } from '../app/components/constants';

export default function NavBar() {
  const pathname = usePathname();

  const links = [
    { href: '/',        label: 'Case Study'         },
    { href: '/analyze', label: 'Analyze Your Data'  },
  ];

  return (
    <div
      style={{
        position:     'sticky',
        top:          0,
        zIndex:       20,
        background:   COLORS.paper,
        borderBottom: `1px solid ${COLORS.line}`,
      }}
    >
      <div
        className="max-w-[1080px] mx-auto flex items-center justify-between"
        style={{ padding: '0 24px', height: 48 }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span
            style={{
              fontFamily:  "'Fraunces', serif",
              fontStyle:   'italic',
              fontSize:    17,
              fontWeight:  500,
              color:       COLORS.ink,
              letterSpacing: '-0.01em',
            }}
          >
            Retail{' '}
            <span style={{ color: COLORS.stamp }}>Intelligence</span>
          </span>
        </Link>

        {/* Nav Links */}
        <nav style={{ display: 'flex', alignItems: 'stretch', height: '100%' }}>
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  padding:        '0 16px',
                  height:         '100%',
                  fontFamily:     "'IBM Plex Sans', sans-serif",
                  fontSize:       13,
                  fontWeight:     active ? 600 : 400,
                  textDecoration: 'none',
                  color:          active ? COLORS.stamp : COLORS.inkMuted,
                  borderBottom:   active ? `2.25px solid ${COLORS.stamp}` : '2.25px solid transparent',
                  boxSizing:      'border-box',
                  transition:     'color 0.15s',
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.color = COLORS.ink;
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.color = COLORS.inkMuted;
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
