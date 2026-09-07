'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, ArrowRight, RotateCcw } from 'lucide-react';
import type { CleaningReport, CheckResult, CheckStatus } from '../../lib/cleanData';
import { COLORS } from '../components/constants';

// ── Stamp Badges ─────────────────────────────────────────────────────────────

function RubberStampBadge({ status }: { status: CheckStatus }) {
  const text = status === 'PASS' ? 'PASSED' : status === 'FAIL' ? 'FLAGGED' : 'WARNING';
  const color = status === 'FAIL' ? COLORS.stamp : COLORS.ledger;
  const rotation = status === 'FAIL' ? '-3deg' : status === 'PASS' ? '2deg' : '-1.5deg';

  return (
    <div
      style={{
        display:        'inline-block',
        fontFamily:     "'Fraunces', serif",
        fontStyle:      'italic',
        fontSize:       12,
        fontWeight:     600,
        color:          color,
        border:         `1.5px dashed ${color}`,
        padding:        '2px 8px',
        transform:      `rotate(${rotation})`,
        textTransform:  'uppercase',
        letterSpacing:  '0.06em',
        background:     'transparent',
        opacity:        0.9,
      }}
    >
      {text}
    </div>
  );
}

// ── Check Row ────────────────────────────────────────────────────────────────

function CheckRow({ check }: { check: CheckResult }) {
  const [open, setOpen] = useState(false);
  const hasDetails = check.details.length > 0;

  return (
    <div
      style={{
        border:       `1px solid ${COLORS.line}`,
        background:   COLORS.surface, // Surface #24272C
        marginBottom: 8,
      }}
    >
      <button
        onClick={() => hasDetails && setOpen(o => !o)}
        style={{
          width:               '100%',
          display:             'grid',
          gridTemplateColumns: '1fr auto auto',
          alignItems:          'center',
          gap:                 16,
          padding:             '12px 14px',
          background:          'transparent',
          border:              'none',
          cursor:              hasDetails ? 'pointer' : 'default',
          textAlign:           'left',
        }}
      >
        {/* Description */}
        <div>
          <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, fontWeight: 500, color: COLORS.ink }}>
            {check.description}
          </div>
          {check.autoFixed && (
            <div style={{ fontSize: 10, color: COLORS.stamp, marginTop: 2, fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ↻ Auto-Fixed
            </div>
          )}
        </div>

        {/* Counts */}
        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
          {check.violations > 0 ? (
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.stamp, fontVariantNumeric: 'tabular-nums' }}>
              {check.violations.toLocaleString()} / {check.total.toLocaleString()}
              <span style={{ color: COLORS.inkMuted, marginLeft: 4 }}>({check.pct})</span>
            </span>
          ) : (
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.inkMuted, fontVariantNumeric: 'tabular-nums' }}>
              {check.total.toLocaleString()} clean
            </span>
          )}
        </div>

        {/* Rubber Stamp Status & Chevron */}
        <div className="flex items-center gap-4" style={{ minWidth: 90, justifyContent: 'flex-end' }}>
          <RubberStampBadge status={check.status} />
          {hasDetails && (
            <div style={{ color: COLORS.inkMuted, display: 'flex', alignItems: 'center' }}>
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
          )}
        </div>
      </button>

      {open && hasDetails && (
        <div
          style={{
            padding:    '10px 14px 12px',
            background: COLORS.paperAlt, // Alt background #1D2024
            borderTop:  `1px dashed ${COLORS.line}`,
            fontSize:   12,
            fontFamily: "'IBM Plex Mono', monospace",
            color:      COLORS.inkMuted,
            lineHeight: 1.7,
          }}
        >
          <span style={{ color: COLORS.ink, fontWeight: 600 }}>Detail: </span>
          {check.details}
        </div>
      )}
    </div>
  );
}

// ── Verdict Banner ───────────────────────────────────────────────────────────

function VerdictBanner({ report }: { report: CleaningReport }) {
  const ok = report.allPassed;
  const color = ok ? COLORS.ledger : COLORS.stamp;
  const label = ok ? 'MANIFEST VERIFICATION: PASSED' : `MANIFEST VERIFICATION: ${report.failed} FLAGGED`;

  return (
    <div
      style={{
        padding:      '16px 20px',
        background:   COLORS.surface, // Surface #24272C
        border:       `1px solid ${COLORS.line}`,
        borderLeft:   `4px solid ${color}`,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
        flexWrap:     'wrap',
        gap:          16,
        marginBottom: 24,
      }}
    >
      <div>
        <div
          style={{
            fontFamily:    "'Fraunces', serif",
            fontWeight:    600,
            fontStyle:     'italic',
            fontSize:      16,
            color:         color,
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </div>
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: COLORS.inkMuted, marginTop: 4 }}>
          {report.passed} checks passed &middot; {report.failed} checks flagged &middot; {report.warned} warnings
        </div>
      </div>

      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize:   11,
          color:      COLORS.inkMuted,
          lineHeight: 1.6,
          textAlign:  'right',
        }}
      >
        <div>Disposition: <span style={{ color: COLORS.ink, fontWeight: 600 }}>{report.rowsAfter.toLocaleString()} Clean Rows</span></div>
        {report.duplicatesRemoved > 0 && (
          <div style={{ color: COLORS.stamp }}>Removed: {report.duplicatesRemoved} Duplicates</div>
        )}
      </div>
    </div>
  );
}

