'use client';

import React, { useMemo, useEffect, useRef, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { COLORS, CHART_PALETTE } from '../components/constants';
import type { CleanRow } from '../../lib/cleanData';
import { aggregate } from '../../lib/aggregate';
import type { AggregateResult } from '../../lib/aggregate';
import SegmentPanel from './SegmentPanel';

// ── Count-up Hook using ref to prevent early cancel ──────────────────────────

function useCountUp(target: number, duration = 900) {
  const [val, setVal]  = useState(0);
  const rafRef         = useRef<number | null>(null);
  const nodeRef        = useRef<HTMLDivElement | null>(null);
  const startedRef     = useRef(false);

  useEffect(() => {
    startedRef.current = false; // Reset whenever target/duration changes so animation triggers correctly
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          const start = performance.now();
          const tick  = (now: number) => {
            const t     = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setVal(eased * target);
            if (t < 1) {
              rafRef.current = requestAnimationFrame(tick);
            }
          };
          rafRef.current = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.05 }
    );
    if (nodeRef.current) obs.observe(nodeRef.current);
    return () => {
      obs.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return [val, nodeRef] as const;
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

interface TooltipProps {
  active?:    boolean;
  payload?:   { value: number; name: string }[];
  label?:     string;
  unit?:      string;
  formatter?: (v: number) => string;
}

function ChartTooltip({ active, payload, label, unit = '', formatter }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const raw     = payload[0].value;
  const display = formatter ? formatter(raw) : `${raw.toLocaleString()}${unit}`;
  return (
    <div
      style={{
        background:  COLORS.surface,
        border:      `1px solid ${COLORS.line}`,
        padding:     '8px 12px',
        fontFamily:  "'IBM Plex Mono', monospace",
        fontSize:    12,
        minWidth:    100,
        boxShadow:   `2px 2px 0 ${COLORS.line}`,
      }}
    >
      {label && <div style={{ color: COLORS.inkMuted, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>}
      <div style={{ color: COLORS.ink, fontWeight: 600 }}>{display}</div>
    </div>
  );
}

// ── Punch-hole SVG ────────────────────────────────────────────────────────────

function PunchHole() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="5.5" fill="none" stroke={COLORS.line} strokeWidth="1.5" />
      <circle cx="8" cy="8" r="2"   fill={COLORS.line} />
    </svg>
  );
}

// ── Chart Card Wrapper ────────────────────────────────────────────────────────

function ChartCard({
  title, sub, subColor = COLORS.inkMuted, children, minHeight = 200,
}: {
  title:      string;
  sub?:       string;
  subColor?:  string;
  children:   React.ReactNode;
  minHeight?: number;
}) {
  return (
    <div
      style={{
        background:  COLORS.surface, // Surface #24272C
        border:      `1px solid ${COLORS.line}`,
        padding:     '20px 20px 16px',
        boxShadow:   `2px 2px 0 ${COLORS.line}`,
        marginBottom: 20,
      }}
    >
      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: COLORS.inkMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: sub ? 3 : 14 }}>
        {title}
      </div>
      {sub && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: subColor, marginBottom: 14 }}>
          {sub}
        </div>
      )}
      <div style={{ minHeight }}>{children}</div>
    </div>
  );
}

// ── KPI Card (Inventory Tag Style) ────────────────────────────────────────────

