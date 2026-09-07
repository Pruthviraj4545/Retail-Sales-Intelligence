import React from 'react';
import { COLORS } from '../constants';
import StatCard from '../StatCard';
import Section from '../Section';

interface IngestSectionProps {
  innerRef: React.RefObject<HTMLElement | null>;
}

const rawFields = [
  'Order ID', 'Order Date', 'Ship Date', 'Ship Mode',
  'Customer ID', 'Customer Name', 'Segment', 'Country',
  'City', 'State', 'Region', 'Product ID', 'Category',
  'Sub-Category', 'Product Name', 'Sales', 'Quantity', 'Discount',
];

export default function IngestSection({ innerRef }: IngestSectionProps) {
  return (
    <Section id="ingest" innerRef={innerRef} eyebrow="Stage 01 — Received" title="Ingest">
      <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, color: COLORS.inkMuted, lineHeight: 1.75, maxWidth: 580, marginBottom: 28 }}>
        Raw Superstore transaction data &mdash; January 2015 to January 2019 &mdash; loaded and
        profiled before any cleaning began.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total rows"     value="9,800" />
        <StatCard label="Columns"        value="18"    />
        <StatCard label="Missing values" value="11"    sub="postal code" />
      </div>

      {/* Raw field manifest */}
      <div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: COLORS.inkMuted, marginBottom: 10 }}>
          Column Manifest &mdash; 18 fields
        </div>
        <div
          style={{
            background:  COLORS.surface, // Cards/tags surface #24272C
            border:      `1px solid ${COLORS.line}`,
            padding:     '4px 0',
          }}
        >
          {rawFields.map((field, i) => (
            <div
              key={field}
              className="flex items-center justify-between"
              style={{
                padding:      '6px 14px',
                borderBottom: i < rawFields.length - 1 ? `1px solid ${COLORS.line}` : 'none',
                fontFamily:   "'IBM Plex Mono', monospace",
                fontSize:     12,
                color:        COLORS.ink,
              }}
            >
              <span>{field}</span>
              <span style={{ color: COLORS.inkMuted, fontSize: 10 }}>
                {i === 1 || i === 2 ? 'date' : i === 15 ? 'float' : i === 16 ? 'int' : i === 17 ? 'float' : 'string'}
              </span>
            </div>
          ))}
        </div>
        {/* Perforated bottom */}
        <div style={{ height: 6, background: `repeating-linear-gradient(90deg, ${COLORS.line} 0px, ${COLORS.line} 8px, transparent 8px, transparent 14px)` }} />
      </div>
    </Section>
  );
}
