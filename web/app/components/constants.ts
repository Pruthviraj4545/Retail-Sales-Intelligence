import type { LucideIcon } from 'lucide-react';
import { Package, Scissors, Archive, BarChart2, Users } from 'lucide-react';

// ── Manifest Color Palette (Dark Register Overhaul) ──────────────────────────

export const COLORS = {
  paper:     '#17191D',   // base deep charcoal background
  paperAlt:  '#1D2024',   // alt sections background
  surface:   '#24272C',   // cards/tags surface
  ink:       '#EDE7DA',   // primary warm off-white text
  inkMuted:  '#8C8880',   // muted text
  stamp:     '#E8622E',   // bright orange accent
  ledger:    '#6E93B5',   // slate blue accent
  line:      '#34383F',   // 1px borders
  
  // Legacy aliases for continuity
  bg:        '#17191D',
  surfaceAlt:'#1D2024',
  text:      '#EDE7DA',
  muted:     '#8C8880',
  amber:     '#E8622E',
  teal:      '#6E93B5',
  rust:      '#E8622E',
} as const;

// ── Chart Palette (High-contrast on dark register background) ────────────────

export const CHART_PALETTE = [
  '#E8622E',  // stamp orange
  '#6E93B5',  // ledger blue
  '#B88450',  // warm gold-brown
  '#4E8B62',  // muted green
  '#A35A3D',  // terracotta
  '#8B6EB5',  // slate purple
  '#3E7B7A',  // dark slate teal
  '#B55B5B',  // brick red
] as const;

// ── Hardcoded Case Study Data ────────────────────────────────────────────────

export const regionData = [
  { region: 'South',   sales: 243.52 },
  { region: 'East',    sales: 240.40 },
  { region: 'West',    sales: 226.18 },
  { region: 'Central', sales: 216.36 },
];

export const shipData = [
  { mode: 'Same Day',       days: 0.04 },
  { mode: 'First Class',    days: 2.18 },
  { mode: 'Second Class',   days: 3.25 },
  { mode: 'Standard Class', days: 5.01 },
];

export const segmentData = [
  { name: 'High Value',           value: 63,  pct: 7.9,  spend: 9469, color: '#E8622E' }, // stamp
  { name: 'Loyal Regular',        value: 283, pct: 35.7, spend: 3298, color: '#6E93B5' }, // ledger
  { name: 'At Risk',              value: 348, pct: 43.9, spend: 1703, color: '#B88450' },
  { name: 'New / Low Engagement', value: 99,  pct: 12.5, spend: 1404, color: '#8C8880' },
];

// ── Pipeline Stages ──────────────────────────────────────────────────────────

export type StageId = 'ingest' | 'clean' | 'warehouse' | 'analyze' | 'segment';

export interface Stage {
  id:     StageId;
  label:  string;
  icon:   LucideIcon;
  detail: string;
  status: string;
}

export const stages: Stage[] = [
  { id: 'ingest',    label: 'Ingest',    icon: Package,   detail: '9,800 rows · 18 cols', status: 'Received'  },
  { id: 'clean',     label: 'Clean',     icon: Scissors,  detail: '11 nulls · 0 dupes',   status: 'Processed' },
  { id: 'warehouse', label: 'Warehouse', icon: Archive,   detail: 'Star schema · 5 tables', status: 'Stored'    },
  { id: 'analyze',   label: 'Analyze',   icon: BarChart2, detail: 'ANOVA · correlation',   status: 'Inspected' },
  { id: 'segment',   label: 'Segment',   icon: Users,     detail: 'RFM · KMeans k=4',      status: 'Delivered' },
];
