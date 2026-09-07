'use client';

import React from 'react';
import { COLORS } from './constants';

interface SectionProps {
  id:        string;
  eyebrow:   string;
  title:     string;
  children:  React.ReactNode;
  innerRef?: React.RefObject<HTMLElement | null>;
}

export default function Section({ id, eyebrow, title, children, innerRef }: SectionProps) {
  return (
    <section
      id={id}
      ref={innerRef as React.LegacyRef<HTMLElement>}
      style={{
        padding:         '64px 0 56px',
        borderTop:       `1px solid ${COLORS.line}`,
        background:      COLORS.paper,
      }}
    >
      <div className="max-w-[1080px] mx-auto px-6">
        {/* Eyebrow */}
        <div
          style={{
            fontFamily:    "'IBM Plex Mono', monospace",
            fontSize:      10,
            letterSpacing: '0.14em',
            color:         COLORS.ledger,
            textTransform: 'uppercase',
            marginBottom:  10,
            display:       'flex',
            alignItems:    'center',
            gap:           8,
          }}
        >
          <span
            style={{
              display:     'inline-block',
              width:       20,
              height:      1,
              background:  COLORS.ledger,
              verticalAlign: 'middle',
            }}
          />
          {eyebrow}
        </div>

        {/* Heading */}
        <h2
          style={{
            fontFamily:    "'Fraunces', serif",
            fontSize:      'clamp(24px, 3.5vw, 34px)',
            fontWeight:    500,
            color:         COLORS.ink,
            margin:        '0 0 32px',
            letterSpacing: '-0.02em',
            lineHeight:    1.2,
          }}
        >
          {title}
        </h2>

        {children}
      </div>
    </section>
  );
}
