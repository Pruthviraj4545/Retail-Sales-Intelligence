import React from 'react';
import { COLORS } from '../constants';
import Section from '../Section';

interface CleanSectionProps {
  innerRef: React.RefObject<HTMLElement | null>;
}

const ops = [
  { field: 'Postal Code', issue: '11 missing',    fix: 'Resolved via City lookup',   status: 'FIXED'    },
  { field: 'Order Date',  issue: 'Mixed formats',  fix: 'Standardized DD/MM/YYYY',    status: 'FIXED'    },
  { field: 'Duplicates',  issue: 'Not checked',    fix: 'Zero exact duplicates found', status: 'CLEAN'   },
  { field: 'Ship Date',   issue: 'Missing 3 rows', fix: 'Excluded from ship analysis', status: 'FLAGGED' },
];

const derived = ['Order Year', 'Order Month', 'Order Quarter', 'Days to Ship'];

function StatusStamp({ label }: { label: string }) {
  const isFixed   = label === 'FIXED';
  const isClean   = label === 'CLEAN';
  const color  = isFixed || isClean ? COLORS.ledger : COLORS.stamp;
  const rotate = isFixed ? '-2deg' : isClean ? '1deg' : '-3deg';

  return (
    <span
      style={{
        fontFamily:    "'Fraunces', serif",
        fontStyle:     'italic',
        fontSize:      11,
        fontWeight:    600,
        color,
        border:        `1.5px dashed ${color}`,
        padding:       '2px 8px',
        transform:     `rotate(${rotate})`,
        display:       'inline-block',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        opacity:       0.9,
      }}
    >
      {label}
    </span>
  );
}

export default function CleanSection({ innerRef }: CleanSectionProps) {
  return (
    <Section id="clean" innerRef={innerRef} eyebrow="Stage 02 — Processed" title="Clean and enrich">
      <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, color: COLORS.inkMuted, lineHeight: 1.75, maxWidth: 580, marginBottom: 28 }}>
        Dates standardized, nulls resolved, and four derived fields added. The{' '}
        <em style={{ fontStyle: 'italic', color: COLORS.ink }}>Days to Ship</em>{' '}
        column turned out to be the project&apos;s strongest analytical signal.
      </p>

      {/* Operations table */}
      <div>
        <div style={{ height: 6, background: `repeating-linear-gradient(90deg, ${COLORS.line} 0px, ${COLORS.line} 8px, transparent 8px, transparent 14px)` }} />
        <div style={{ border: `1px solid ${COLORS.line}`, background: COLORS.surface }}>
          <div className="flex" style={{ padding: '6px 14px', borderBottom: `1px solid ${COLORS.line}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: COLORS.inkMuted }}>
            <span style={{ flex: '0 0 160px' }}>Field</span>
            <span style={{ flex: '0 0 180px' }}>Issue</span>
            <span style={{ flex: 1 }}>Resolution</span>
            <span>Status</span>
          </div>
          {ops.map((op, i) => (
            <div
              key={op.field}
              className="flex items-center"
              style={{ padding: '10px 14px', borderBottom: i < ops.length - 1 ? `1px solid ${COLORS.line}` : 'none', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}
            >
              <span style={{ flex: '0 0 160px', color: COLORS.ink, fontWeight: 500 }}>{op.field}</span>
              <span style={{ flex: '0 0 180px', color: COLORS.inkMuted, textDecoration: 'line-through', fontSize: 11 }}>{op.issue}</span>
              <span style={{ flex: 1, color: COLORS.ink }}>{op.fix}</span>
              <StatusStamp label={op.status} />
            </div>
          ))}
        </div>
        <div style={{ height: 6, background: `repeating-linear-gradient(90deg, ${COLORS.line} 0px, ${COLORS.line} 8px, transparent 8px, transparent 14px)` }} />
      </div>

      {/* Derived columns */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: COLORS.inkMuted, marginBottom: 12 }}>
          Derived fields added
        </div>
        <div className="flex flex-wrap gap-2">
          {derived.map(d => (
            <span
              key={d}
              style={{
                fontFamily:   "'IBM Plex Mono', monospace",
                fontSize:     12,
                color:        COLORS.ledger,
                border:       `1px solid ${COLORS.ledger}`,
                padding:      '4px 10px',
                background:   COLORS.paperAlt,
              }}
            >
              + {d}
            </span>
          ))}
        </div>
      </div>
    </Section>
  );
}
