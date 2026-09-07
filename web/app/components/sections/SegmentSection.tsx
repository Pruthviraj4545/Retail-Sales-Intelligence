'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { COLORS, segmentData } from '../constants';
import Section from '../Section';

interface PieTooltipProps {
  active?:  boolean;
  payload?: { name: string; value: number }[];
}

function PieTooltipContent({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background:   COLORS.surface,
        border:       `1px solid ${COLORS.line}`,
        padding:      '8px 12px',
        fontFamily:   "'IBM Plex Mono', monospace",
        fontSize:     12,
        color:        COLORS.ink,
        boxShadow:    `2px 2px 0 ${COLORS.line}`,
      }}
    >
      <div style={{ color: COLORS.inkMuted, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
        {payload[0].name}
      </div>
      <div style={{ fontWeight: 600 }}>{payload[0].value} customers</div>
    </div>
  );
}

export default function SegmentSection({ innerRef }: { innerRef: React.RefObject<HTMLElement | null> }) {
  return (
    <Section id="segment" innerRef={innerRef} eyebrow="Stage 05 — Delivered" title="Customer segmentation">
      <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, color: COLORS.inkMuted, lineHeight: 1.75, maxWidth: 580, marginBottom: 28 }}>
        RFM metrics, scaled and clustered with KMeans (k=4). Silhouette score of 0.356 &mdash;
        representing genuine customer behavioral separation.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8 items-center">
        {/* Donut Chart */}
        <div style={{ height: 220, position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={segmentData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {segmentData.map((s, i) => (
                  <Cell key={i} fill={s.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown table / list */}
        <div>
          <div style={{ height: 6, background: `repeating-linear-gradient(90deg, ${COLORS.line} 0px, ${COLORS.line} 8px, transparent 8px, transparent 14px)` }} />
          <div style={{ border: `1px solid ${COLORS.line}`, background: COLORS.surface }}>
            <table className="manifest-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 14px' }}>Segment Label</th>
                  <th style={{ textAlign: 'right', padding: '8px 14px' }}>Customers</th>
                  <th style={{ textAlign: 'right', padding: '8px 14px' }}>Ratio</th>
                  <th style={{ textAlign: 'right', padding: '8px 14px' }}>Avg Spend</th>
                </tr>
              </thead>
              <tbody>
                {segmentData.map((s) => (
                  <tr key={s.name}>
                    <td style={{ padding: '8px 14px', fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, background: s.color, marginRight: 8, borderRadius: 1 }} />
                      {s.name}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 14px' }}>{s.value}</td>
                    <td style={{ textAlign: 'right', padding: '8px 14px' }}>{s.pct}%</td>
                    <td style={{ textAlign: 'right', padding: '8px 14px', fontWeight: 600 }}>${s.spend.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ height: 6, background: `repeating-linear-gradient(90deg, ${COLORS.line} 0px, ${COLORS.line} 8px, transparent 8px, transparent 14px)` }} />
        </div>
      </div>

      <div
        style={{
          marginTop:   24,
          padding:     '14px 18px',
          background:  COLORS.surface,
          borderLeft:  `3px solid ${COLORS.stamp}`,
          border:      `1px solid ${COLORS.line}`,
          fontFamily:  "'IBM Plex Sans', sans-serif",
          fontSize:    13,
          color:       COLORS.inkMuted,
          lineHeight:  1.65,
        }}
      >
        <span style={{ color: COLORS.stamp, fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontWeight: 600, marginRight: 6 }}>At Risk</span>
        is the largest segment at 43.9% &mdash; representing mid-tier spenders who have gone quiet. Re-engagement should be the highest-priority operational action.
      </div>
    </Section>
  );
}
