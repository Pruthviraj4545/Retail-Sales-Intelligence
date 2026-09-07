'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { COLORS, regionData, shipData } from '../constants';
import Section from '../Section';
import CustomTooltip from '../CustomTooltip';

interface AnalyzeSectionProps {
  innerRef: React.RefObject<HTMLElement | null>;
}

export default function AnalyzeSection({ innerRef }: AnalyzeSectionProps) {
  return (
    <Section id="analyze" innerRef={innerRef} eyebrow="Stage 04 — Inspected" title="Statistical findings">
      <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, color: COLORS.inkMuted, lineHeight: 1.75, maxWidth: 580, marginBottom: 32 }}>
        Two one-way ANOVA tests. One confirmed a hunch. One disproved it.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        {/* Region chart */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, padding: '18px 18px 14px' }}>
          <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: COLORS.inkMuted, fontWeight: 500, marginBottom: 3 }}>
            Avg Sales by Region
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.stamp, marginBottom: 14 }}>
            p = 0.44 — not significant
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={regionData} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
              <CartesianGrid stroke={COLORS.line} strokeOpacity={0.8} vertical={false} />
              <XAxis dataKey="region" tick={{ fill: COLORS.inkMuted, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: COLORS.inkMuted, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip unit=" avg $" />} cursor={{ fill: `${COLORS.line}60` }} />
              <Bar dataKey="sales" radius={0}>
                {regionData.map((_, i) => <Cell key={i} fill={COLORS.stamp} fillOpacity={0.75 + i * 0.05} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Ship mode chart */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, padding: '18px 18px 14px' }}>
          <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: COLORS.inkMuted, fontWeight: 500, marginBottom: 3 }}>
            Days to Ship by Ship Mode
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.ledger, marginBottom: 14 }}>
            p &approx; 0 &mdash; F = 6,950
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={shipData} layout="vertical" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={COLORS.line} strokeOpacity={0.8} horizontal={false} />
              <XAxis type="number" tick={{ fill: COLORS.inkMuted, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="mode" tick={{ fill: COLORS.inkMuted, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} width={100} />
              <Tooltip content={<CustomTooltip unit=" days" />} cursor={{ fill: `${COLORS.line}60` }} />
              <Bar dataKey="days" radius={0}>
                {shipData.map((_, i) => <Cell key={i} fill={COLORS.ledger} fillOpacity={0.9 - i * 0.08} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div
        style={{
          padding:    '14px 18px',
          background: COLORS.surface,
          borderLeft: `3px solid ${COLORS.ledger}`,
          border:     `1px solid ${COLORS.line}`,
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize:   13,
          color:      COLORS.inkMuted,
          lineHeight: 1.65,
        }}
      >
        Shipping speed drives delivery time overwhelmingly &mdash; as expected. But it has{' '}
        <strong style={{ color: COLORS.ink, fontWeight: 600 }}>no relationship with order size</strong>{' '}
        (r = &minus;0.006): faster shipping is not preferentially selected for larger orders.
      </div>
    </Section>
  );
}
