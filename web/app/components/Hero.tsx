'use client';

import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { COLORS } from './constants';
import StatCard from './StatCard';

// ── Manifest number stamp ─────────────────────────────────────────────────────

function ManifestNo() {
  const [id] = useState(() => `MNFT-${Math.random().toString(36).slice(2, 7).toUpperCase()}`);
  return (
    <span
      style={{
        fontFamily:    "'IBM Plex Mono', monospace",
        fontSize:      11,
        color:         COLORS.inkMuted,
        letterSpacing: '0.1em',
      }}
    >
      {id}
    </span>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

export default function Hero() {
  const [hoverSource, setHoverSource] = useState(false);
  const [hoverPowerBi, setHoverPowerBi] = useState(false);
  const [hoverCTA, setHoverCTA] = useState(false);

  return (
    <div style={{ background: COLORS.paper, borderBottom: `1px solid ${COLORS.line}` }}>
      <div className="max-w-[1080px] mx-auto px-6" style={{ paddingTop: 48, paddingBottom: 52 }}>

        {/* Header row: manifest no. + datestamp */}
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: 28, paddingBottom: 12, borderBottom: `1px solid ${COLORS.line}` }}
        >
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.12em', color: COLORS.inkMuted, textTransform: 'uppercase' }}>
            Shipping Manifest &middot; Data Warehouse
          </div>
          <ManifestNo />
        </div>

        {/* Two-column layout: headline left, meta right */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-8 items-start">

          {/* Headline block */}
          <div>
            <div
              style={{
                fontFamily:    "'IBM Plex Mono', monospace",
                fontSize:      10,
                letterSpacing: '0.14em',
                color:         COLORS.ledger,
                textTransform: 'uppercase',
                marginBottom:  14,
              }}
            >
              Data Engineering and Analytics
            </div>
            <h1
              style={{
                fontFamily:    "'Fraunces', serif",
                fontSize:      'clamp(36px, 5.5vw, 58px)',
                fontWeight:    500,
                color:         COLORS.ink,
                letterSpacing: '-0.025em',
                lineHeight:    1.05,
                margin:        '0 0 20px',
                maxWidth:      620,
              }}
            >
              Retail Sales{' '}
              <em style={{ fontStyle: 'italic', color: COLORS.stamp }}>Intelligence</em>{' '}
              Warehouse
            </h1>
            <p
              style={{
                fontFamily:  "'IBM Plex Sans', sans-serif",
                fontSize:    15,
                color:       COLORS.inkMuted,
                maxWidth:    520,
                lineHeight:  1.75,
                marginBottom: 28,
              }}
            >
              9,800 raw transaction rows traced through a real ETL pipeline into a
              star-schema warehouse &mdash; mined for statistical findings and customer segments
              a business could act on.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5"
                onMouseEnter={() => setHoverSource(true)}
                onMouseLeave={() => setHoverSource(false)}
                style={{
                  fontFamily:     "'IBM Plex Sans', sans-serif",
                  fontSize:       13,
                  fontWeight:     500,
                  color:          COLORS.ink,
                  textDecoration: 'none',
                  padding:        '7px 14px',
                  border:         '1.5px solid #4A4E56',
                  background:     hoverSource ? 'rgba(237, 231, 218, 0.08)' : 'transparent',
                  transition:     'background-color 0.15s',
                }}
              >
                View source <ArrowUpRight size={12} />
              </a>
              <a
                href="#"
                className="flex items-center gap-1.5"
                onMouseEnter={() => setHoverPowerBi(true)}
                onMouseLeave={() => setHoverPowerBi(false)}
                style={{
                  fontFamily:     "'IBM Plex Sans', sans-serif",
                  fontSize:       13,
                  fontWeight:     500,
                  color:          COLORS.ink,
                  textDecoration: 'none',
                  padding:        '7px 14px',
                  border:         '1.5px solid #4A4E56',
                  background:     hoverPowerBi ? 'rgba(237, 231, 218, 0.08)' : 'transparent',
                  transition:     'background-color 0.15s',
                }}
              >
                Power BI handoff <ArrowUpRight size={12} />
              </a>
            </div>
          </div>

          {/* Manifest meta block */}
          <div
            style={{
              background:   COLORS.paperAlt,
              border:       `1px solid ${COLORS.line}`,
              padding:      '20px 18px',
              boxShadow:    `2px 2px 0 ${COLORS.line}`,
              fontFamily:   "'IBM Plex Mono', monospace",
              fontSize:     12,
            }}
          >
            <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: COLORS.inkMuted, marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${COLORS.line}` }}>
              Cargo Manifest
            </div>
            {[
              { label: 'Total rows',    value: '9,800'  },
              { label: 'Date range',    value: '2015–19' },
              { label: 'Customers',     value: '793'    },
              { label: 'Products',      value: '1,861'  },
              { label: 'Avg ship days', value: '3.96'   },
              { label: 'Duplicates',    value: '0'      },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-baseline justify-between" style={{ paddingBottom: 7, marginBottom: 7, borderBottom: `1px solid ${COLORS.line}` }}>
                <span style={{ color: COLORS.inkMuted, fontSize: 11 }}>{label}</span>
                <span style={{ color: COLORS.ink, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
              </div>
            ))}
            {/* Status stamp */}
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <span
                style={{
                  display:     'inline-block',
                  fontFamily:  "'Fraunces', serif",
                  fontStyle:   'italic',
                  fontSize:    16,
                  fontWeight:  600,
                  color:       COLORS.stamp,
                  border:      `1.5px dashed ${COLORS.stamp}`,
                  padding:     '4px 12px',
                  transform:   'rotate(-2deg)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  opacity:     0.9,
                }}
              >
                Verified
              </span>
            </div>
          </div>
        </div>

        {/* KPI inventory tags */}
        <div
          style={{
            marginTop:    36,
            paddingTop:   24,
            borderTop:    `1px dashed ${COLORS.line}`,
          }}
        >
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: COLORS.inkMuted, marginBottom: 16 }}>
            Item Summary
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Rows ingested"    value="9,800" sub="0 duplicates" />
            <StatCard label="Unique customers" value="793"   />
            <StatCard label="Unique products"  value="1,861" />
            <StatCard label="Avg days to ship" value="3.96"  />
          </div>
        </div>

        {/* CTA card */}
        <div
          className="flex items-center justify-between flex-wrap gap-4"
          style={{
            marginTop:   28,
            padding:     '16px 20px',
            background:  COLORS.paperAlt,
            border:      `1px solid ${COLORS.line}`,
            borderLeft:  `3px solid ${COLORS.stamp}`,
          }}
        >
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 500, color: COLORS.ink, marginBottom: 3 }}>
              Want to run this analysis on your own data?
            </div>
            <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: COLORS.inkMuted }}>
              Upload any retail CSV &mdash; KPIs, trends, and RFM segments, entirely in your browser.
            </div>
          </div>
          <a
            href="/analyze"
            onMouseEnter={() => setHoverCTA(true)}
            onMouseLeave={() => setHoverCTA(false)}
            style={{
              fontFamily:     "'IBM Plex Sans', sans-serif",
              fontSize:       13,
              fontWeight:     600,
              color:          '#17191D',
              background:     COLORS.stamp,
              textDecoration: 'none',
              padding:        '9px 18px',
              whiteSpace:     'nowrap',
              flexShrink:     0,
              border:         'none',
              opacity:        hoverCTA ? 0.9 : 1.0,
              transition:     'opacity 0.15s',
            }}
          >
            Analyze your data
          </a>
        </div>
      </div>
    </div>
  );
}
