/**
 * lib/rfm.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * TypeScript port of 04_rfm_segmentation.py.
 *
 * Pipeline:
 *   1. Compute per-customer Recency / Frequency / Monetary from CleanRow[]
 *   2. Z-score standardise (StandardScaler equivalent)
 *   3. Run KMeans(k=4) via ml-kmeans  (kmeans++ init, 300 iterations max)
 *   4. Label clusters using relative RFM-score ranking — no hardcoded
 *      thresholds, so it works on any dataset:
 *        score = (1 - norm(Recency)) + norm(Frequency) + norm(Monetary)
 *        rank 1 → "High Value"
 *        rank 2 → "Loyal Regular"
 *        rank 3 → "At Risk"
 *        rank 4 → "New / Low Engagement"
 *   5. Return per-customer assignments + per-segment summary stats
 *
 * Falls back gracefully if the dataset has < 4 unique customers: uses
 * k = min(4, uniqueCustomers) and only produces that many segments.
 */

import { kmeans } from 'ml-kmeans';
import type { CleanRow } from './cleanData';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface CustomerRFM {
  customerId:      string;
  recency:         number;   // days since last order (lower = better)
  frequency:       number;   // distinct order count
  monetary:        number;   // total spend
  cluster:         number;   // 0-based cluster index
  segmentLabel:    SegmentLabel;
}

export type SegmentLabel =
  | 'High Value'
  | 'Loyal Regular'
  | 'At Risk'
  | 'New / Low Engagement';

export interface SegmentSummary {
  label:       SegmentLabel;
  /** Number of customers */
  count:       number;
  /** Percentage of total customers (0-100) */
  pct:         number;
  avgRecency:  number;
  avgFrequency:number;
  avgMonetary: number;
  /** Color token for this segment (matches case-study dashboard) */
  color:       string;
}

export interface RFMResult {
  customers:        CustomerRFM[];
  segments:         SegmentSummary[];
  /** Reference date used for recency calculation (max order date in dataset) */
  snapshotDate:     Date;
  /** k actually used (may be < 4 if fewer than 4 unique customers) */
  k:                number;
  /** Total unique customers */
  totalCustomers:   number;
}

// ─── Segment colours (matches case-study constants.ts segmentData) ────────────

const SEGMENT_COLORS: Record<SegmentLabel, string> = {
  'High Value':            '#E8A33D',   // amber
  'Loyal Regular':         '#4FA8A0',   // teal
  'At Risk':               '#C97064',   // rust
  'New / Low Engagement':  '#5B6577',   // slate
};