// ── Row Disposition Bar ───────────────────────────────────────────────────────

function RowCountBar({ report }: { report: CleaningReport }) {
  const flagged = report.rowsBefore - report.duplicatesRemoved - report.rowsAfter;
  const total = report.rowsBefore || 1;
  const cleanPct = (report.rowsAfter / total) * 100;
  const dupPct = (report.duplicatesRemoved / total) * 100;
  const flaggedPct = (flagged / total) * 100;

  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          fontSize:      10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontFamily:    "'IBM Plex Mono', monospace",
          color:         COLORS.ledger,
          marginBottom:  8,
        }}
      >
        Disposition Allocation &mdash; {report.rowsBefore.toLocaleString()} Input Rows
      </div>

      <div
        style={{
          height:       10,
          background:   COLORS.surface,
          border:       `1px solid ${COLORS.line}`,
          display:      'flex',
        }}
      >
        <div style={{ width: `${cleanPct}%`,   background: COLORS.ledger }} />
        <div style={{ width: `${dupPct}%`,     background: COLORS.line }} />
        <div style={{ width: `${flaggedPct}%`, background: COLORS.stamp }} />
      </div>

      <div className="flex flex-wrap gap-4 mt-3" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
        {[
          { color: COLORS.ledger, label: 'CLEAN ROWS', count: report.rowsAfter },
          { color: COLORS.line,   label: 'DUPLICATES', count: report.duplicatesRemoved },
          { color: COLORS.stamp,  label: 'FLAGGED EXCLUSIONS', count: flagged },
        ].map(({ color, label, count }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div style={{ width: 8, height: 8, background: color }} />
            <span style={{ color: COLORS.inkMuted }}>
              {label}: <span style={{ color: COLORS.ink, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{count.toLocaleString()}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Card ─────────────────────────────────────────────────────────────────

interface DataQualityCardProps {
  report:    CleaningReport;
  onProceed: () => void;
  onReset:   () => void;
}

export default function DataQualityCard({ report, onProceed, onReset }: DataQualityCardProps) {
  const [hoverReset, setHoverReset] = useState(false);

  return (
    <div>
      <VerdictBanner report={report} />
      <RowCountBar   report={report} />

      <div
        style={{
          fontSize:      10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontFamily:    "'IBM Plex Mono', monospace",
          color:         COLORS.ledger,
          marginBottom:  8,
        }}
      >
        Verification Checks
      </div>

      <div className="mb-8">
        {report.checks.map(c => (
          <CheckRow key={c.checkId} check={c} />
        ))}
      </div>

      {/* Action buttons with manifest invoice tag style */}
      <div className="flex gap-4 flex-wrap items-center">
        <button
          id="proceed-to-dashboard-btn"
          onClick={onProceed}
          style={{
            padding:        '9px 20px',
            background:     COLORS.stamp,
            border:         'none',
            cursor:         'pointer',
            fontSize:       13,
            fontWeight:     600,
            color:          '#17191D', // Dark text for contrast on bright stamp background
            fontFamily:     "'IBM Plex Sans', sans-serif",
            display:        'flex',
            alignItems:     'center',
            gap:            8,
            transition:     'opacity 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.opacity = '1.0';
          }}
        >
          {report.allPassed ? 'Confirm and Continue to Dashboard' : `Continue with ${report.rowsAfter.toLocaleString()} Clean Rows`}
          <ArrowRight size={14} />
        </button>

        <button
          onClick={onReset}
          onMouseEnter={() => setHoverReset(true)}
          onMouseLeave={() => setHoverReset(false)}
          style={{
            padding:    '9px 16px',
            background: hoverReset ? 'rgba(237, 231, 218, 0.08)' : 'transparent',
            border:     '1.5px solid #4A4E56', // Visible 1.5px border
            cursor:     'pointer',
            fontSize:   13,
            color:      COLORS.ink, // Primary text color
            fontFamily: "'IBM Plex Sans', sans-serif",
            display:    'flex',
            alignItems: 'center',
            gap:        6,
            transition: 'background-color 0.15s',
          }}
        >
          <RotateCcw size={13} /> Re-upload File
        </button>

        {report.failed > 0 && (
          <p style={{ fontSize: 11, fontFamily: "'IBM Plex Sans', sans-serif", color: COLORS.inkMuted, marginLeft: 4 }}>
            * Flagged transaction lines are excluded from final database.
          </p>
        )}
      </div>
    </div>
  );
}