function KpiCard({
  label, rawValue, displayValue, sub, accent = COLORS.ledger,
}: {
  label:        string;
  rawValue:     number;
  displayValue: string;
  sub?:         string;
  accent?:      string;
}) {
  const [countVal, nodeRef] = useCountUp(rawValue);
  const [hovered, setHovered] = useState(false);

  // Guess how to format the animated number
  const isDecimal = displayValue.includes('.');
  const hasDollar = displayValue.startsWith('$');
  const hasSuffix = displayValue.endsWith('k') || displayValue.endsWith('M');

  let animated = '';
  if (hasSuffix || hasDollar || rawValue === 0) {
    animated = displayValue;
  } else if (isDecimal) {
    animated = countVal.toFixed(2);
  } else {
    animated = Math.round(countVal).toLocaleString();
  }

  return (
    <div
      ref={nodeRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:   COLORS.surface, // Surface #24272C
        border:       `1px solid ${COLORS.line}`,
        borderRight:  `2px dashed ${COLORS.line}`,
        padding:      '18px 16px',
        position:     'relative',
        boxShadow:    hovered ? `3px 3px 0 ${COLORS.line}` : `2px 2px 0 ${COLORS.line}`,
        transform:    hovered ? 'translate(-1px, -1px)' : 'none',
        transition:   'box-shadow 0.15s, transform 0.15s',
      }}
    >
      <div style={{ position: 'absolute', top: 10, left: 10 }}>
        <PunchHole />
      </div>

      <div style={{ paddingLeft: 18 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 26, fontWeight: 600, color: COLORS.ink, marginBottom: 4, lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
          {animated}
        </div>
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, fontWeight: 600, color: COLORS.inkMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </div>
        {sub && <div style={{ fontSize: 10, color: accent, marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontFamily:    "'IBM Plex Mono', monospace",
          fontSize:      10,
          letterSpacing: '0.12em',
          color:         COLORS.ledger,
          textTransform: 'uppercase',
          marginBottom:  6,
        }}
      >
        {eyebrow}
      </div>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: 20, fontWeight: 500, color: COLORS.ink, margin: 0 }}>
        {title}
      </h3>
    </div>
  );
}

// ── Non Mapped Placeholder ───────────────────────────────────────────────────

function NotMapped({ field }: { field: string }) {
  return (
    <div
      style={{
        border:      `1px dashed ${COLORS.line}`,
        padding:     '28px 20px',
        color:       COLORS.inkMuted,
        fontSize:    12,
        textAlign:   'center',
        fontFamily:  "'IBM Plex Mono', monospace",
        background:  COLORS.surface,
      }}
    >
      <span style={{ display: 'block', color: COLORS.stamp, fontWeight: 600, marginBottom: 4 }}>[MISSING MANIFEST COLUMN]</span>
      {field} column was not mapped. Re-upload and map this column to construct this analysis.
    </div>
  );
}

// ── Perforated Divider ────────────────────────────────────────────────────────

