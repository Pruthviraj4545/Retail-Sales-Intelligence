'use client';

import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { computeRFM } from '../../lib/rfm';
import type { CleanRow } from '../../lib/cleanData';
import type { SegmentSummary, RFMResult } from '../../lib/rfm';
import { COLORS } from '../components/constants';

// ── Pie Tooltip ──────────────────────────────────────────────────────────────

function PieTooltipContent({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
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

// ── RFM Metric Label (Invoice-style) ──────────────────────────────────────────

function RfmMetricLabel({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        display:    'inline-flex',
        alignItems: 'center',
        padding:    '2px 6px',
        background: COLORS.paper, // Base background #17191D provides contrast inside surface card
        border:     `1px solid ${COLORS.line}`,
        fontSize:   11,
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      <span style={{ color: COLORS.inkMuted, marginRight: 4 }}>{label}:</span>
      <span style={{ color: color, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// ── Segment Card ──────────────────────────────────────────────────────────────

function SegmentCard({ seg }: { seg: SegmentSummary }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:      'flex',
        alignItems:   'flex-start',
        gap:          14,
        background:   COLORS.surface, // Surface #24272C
        border:       `1px solid ${COLORS.line}`,
        borderLeft:   `4px solid ${seg.color}`,
        padding:      '12px 16px',
        boxShadow:    hovered ? `3px 3px 0 ${COLORS.line}` : `1px 1px 0 ${COLORS.line}`,
        transform:    hovered ? 'translate(-1px, -1px)' : 'none',
        transition:   'box-shadow 0.15s, transform 0.15s',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink, marginBottom: 2 }}>{seg.label}</div>
        <div style={{ fontSize: 12, color: COLORS.inkMuted, marginBottom: 8, fontFamily: "'IBM Plex Sans', sans-serif" }}>
          {seg.count} customer{seg.count !== 1 ? 's' : ''} &middot; {seg.pct}%
        </div>
        <div className="flex flex-wrap gap-2">
          <RfmMetricLabel label="RECENCY" value={`${Math.round(seg.avgRecency)}d`} color={COLORS.ledger} />
          <RfmMetricLabel label="FREQ"    value={seg.avgFrequency.toFixed(1)} color={COLORS.stamp} />
          <RfmMetricLabel label="SPEND"   value={'$' + Math.round(seg.avgMonetary).toLocaleString()} color={seg.color} />
        </div>
      </div>
    </div>
  );
}

// ── Insight Callout ───────────────────────────────────────────────────────────

function InsightCallout({ result }: { result: RFMResult }) {
  const atRisk  = result.segments.find(s => s.label === 'At Risk');
  const highVal = result.segments.find(s => s.label === 'High Value');
  if (!atRisk && !highVal) return null;
  const primary = atRisk ?? highVal!;

  return (
    <div
      style={{
        marginTop:    20,
        padding:      '14px 18px',
        background:   COLORS.paperAlt, // Alt sections #1D2024
        borderLeft:   `3px solid ${primary.color}`,
        border:       `1px solid ${COLORS.line}`,
        fontSize:     13,
        color:        COLORS.inkMuted,
        lineHeight:   1.65,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: primary.color, fontWeight: 600, fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: 14 }}>
          {primary.label}
        </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
          &mdash; {primary.pct}% of active customer base
        </span>
      </div>
      {atRisk ? (
        <span>
          Average of {Math.round(atRisk.avgRecency)} days elapsed since last purchase. These accounts are at high risk of churn. Target them immediately with retention strategies.
        </span>
      ) : (
        <span>
          High Value segment accounts for an average spend of ${Math.round(highVal!.avgMonetary).toLocaleString()} across {highVal!.avgFrequency.toFixed(1)} transactions. Maintain premium tier support.
        </span>
      )}
      <div style={{ marginTop: 8, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: COLORS.inkMuted }}>
        SNAPSHOT: {result.snapshotDate.toISOString().slice(0, 10)} &middot; CLUSTERS: k={result.k} &middot; POPULATION: {result.totalCustomers}
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export default function SegmentPanel({ cleanRows }: { cleanRows: CleanRow[] }) {
  const result: RFMResult = useMemo(() => computeRFM(cleanRows), [cleanRows]);

  if (result.totalCustomers === 0) {
    return (
      <div style={{ padding: '24px 20px', background: COLORS.surface, border: `1px dashed ${COLORS.line}`, fontSize: 13, color: COLORS.inkMuted, textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace" }}>
        [EMPTY MANIFEST] No customer rows found for analysis.
      </div>
    );
  }

  if (result.totalCustomers < 4) {
    return (
      <div style={{ padding: '16px 20px', background: COLORS.surface, border: `1px solid ${COLORS.line}`, fontSize: 13, color: COLORS.inkMuted }}>
        <span style={{ color: COLORS.stamp, fontWeight: 600 }}>NOTICE:</span> Only {result.totalCustomers} customer{result.totalCustomers !== 1 ? 's' : ''} detected. Adjusting to k={result.k} clusters.
      </div>
    );
  }

  const pieData = result.segments.map(s => ({ name: s.label, value: s.count, color: s.color }));

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 items-center">
        {/* Donut Chart */}
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {pieData.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip content={<PieTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Segment Cards Grid */}
        <div style={{ display: 'grid', gap: 10 }}>
          {result.segments.map(seg => (
            <SegmentCard key={seg.label} seg={seg} />
          ))}
        </div>
      </div>

      <InsightCallout result={result} />

      <div
        style={{
          marginTop:    16,
          padding:      '10px 14px',
          background:   COLORS.surface,
          border:       `1px dashed ${COLORS.line}`,
          fontSize:     10,
          color:        COLORS.inkMuted,
          fontFamily:   "'IBM Plex Mono', monospace",
          lineHeight:   1.6,
        }}
      >
        ALGORITHM: RFM computation per customer &rarr; Z-score standardisation &rarr; KMeans(k={result.k}, kmeans++) &rarr; Label mapping by calculated RFM weight.
      </div>
    </div>
  );
}
