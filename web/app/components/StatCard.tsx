'use client';

import { useEffect, useRef, useState } from 'react';
import { COLORS } from './constants';

// ── Count-up Hook using ref to prevent early cancel ──────────────────────────

function useCountUp(target: number, duration = 900) {
  const [val, setVal]  = useState(0);
  const rafRef         = useRef<number | null>(null);
  const nodeRef        = useRef<HTMLDivElement | null>(null);
  const startedRef     = useRef(false);

  useEffect(() => {
    startedRef.current = false; // Reset whenever target/duration changes so animation triggers correctly
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !startedRef.current) {
        startedRef.current = true;
        const start = performance.now();
        const tick  = (now: number) => {
          const t     = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
          setVal(eased * target);
          if (t < 1) {
            rafRef.current = requestAnimationFrame(tick);
          }
        };
        rafRef.current = requestAnimationFrame(tick);
      }
    }, { threshold: 0.05 });

    if (nodeRef.current) observer.observe(nodeRef.current);
    return () => {
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return [val, nodeRef] as const;
}

// ── Punch-hole SVG ────────────────────────────────────────────────────────────

function PunchHole() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="5.5" fill="none" stroke={COLORS.line} strokeWidth="1.5" />
      <circle cx="8" cy="8" r="2"   fill={COLORS.line} />
    </svg>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface StatCardProps {
  label:   string;
  value:   string;
  sub?:    string;
}

function parseNumeric(v: string): number {
  // Strip non-numeric except decimal
  const clean = v.replace(/[^0-9.]/g, '');
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

export default function StatCard({ label, value, sub }: StatCardProps) {
  const numeric  = parseNumeric(value);
  const hasDecimals = value.includes('.');
  const [countVal, nodeRef] = useCountUp(numeric);

  // Preserve prefixes/suffixes (e.g. '$', '%') if they exist
  const prefix = value.match(/^[^0-9]*/)?.[0] || '';
  const suffix = value.match(/[^0-9.]*$/)?.[0] || '';

  const display  = numeric > 0
    ? `${prefix}${hasDecimals ? countVal.toFixed(2) : Math.round(countVal).toLocaleString()}${suffix}`
    : value;

  const [hovered, setHovered] = useState(false);

  return (
    <div
      ref={nodeRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:  COLORS.surface, // Surface background #24272C
        border:      `1px solid ${COLORS.line}`,
        borderRight: `2px dashed ${COLORS.line}`,
        padding:     '18px 20px 18px 16px',
        position:    'relative',
        boxShadow:   hovered ? `3px 3px 0 ${COLORS.line}` : `2px 2px 0 ${COLORS.line}`,
        transform:   hovered ? 'translate(-1px, -1px)' : 'none',
        transition:  'box-shadow 0.15s, transform 0.15s',
        cursor:      'default',
      }}
    >
      <div style={{ position: 'absolute', top: 10, left: 10 }}>
        <PunchHole />
      </div>

      <div style={{ paddingLeft: 20 }}>
        <div
          style={{
            fontFamily:    "'IBM Plex Mono', monospace",
            fontSize:      32,
            fontWeight:    600,
            color:         COLORS.ink,
            letterSpacing: '-0.03em',
            lineHeight:    1,
            marginBottom:  6,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {display}
        </div>
        <div
          style={{
            fontFamily:    "'IBM Plex Sans', sans-serif",
            fontSize:      12,
            color:         COLORS.inkMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight:    500,
          }}
        >
          {label}
        </div>
        {sub && (
          <div
            style={{
              fontFamily:  "'IBM Plex Mono', monospace",
              fontSize:    11,
              color:       COLORS.ledger,
              marginTop:   4,
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