function PerforationDivider() {
  return (
    <div
      style={{
        height:       8,
        background:   `repeating-linear-gradient(90deg, ${COLORS.line} 0px, ${COLORS.line} 8px, transparent 8px, transparent 14px)`,
        margin:       '32px 0',
      }}
    />
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

interface AnalysisDashboardProps {
  cleanRows: CleanRow[];
  onReset:   () => void;
}

export default function AnalysisDashboard({ cleanRows, onReset }: AnalysisDashboardProps) {
  const data: AggregateResult = useMemo(() => aggregate(cleanRows), [cleanRows]);
  const { kpis, monthlyTrend, byRegion, byCategory, byShipMode } = data;
  const [hoverReset, setHoverReset] = useState(false);

  const yFmtSales = (v: number) =>
    v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000   ? `$${(v / 1_000).toFixed(0)}k`
    : `$${v}`;

  const fmtSalesTooltip = (v: number) =>
    '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div>
      {/* Dashboard header */}
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.12em', color: COLORS.ledger, textTransform: 'uppercase', marginBottom: 10 }}>
        Manifest Records: {cleanRows.length.toLocaleString()} lines processed client-side
      </div>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 500, color: COLORS.ink, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
        Database <span style={{ fontStyle: 'italic', color: COLORS.stamp }}>Manifest Summary</span>
      </h2>
      <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: COLORS.inkMuted, marginBottom: 36, lineHeight: 1.7 }}>
        Dynamic metrics generated client-side from the cleaned transaction manifest. No server requests performed.
      </p>

      {/* KPIs Grid */}
      <SectionHeader eyebrow="01 / SUMMARY KPIs" title="Inventory Performance Tags" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <KpiCard
          label="Total Sales"
          rawValue={kpis.totalSales}
          displayValue={kpis.totalSalesFmt}
          accent={COLORS.stamp}
        />
        <KpiCard
          label="Total Orders"
          rawValue={kpis.totalOrders}
          displayValue={kpis.totalOrders.toLocaleString()}
          accent={COLORS.ledger}
        />
        <KpiCard
          label="Customers"
          rawValue={kpis.uniqueCustomers}
          displayValue={kpis.uniqueCustomers.toLocaleString()}
          accent={COLORS.ledger}
        />
        <KpiCard
          label="Avg Days to Ship"
          rawValue={kpis.avgDaysToShip ?? 0}
          displayValue={kpis.avgDaysToShipFmt ?? '—'}
          sub={kpis.avgDaysToShip === null ? 'SHIP_DATE NOT MAPPED' : undefined}
          accent={kpis.avgDaysToShip !== null ? COLORS.ledger : COLORS.line}
        />
      </div>

      <PerforationDivider />

      {/* Monthly Sales Trend */}
      <SectionHeader eyebrow="02 / MONTHLY LEDGER" title="Sales Volume Over Time" />
      {monthlyTrend.length === 0 ? (
        <NotMapped field="Order Date" />
      ) : (
        <>
          <ChartCard
            title="Monthly Sales Value"
            sub={`${monthlyTrend[0]?.month ?? ''} &rarr; ${monthlyTrend[monthlyTrend.length - 1]?.month ?? ''}`}
            subColor={COLORS.ledger}
          >
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyTrend} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid stroke={COLORS.line} strokeOpacity={0.8} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: COLORS.inkMuted, fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: COLORS.inkMuted, fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} tickFormatter={yFmtSales} width={52} />
                <Tooltip content={<ChartTooltip formatter={fmtSalesTooltip} />} cursor={{ stroke: COLORS.line, strokeWidth: 1 }} />
                <Line type="monotone" dataKey="sales" stroke={COLORS.stamp} strokeWidth={2} dot={{ r: 3, fill: COLORS.stamp, strokeWidth: 0 }} activeDot={{ r: 5, fill: COLORS.stamp, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {monthlyTrend.length > 1 && (
            <div style={{ marginTop: 12 }}>
              <ChartCard title="Monthly Order Volume" sub="Total order count per month" minHeight={140}>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={monthlyTrend} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                    <CartesianGrid stroke={COLORS.line} strokeOpacity={0.8} vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: COLORS.inkMuted, fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: COLORS.inkMuted, fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip unit=" orders" />} cursor={{ fill: `${COLORS.line}40` }} />
                    <Bar dataKey="orders" radius={0}>
                      {monthlyTrend.map((_, i) => <Cell key={i} fill={COLORS.ledger} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}
        </>
      )}

      <PerforationDivider />

      {/* breakdown */}
      <SectionHeader eyebrow="03 / DEMOGRAPHIC LEDGER" title="Regional and Category Manifest Breakdown" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        {byRegion ? (
          <ChartCard title="Sales by Shipping Region" sub={`${byRegion.length} regions documented`} minHeight={180}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byRegion}>
                <CartesianGrid stroke={COLORS.line} strokeOpacity={0.8} vertical={false} />
                <XAxis dataKey="region" tick={{ fill: COLORS.inkMuted, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: COLORS.inkMuted, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} tickFormatter={yFmtSales} width={52} />
                <Tooltip content={<ChartTooltip formatter={fmtSalesTooltip} />} cursor={{ fill: `${COLORS.line}40` }} />
                <Bar dataKey="sales" radius={0}>
                  {byRegion.map((_, i) => <Cell key={i} fill={COLORS.stamp} fillOpacity={i % 2 === 0 ? 0.85 : 0.65} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : <NotMapped field="Region" />}

        {byCategory ? (
          <ChartCard title="Sales by Product Category" sub={`${byCategory.length} categories documented`} minHeight={180}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byCategory} layout="vertical">
                <CartesianGrid stroke={COLORS.line} strokeOpacity={0.8} horizontal={false} />
                <XAxis type="number" tick={{ fill: COLORS.inkMuted, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} tickFormatter={yFmtSales} />
                <YAxis type="category" dataKey="category" tick={{ fill: COLORS.inkMuted, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} width={100} />
                <Tooltip content={<ChartTooltip formatter={fmtSalesTooltip} />} cursor={{ fill: `${COLORS.line}40` }} />
                <Bar dataKey="sales" radius={0}>
                  {byCategory.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} fillOpacity={0.9} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : <NotMapped field="Category" />}
      </div>

      <PerforationDivider />

      {/* Shipping details */}
      <SectionHeader eyebrow="04 / SHIPPING METRICS" title="Lead Times by Carrier Class" />
      {byShipMode ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard title="Mean Days to Ship" sub={`${byShipMode.length} classes indexed`} subColor={COLORS.ledger} minHeight={180}>
            <ResponsiveContainer width="100%" height={Math.max(160, byShipMode.length * 44)}>
              <BarChart data={byShipMode} layout="vertical">
                <CartesianGrid stroke={COLORS.line} strokeOpacity={0.8} horizontal={false} />
                <XAxis type="number" tick={{ fill: COLORS.inkMuted, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="mode" tick={{ fill: COLORS.inkMuted, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} width={110} />
                <Tooltip content={<ChartTooltip unit=" days" />} cursor={{ fill: `${COLORS.line}40` }} />
                <Bar dataKey="avgDays" radius={0}>
                  {byShipMode.map((_, i) => <Cell key={i} fill={COLORS.ledger} fillOpacity={0.9 - i * 0.08} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
            {byShipMode.map((s, i) => (
              <div
                key={s.mode}
                style={{
                  display:    'flex',
                  alignItems: 'center',
                  background: COLORS.surface, // Surface #24272C
                  border:     `1px solid ${COLORS.line}`,
                  borderLeft: `4px solid ${COLORS.ledger}`,
                  padding:    '12px 16px',
                  opacity:    1 - i * 0.08,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink }}>{s.mode}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.inkMuted }}>{s.orders} orders processed</div>
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, fontWeight: 600, color: COLORS.ledger }}>
                  {s.avgDays.toFixed(2)}
                  <span style={{ fontSize: 11, color: COLORS.inkMuted, fontWeight: 400 }}> days</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        kpis.avgDaysToShip !== null ? (
          <div style={{ padding: '16px 20px', background: COLORS.surface, border: `1px solid ${COLORS.line}`, fontSize: 13, color: COLORS.inkMuted, display: 'flex', alignItems: 'center', gap: 10 }}>
            Ship Mode was not mapped. Consolidated average lead time is{' '}
            <span style={{ color: COLORS.ledger, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{kpis.avgDaysToShipFmt}</span>.
          </div>
        ) : (
          <NotMapped field="Ship Mode" />
        )
      )}

      <PerforationDivider />

      {/* Customer Segmentation */}
      <SectionHeader eyebrow="05 / SEGMENTATION LEDGER" title="RFM Customer Classification" />
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: COLORS.inkMuted, lineHeight: 1.7 }}>
          Z-scored RFM scaling and KMeans algorithm partition active accounts into 4 behaviors:
        </p>
      </div>
      <SegmentPanel cleanRows={cleanRows} />

      {/* Footer controls */}
      <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${COLORS.line}`, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.inkMuted, flex: 1 }}>
          MANIFEST: {cleanRows.length.toLocaleString()} lines &bull; {kpis.uniqueCustomers.toLocaleString()} customers &bull; {kpis.totalSalesFmt} revenue
        </div>
        <button
          id="upload-new-file-btn"
          onClick={onReset}
          onMouseEnter={() => setHoverReset(true)}
          onMouseLeave={() => setHoverReset(false)}
          style={{
            padding:    '8px 16px',
            background: hoverReset ? 'rgba(237, 231, 218, 0.08)' : 'transparent',
            border:     '1.5px solid #4A4E56',
            cursor:     'pointer',
            fontSize:   13,
            color:      COLORS.ink,
            fontFamily: "'IBM Plex Sans', sans-serif",
            display:    'flex',
            alignItems: 'center',
            gap:        6,
            transition: 'background-color 0.15s',
          }}
        >
          Re-upload Cargo Manifest
        </button>
      </div>
    </div>
  );
}
