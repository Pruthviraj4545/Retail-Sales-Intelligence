/**
 * lib/aggregate.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure computation layer — takes CleanRow[] from cleanData.ts and derives:
 *
 *   1. KPIs  — totalSales, totalOrders, uniqueCustomers, avgDaysToShip
 *   2. Monthly trend — { month: "Jan 2024", sales: number, orders: number }[]
 *   3. Sales by Region  — { region: string, sales: number }[]   | null
 *   4. Sales by Category— { category: string, sales: number }[] | null
 *   5. Ship Mode analysis— { mode: string, avgDays: number }[]  | null
 *
 * Returns null for any aggregation whose underlying fields were not mapped.
 * No side-effects, no async — safe to call synchronously after cleanData().
 */

import type { CleanRow } from './cleanData';

// ─── Output types ─────────────────────────────────────────────────────────────

export interface KPIs {
  totalSales:       number;
  totalOrders:      number;
  uniqueCustomers:  number;
  /** null when Ship Date was not mapped */
  avgDaysToShip:    number | null;
  /** Formatted currency string, e.g. "$1,234,567.89" */
  totalSalesFmt:    string;
  /** Formatted avg days string, e.g. "3.96 days" */
  avgDaysToShipFmt: string | null;
}

export interface MonthPoint {
  /** Human-readable label: "Jan 2024" */
  month:  string;
  /** ISO key for sorting: "2024-01" */
  key:    string;
  sales:  number;
  orders: number;
}

export interface RegionPoint  { region:   string; sales: number; }
export interface CategoryPoint{ category: string; sales: number; }
export interface ShipModePoint { mode:     string; avgDays: number; orders: number; }

export interface AggregateResult {
  kpis:         KPIs;
  monthlyTrend: MonthPoint[];
  byRegion:     RegionPoint[]   | null;
  byCategory:   CategoryPoint[] | null;
  byShipMode:   ShipModePoint[] | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_LABELS = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

function fmtCurrency(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function aggregate(rows: CleanRow[]): AggregateResult {
  if (rows.length === 0) {
    return {
      kpis: {
        totalSales: 0, totalOrders: 0, uniqueCustomers: 0,
        avgDaysToShip: null, totalSalesFmt: '$0.00', avgDaysToShipFmt: null,
      },
      monthlyTrend: [],
      byRegion: null, byCategory: null, byShipMode: null,
    };
  }

  // ── 1. KPIs ─────────────────────────────────────────────────────────────────

  const totalSales      = rows.reduce((s, r) => s + r.salesAmount, 0);
  const totalOrders     = rows.length;
  const uniqueCustomers = new Set(rows.map(r => r.customerId)).size;

  // Avg days to ship — only rows where shipDate was parsed
  const shippedRows = rows.filter(r => r.shipDate instanceof Date);
  const avgDaysToShip = shippedRows.length > 0
    ? shippedRows.reduce((s, r) => s + diffDays(r.orderDate, r.shipDate as Date), 0) / shippedRows.length
    : null;

  const kpis: KPIs = {
    totalSales,
    totalOrders,
    uniqueCustomers,
    avgDaysToShip,
    totalSalesFmt:    fmtCurrency(totalSales),
    avgDaysToShipFmt: avgDaysToShip !== null
      ? `${avgDaysToShip.toFixed(2)} days`
      : null,
  };

  // ── 2. Monthly trend ─────────────────────────────────────────────────────────

  const monthMap = new Map<string, { sales: number; orders: number }>();
  rows.forEach(r => {
    const key   = `${r.orderYear}-${String(r.orderMonth).padStart(2, '0')}`;
    const entry = monthMap.get(key) ?? { sales: 0, orders: 0 };
    entry.sales  += r.salesAmount;
    entry.orders += 1;
    monthMap.set(key, entry);
  });

  const monthlyTrend: MonthPoint[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => {
      const [yr, mo] = key.split('-');
      return {
        key,
        month:  `${MONTH_LABELS[parseInt(mo) - 1]} ${yr}`,
        sales:  Math.round(v.sales * 100) / 100,
        orders: v.orders,
      };
    });

  // ── 3. Sales by Region ───────────────────────────────────────────────────────

  const hasRegion = rows.some(r => r.region);
  let byRegion: RegionPoint[] | null = null;

  if (hasRegion) {
    const regionMap = new Map<string, number>();
    rows.forEach(r => {
      if (!r.region) return;
      regionMap.set(r.region, (regionMap.get(r.region) ?? 0) + r.salesAmount);
    });
    byRegion = Array.from(regionMap.entries())
      .map(([region, sales]) => ({ region, sales: Math.round(sales * 100) / 100 }))
      .sort((a, b) => b.sales - a.sales);
  }

  // ── 4. Sales by Category ─────────────────────────────────────────────────────

  const hasCategory = rows.some(r => r.category);
  let byCategory: CategoryPoint[] | null = null;

  if (hasCategory) {
    const catMap = new Map<string, number>();
    rows.forEach(r => {
      if (!r.category) return;
      catMap.set(r.category, (catMap.get(r.category) ?? 0) + r.salesAmount);
    });
    byCategory = Array.from(catMap.entries())
      .map(([category, sales]) => ({ category, sales: Math.round(sales * 100) / 100 }))
      .sort((a, b) => b.sales - a.sales);
  }

  // ── 5. Days to Ship by Ship Mode ─────────────────────────────────────────────

  const hasShipMode = shippedRows.some(r => r.shipMode);
  let byShipMode: ShipModePoint[] | null = null;

  if (hasShipMode) {
    const modeMap = new Map<string, { totalDays: number; count: number }>();
    shippedRows.forEach(r => {
      if (!r.shipMode) return;
      const days  = diffDays(r.orderDate, r.shipDate as Date);
      const entry = modeMap.get(r.shipMode) ?? { totalDays: 0, count: 0 };
      entry.totalDays += days;
      entry.count     += 1;
      modeMap.set(r.shipMode, entry);
    });
    byShipMode = Array.from(modeMap.entries())
      .map(([mode, { totalDays, count }]) => ({
        mode,
        avgDays: Math.round((totalDays / count) * 100) / 100,
        orders:  count,
      }))
      .sort((a, b) => a.avgDays - b.avgDays);   // ascending — fastest first
  }

  return { kpis, monthlyTrend, byRegion, byCategory, byShipMode };
}
