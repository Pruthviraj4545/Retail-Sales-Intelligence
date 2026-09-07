import React from 'react';
import { COLORS } from '../constants';
import StatCard from '../StatCard';
import Section from '../Section';

interface WarehouseSectionProps {
  innerRef: React.RefObject<HTMLElement | null>;
}

// ── SVG Star Schema (drawn on dark register) ─────────────────────────────────

function SchemaDiagram() {
  const W = 560, H = 260;
  const fact = { x: 195, y: 108, w: 170, h: 44 };
  const dims = [
    { label: 'Dim_Date',     x: 203, y: 10, w: 154, h: 36 },
    { label: 'Dim_Customer', x: 8,   y: 112, w: 148, h: 36 },
    { label: 'Dim_Location', x: 404, y: 112, w: 148, h: 36 },
    { label: 'Dim_Product',  x: 203, y: 214, w: 154, h: 36 },
  ];
  const fTop    = { x: fact.x + fact.w / 2, y: fact.y };
  const fLeft   = { x: fact.x,              y: fact.y + fact.h / 2 };
  const fRight  = { x: fact.x + fact.w,     y: fact.y + fact.h / 2 };
  const fBottom = { x: fact.x + fact.w / 2, y: fact.y + fact.h };
  const connections = [
    [fTop,    { x: dims[0].x + dims[0].w / 2, y: dims[0].y + dims[0].h }],
    [fLeft,   { x: dims[1].x + dims[1].w,     y: dims[1].y + dims[1].h / 2 }],
    [fRight,  { x: dims[2].x,                 y: dims[2].y + dims[2].h / 2 }],
    [fBottom, { x: dims[3].x + dims[3].w / 2, y: dims[3].y }],
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 520, display: 'block', margin: '0 auto' }}>
      {connections.map(([from, to], i) => (
        <line key={i} x1={(from as {x:number}).x} y1={(from as {x:number,y:number}).y} x2={(to as {x:number}).x} y2={(to as {x:number,y:number}).y}
          stroke={COLORS.line} strokeWidth={1.5} strokeDasharray="5 4" />
      ))}
      {/* Fact table */}
      <rect x={fact.x} y={fact.y} width={fact.w} height={fact.h} fill={COLORS.surface} stroke={COLORS.stamp} strokeWidth={2} />
      <text x={fact.x + fact.w/2} y={fact.y + fact.h/2 - 5} textAnchor="middle" fill={COLORS.stamp} fontSize={11} fontFamily="IBM Plex Mono, monospace" fontWeight={600}>Fact_Sales</text>
      <text x={fact.x + fact.w/2} y={fact.y + fact.h/2 + 9} textAnchor="middle" fill={COLORS.inkMuted} fontSize={9} fontFamily="IBM Plex Mono, monospace">9,800 rows</text>
      {/* Dim tables */}
      {dims.map(d => (
        <g key={d.label}>
          <rect x={d.x} y={d.y} width={d.w} height={d.h} fill={COLORS.paperAlt} stroke={COLORS.line} strokeWidth={1} />
          <text x={d.x + d.w/2} y={d.y + d.h/2 + 4} textAnchor="middle" fill={COLORS.inkMuted} fontSize={10} fontFamily="IBM Plex Mono, monospace">{d.label}</text>
        </g>
      ))}
    </svg>
  );
}

export default function WarehouseSection({ innerRef }: WarehouseSectionProps) {
  return (
    <Section id="warehouse" innerRef={innerRef} eyebrow="Stage 03 — Stored" title="Star schema warehouse">
      <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, color: COLORS.inkMuted, lineHeight: 1.75, maxWidth: 580, marginBottom: 28 }}>
        One fact table, four dimensions. A full 4-way join confirmed every foreign key
        resolves &mdash; 9,800 in, 9,800 out.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        <StatCard label="Fact_Sales"   value="9,800" sub="order lines" />
        <StatCard label="Dim_Customer" value="793"   />
        <StatCard label="Dim_Product"  value="1,861" />
        <StatCard label="Dim_Location" value="627"   />
        <StatCard label="Dim_Date"     value="1,230" />
      </div>

      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, padding: '24px 20px', boxShadow: `2px 2px 0 ${COLORS.line}` }}>
        <SchemaDiagram />
      </div>

      <div
        style={{
          marginTop:   16,
          padding:     '12px 16px',
          background:  COLORS.surface,
          border:      `1px solid ${COLORS.line}`,
          borderLeft:  `3px solid ${COLORS.ledger}`,
          fontFamily:  "'IBM Plex Mono', monospace",
          fontSize:    13,
          color:       COLORS.inkMuted,
        }}
      >
        Integrity check:{' '}
        <span style={{ color: COLORS.ledger, fontWeight: 600 }}>9,800 = 9,800</span>{' '}
        &mdash; every fact row resolves across all four dimensions.
      </div>
    </Section>
  );
}
