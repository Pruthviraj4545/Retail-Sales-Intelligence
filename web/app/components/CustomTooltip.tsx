'use client';

import { COLORS } from './constants';

interface CustomTooltipProps {
  active?:    boolean;
  payload?:   { value: number; name: string }[];
  label?:     string;
  unit?:      string;
  formatter?: (v: number) => string;
}

export default function CustomTooltip({ active, payload, label, unit = '', formatter }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const raw     = payload[0].value;
  const display = formatter ? formatter(raw) : `${raw.toLocaleString()}${unit}`;

  return (
    <div
      style={{
        background:  COLORS.surface, // Surface #24272C
        border:      `1px solid ${COLORS.line}`,
        padding:     '8px 12px',
        fontFamily:  "'IBM Plex Mono', monospace",
        fontSize:    12,
        minWidth:    100,
        boxShadow:   `2px 2px 0 ${COLORS.line}`,
      }}
    >
      {label && (
        <div style={{ color: COLORS.inkMuted, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
          {label}
        </div>
      )}
      <div style={{ color: COLORS.ink, fontWeight: 600 }}>{display}</div>
    </div>
  );
}