const RANK_TO_LABEL: Record<number, SegmentLabel> = {
  1: 'High Value',
  2: 'Loyal Regular',
  3: 'At Risk',
  4: 'New / Low Engagement',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Min-max normalise an array to [0, 1]. Equal values → 0.5 (safe). */
function minmax(arr: number[]): number[] {
  const mn = Math.min(...arr);
  const mx = Math.max(...arr);
  if (mx === mn) return arr.map(() => 0.5);
  return arr.map(v => (v - mn) / (mx - mn));
}

/** Z-score standardise a column (mean=0, std=1). Returns unchanged if std≈0. */
function zscore(arr: number[]): number[] {
  const n    = arr.length;
  const mean = arr.reduce((s, v) => s + v, 0) / n;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std  = Math.sqrt(variance);
  if (std < 1e-10) return arr.map(() => 0);
  return arr.map(v => (v - mean) / std);
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeRFM(rows: CleanRow[]): RFMResult {
  if (rows.length === 0) {
    return {
      customers:    [],
      segments:     [],
      snapshotDate: new Date(),
      k:            0,
      totalCustomers: 0,
    };
  }

  // ── 1. Snapshot date = max orderDate in the dataset ─────────────────────────
  const snapshotDate = new Date(
    Math.max(...rows.map(r => r.orderDate.getTime()))
  );
  // Zero out time component for clean day-diff arithmetic
  snapshotDate.setHours(0, 0, 0, 0);

  // ── 2. Aggregate per customer ────────────────────────────────────────────────
  //    Frequency  = count of rows (each row = one order line; group by order
  //                 date as a proxy since we don't have an orderId field)
  //    For simplicity: frequency = distinct orderDate values per customer
  //    (mirrors Python's nunique on order_id)

  interface Acc {
    latestDate:  Date;
    orderDates:  Set<string>;   // ISO strings for distinct-date proxy
    monetary:    number;
  }

  const acc = new Map<string, Acc>();

  rows.forEach(r => {
    const dateKey = r.orderDate.toISOString().slice(0, 10);
    const entry   = acc.get(r.customerId);
    if (!entry) {
      acc.set(r.customerId, {
        latestDate: r.orderDate,
        orderDates: new Set([dateKey]),
        monetary:   r.salesAmount,
      });
    } else {
      if (r.orderDate > entry.latestDate) entry.latestDate = r.orderDate;
      entry.orderDates.add(dateKey);
      entry.monetary += r.salesAmount;
    }
  });

  // Convert to array of raw RFM
  const customerIds  = Array.from(acc.keys());
  const rawRecency   = customerIds.map(id => diffDays(acc.get(id)!.latestDate, snapshotDate));
  const rawFrequency = customerIds.map(id => acc.get(id)!.orderDates.size);
  const rawMonetary  = customerIds.map(id => acc.get(id)!.monetary);

  const n = customerIds.length;

  // ── 3. K-means on Z-scored RFM ───────────────────────────────────────────────
  const k = Math.min(4, n);

  const scaledR = zscore(rawRecency);
  const scaledF = zscore(rawFrequency);
  const scaledM = zscore(rawMonetary);

  // Data matrix: each row is [scaledR, scaledF, scaledM] for one customer
  const data: number[][] = customerIds.map((_, i) => [
    scaledR[i],
    scaledF[i],
    scaledM[i],
  ]);

  let clusterAssignments: number[];
  let centroids:          number[][];

  if (k < 2) {
    // Can't run kmeans with fewer than 2 clusters — assign everyone to 0
    clusterAssignments = new Array(n).fill(0);
    centroids          = [data[0] ?? [0, 0, 0]];
  } else {
    const result       = kmeans(data, k, {
      initialization: 'kmeans++',
      maxIterations:  300,
      seed:           42,
    });
    clusterAssignments = result.clusters;
    centroids          = result.centroids;
  }

  // ── 4. Label clusters by relative RFM score ──────────────────────────────────
  //    Mirror of Python:
  //      score = (1 - minmax(Recency)) + minmax(Frequency) + minmax(Monetary)
  //    Applied to centroid values in scaled space.

  const centroidR = centroids.map(c => c[0]);
  const centroidF = centroids.map(c => c[1]);
  const centroidM = centroids.map(c => c[2]);

  const normR = minmax(centroidR);
  const normF = minmax(centroidF);
  const normM = minmax(centroidM);

  const rfmScores = centroids.map((_, ci) =>
    (1 - normR[ci]) + normF[ci] + normM[ci]
  );

  // Rank: rank 1 = highest score
  const ranked = rfmScores
    .map((score, ci) => ({ ci, score }))
    .sort((a, b) => b.score - a.score);

  const clusterToLabel = new Map<number, SegmentLabel>();
  ranked.forEach(({ ci }, rankIdx) => {
    const rank  = rankIdx + 1;
    const label = (RANK_TO_LABEL[rank] ?? 'New / Low Engagement') as SegmentLabel;
    clusterToLabel.set(ci, label);
  });

  // ── 5. Build customer-level output ───────────────────────────────────────────
  const customers: CustomerRFM[] = customerIds.map((id, i) => ({
    customerId:   id,
    recency:      rawRecency[i],
    frequency:    rawFrequency[i],
    monetary:     Math.round(rawMonetary[i] * 100) / 100,
    cluster:      clusterAssignments[i],
    segmentLabel: clusterToLabel.get(clusterAssignments[i])!,
  }));

  // ── 6. Per-segment summary stats ─────────────────────────────────────────────
  const segMap = new Map<SegmentLabel, {
    count: number; sumR: number; sumF: number; sumM: number;
  }>();

  customers.forEach(c => {
    const e = segMap.get(c.segmentLabel);
    if (!e) {
      segMap.set(c.segmentLabel, { count: 1, sumR: c.recency, sumF: c.frequency, sumM: c.monetary });
    } else {
      e.count++; e.sumR += c.recency; e.sumF += c.frequency; e.sumM += c.monetary;
    }
  });

  // Sort by descending avg monetary (mirrors Python output order)
  const segments: SegmentSummary[] = Array.from(segMap.entries())
    .map(([label, { count, sumR, sumF, sumM }]) => ({
      label,
      count,
      pct:          Math.round((count / n) * 1000) / 10,
      avgRecency:   Math.round((sumR / count) * 10) / 10,
      avgFrequency: Math.round((sumF / count) * 100) / 100,
      avgMonetary:  Math.round((sumM / count) * 100) / 100,
      color:        SEGMENT_COLORS[label],
    }))
    .sort((a, b) => b.avgMonetary - a.avgMonetary);

  return {
    customers,
    segments,
    snapshotDate,
    k,
    totalCustomers: n,
  };
}
