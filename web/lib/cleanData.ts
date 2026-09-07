/**
 * lib/cleanData.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * TypeScript port of the Python pipeline's two scripts:
 *   • 01_clean_data.py  — date parsing, dedup, null-flagging, derived columns
 *   • 06_data_quality_report.py — five rule-based quality checks with PASS/FAIL
 *
 * Runs 100 % client-side (no fetch, no fs, no backend).
 *
 * Checks performed (mirrors the Python script):
 *   C1 — No negative or zero Sales values
 *   C2 — Ship Date >= Order Date (if Ship Date is mapped)
 *   C3 — No dates in the future (> today)
 *   C4 — Missing values in required fields
 *   C5 — Exact duplicate rows
 */

// ─── Public types ─────────────────────────────────────────────────────────────

/** A single row after column-mapping (keys are field-keys, not CSV headers). */
export type MappedRow = Record<string, string>;

/** A cleaned row — same shape but with parsed/normalised values guaranteed. */
export interface CleanRow {
  orderDate:   Date;
  salesAmount: number;
  customerId:  string;
  region?:     string;
  category?:   string;
  shipDate?:   Date;
  shipMode?:   string;
  /** Derived columns (mirrors 01_clean_data.py step 5) */
  orderYear:   number;
  orderMonth:  number;
  orderQuarter: number;
  /** Row index in the original mapped dataset (0-based) for traceability */
  _originalIndex: number;
}

// ─── Check result (mirrors `record()` in 06_data_quality_report.py) ──────────

export type CheckStatus = 'PASS' | 'FAIL' | 'WARN';

export interface CheckResult {
  /** e.g. "C1" */
  checkId:     string;
  /** Short human label */
  description: string;
  /** PASS / FAIL / WARN */
  status:      CheckStatus;
  /** Number of violating rows */
  violations:  number;
  /** Total rows tested */
  total:       number;
  /** Formatted percentage string, e.g. "2.3%" */
  pct:         string;
  /** Extra details for FAIL rows */
  details:     string;
  /**
   * Whether the issue was automatically fixed (rows removed / values corrected)
   * vs. just flagged for the user.
   */
  autoFixed:   boolean;
  /** The row indices that violated this check */
  affectedRows: number[];
}

// ─── Summary report ───────────────────────────────────────────────────────────

export interface CleaningReport {
  /** ISO timestamp of when the report was generated */
  generatedAt:  string;

  /** Source counts */
  rowsBefore:   number;
  rowsAfter:    number;

  /** How many exact duplicates were silently removed */
  duplicatesRemoved: number;

  /** All five check results */
  checks: CheckResult[];

  /** Rolled-up tallies */
  totalChecks:  number;
  passed:       number;
  failed:       number;
  warned:       number;

  /** true when every check is PASS */
  allPassed:    boolean;

  /**
   * Rows that survived all auto-fix passes and have no outstanding FAIL issues.
   * These are safe to hand to the dashboard.
   */
  cleanRows: CleanRow[];

  /**
   * Rows that were flagged (FAIL) and kept for user inspection.
   * Keyed by checkId → array of original-index numbers.
   */
  flaggedRowsByCheck: Record<string, number[]>;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Attempts several date formats (ISO, US, UK, Excel serial). Returns null if unparseable. */
function parseDate(raw: string): Date | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();

  // ISO: 2024-01-05
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }
  // DD/MM/YYYY  (matches Python's %d/%m/%Y)
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const d = new Date(`${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  // MM/DD/YYYY  (US style)
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const d = new Date(`${mdy[3]}-${mdy[1].padStart(2,'0')}-${mdy[2].padStart(2,'0')}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  // Natural language attempt via Date constructor
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function toFloat(raw: string): number | null {
  if (!raw || !raw.trim()) return null;
  // Strip currency symbols, spaces, commas
  const cleaned = raw.trim().replace(/[$£€,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function fmtPct(violations: number, total: number): string {
  if (total === 0) return 'N/A';
  return `${((violations / total) * 100).toFixed(1)}%`;
}

/** Stable row-signature for exact-duplicate detection (mirrors df.duplicated()). */
function rowSignature(row: MappedRow): string {
  // Sort keys so column order doesn't matter
  return JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a],[b]) => a.localeCompare(b))));
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Takes the column-mapped rows from the UI (keys are field-keys like
 * `orderDate`, `salesAmount`, etc.) and returns a full cleaning report
 * plus the cleaned dataset.
 */
export function cleanData(mappedRows: MappedRow[]): CleaningReport {
  const today      = new Date();
  today.setHours(0, 0, 0, 0);
  const generatedAt = new Date().toISOString();
  const rowsBefore  = mappedRows.length;

  const checks: CheckResult[] = [];
  const flaggedRowsByCheck: Record<string, number[]> = {};

  // ── Step 1: Remove exact duplicate rows (mirrors 01_clean_data.py step 4) ──

  const seenSignatures = new Set<string>();
  const dedupedIndices: number[] = []; // indices kept after dedup
  mappedRows.forEach((row, i) => {
    const sig = rowSignature(row);
    if (!seenSignatures.has(sig)) {
      seenSignatures.add(sig);
      dedupedIndices.push(i);
    }
  });
  const duplicatesRemoved = rowsBefore - dedupedIndices.length;
  const workingRows = dedupedIndices.map(i => ({ row: mappedRows[i], originalIndex: i }));

  // ── Step 2: Parse each row ────────────────────────────────────────────────

  interface ParsedEntry {
    raw:           MappedRow;
    originalIndex: number;
    orderDate:     Date | null;
    salesAmount:   number | null;
    customerId:    string | null;
    region?:       string;
    category?:     string;
    shipDate:      Date | null;
    shipMode?:     string;
  }

  const parsed: ParsedEntry[] = workingRows.map(({ row, originalIndex }) => ({
    raw:          row,
    originalIndex,
    orderDate:    parseDate(row['orderDate']   ?? ''),
    salesAmount:  toFloat(row['salesAmount']   ?? ''),
    customerId:   row['customerId']?.trim() || null,
    region:       row['region']?.trim()    || undefined,
    category:     row['category']?.trim()  || undefined,
    shipDate:     row['shipDate'] ? parseDate(row['shipDate']) : null,
    shipMode:     row['shipMode']?.trim()  || undefined,
  }));

  // ── CHECK C4: Missing values in required fields ────────────────────────────
  // (Placed before C1/C2/C3 so we exclude unparseable rows from those checks)

  const missingRequired: number[] = [];
  const missingDetails: string[] = [];

  parsed.forEach(({ originalIndex, orderDate, salesAmount, customerId }) => {
    const missing: string[] = [];
    if (orderDate   === null) missing.push('Order Date');
    if (salesAmount === null) missing.push('Sales Amount');
    if (customerId  === null) missing.push('Customer ID');
    if (missing.length > 0) {
      missingRequired.push(originalIndex);
      missingDetails.push(`Row ${originalIndex + 1}: missing ${missing.join(', ')}`);
    }
  });

  checks.push({
    checkId:     'C4',
    description: 'No missing values in required fields',
    status:      missingRequired.length === 0 ? 'PASS' : 'FAIL',
    violations:  missingRequired.length,
    total:       parsed.length,
    pct:         fmtPct(missingRequired.length, parsed.length),
    details:     missingDetails.slice(0, 5).join(' | ') + (missingDetails.length > 5 ? ` … +${missingDetails.length - 5} more` : ''),
    autoFixed:   false,
    affectedRows: missingRequired,
  });
  flaggedRowsByCheck['C4'] = missingRequired;

  // Only test the rows that successfully parsed all required fields
  const validParsed = parsed.filter(p =>
    p.orderDate !== null && p.salesAmount !== null && p.customerId !== null
  );

  // ── CHECK C1: No negative or zero Sales (mirrors 06_data_quality_report.py check 1) ──

  const negSales = validParsed
    .filter(p => (p.salesAmount as number) <= 0)
    .map(p => p.originalIndex);

  checks.push({
    checkId:     'C1',
    description: 'Sales > 0 (no zero or negative values)',
    status:      negSales.length === 0 ? 'PASS' : 'FAIL',
    violations:  negSales.length,
    total:       validParsed.length,
    pct:         fmtPct(negSales.length, validParsed.length),
    details:     negSales.length > 0
      ? `Row(s) ${negSales.slice(0,5).map(i => i + 1).join(', ')}${negSales.length > 5 ? ` … +${negSales.length - 5} more` : ''} have sales ≤ 0`
      : '',
    autoFixed:   false,
    affectedRows: negSales,
  });
  flaggedRowsByCheck['C1'] = negSales;

  // ── CHECK C2: Ship Date >= Order Date (mirrors 06_data_quality_report.py check 2) ──

  const withShip   = validParsed.filter(p => p.shipDate !== null);
  const badShip    = withShip
    .filter(p => (p.shipDate as Date) < (p.orderDate as Date))
    .map(p => p.originalIndex);

  const c2Total    = withShip.length;
  checks.push({
    checkId:     'C2',
    description: 'Ship Date ≥ Order Date',
    status:      c2Total === 0 ? 'WARN' : badShip.length === 0 ? 'PASS' : 'FAIL',
    violations:  badShip.length,
    total:       c2Total,
    pct:         fmtPct(badShip.length, c2Total),
    details:     c2Total === 0
      ? 'Ship Date not mapped — check skipped'
      : badShip.length > 0
        ? `${badShip.length} row(s) where Ship Date < Order Date`
        : '',
    autoFixed:   false,
    affectedRows: badShip,
  });
  flaggedRowsByCheck['C2'] = badShip;

  // ── CHECK C3: No future dates (mirrors 06_data_quality_report.py check 3) ──

  const futureOrder  = validParsed
    .filter(p => (p.orderDate as Date) > today)
    .map(p => p.originalIndex);

  const futureShip   = withShip
    .filter(p => (p.shipDate as Date) > today)
    .map(p => p.originalIndex);

  const allFuture    = Array.from(new Set([...futureOrder, ...futureShip]));
  const totalDates   = validParsed.length + withShip.length;

  checks.push({
    checkId:     'C3',
    description: `No dates after ${today.toISOString().slice(0, 10)}`,
    status:      allFuture.length === 0 ? 'PASS' : 'FAIL',
    violations:  futureOrder.length + futureShip.length,
    total:       totalDates,
    pct:         fmtPct(futureOrder.length + futureShip.length, totalDates),
    details:     allFuture.length > 0
      ? `Future Order Dates: ${futureOrder.length} | Future Ship Dates: ${futureShip.length}`
      : '',
    autoFixed:   false,
    affectedRows: allFuture,
  });
  flaggedRowsByCheck['C3'] = allFuture;

  // ── CHECK C5: Exact duplicate rows (mirrors 01_clean_data.py step 4) ────────
  // We already removed them above — this check just reports how many were auto-fixed.

  const dupOrigIndices = Array.from(
    { length: rowsBefore },
    (_, i) => i
  ).filter(i => !dedupedIndices.includes(i));

  checks.push({
    checkId:     'C5',
    description: 'No exact duplicate rows',
    status:      duplicatesRemoved === 0 ? 'PASS' : 'WARN',
    violations:  duplicatesRemoved,
    total:       rowsBefore,
    pct:         fmtPct(duplicatesRemoved, rowsBefore),
    details:     duplicatesRemoved > 0
      ? `${duplicatesRemoved} duplicate(s) auto-removed — only first occurrence kept`
      : '',
    autoFixed:   duplicatesRemoved > 0,
    affectedRows: dupOrigIndices,
  });
  // Duplicates are auto-fixed, so not flagged for user action
  flaggedRowsByCheck['C5'] = [];

  // ── Re-order checks to match Python script order: C1 C2 C3 C4 C5 ──────────
  const orderedChecks = ['C1','C2','C3','C4','C5']
    .map(id => checks.find(c => c.checkId === id)!)
    .filter(Boolean);

  // ── Build clean rows (mirrors 01_clean_data.py step 5: derived columns) ────

  // Collect all flagged (non-auto-fixed) original indices
  const flaggedSet = new Set<number>([
    ...flaggedRowsByCheck['C1'],
    ...flaggedRowsByCheck['C2'],
    ...flaggedRowsByCheck['C3'],
    ...flaggedRowsByCheck['C4'],
    // C5 is auto-fixed — those rows are already gone from validParsed
  ]);

  const cleanRows: CleanRow[] = validParsed
    .filter(p => !flaggedSet.has(p.originalIndex))
    .map(p => {
      const od = p.orderDate as Date;
      return {
        orderDate:    od,
        salesAmount:  p.salesAmount as number,
        customerId:   p.customerId as string,
        region:       p.region,
        category:     p.category,
        shipDate:     p.shipDate ?? undefined,
        shipMode:     p.shipMode,
        // Derived columns (mirrors 01_clean_data.py step 5)
        orderYear:    od.getFullYear(),
        orderMonth:   od.getMonth() + 1, // 1-indexed
        orderQuarter: Math.ceil((od.getMonth() + 1) / 3),
        _originalIndex: p.originalIndex,
      };
    });

  const rowsAfter    = cleanRows.length;
  const passed       = orderedChecks.filter(c => c.status === 'PASS').length;
  const failed       = orderedChecks.filter(c => c.status === 'FAIL').length;
  const warned       = orderedChecks.filter(c => c.status === 'WARN').length;

  return {
    generatedAt,
    rowsBefore,
    rowsAfter,
    duplicatesRemoved,
    checks:            orderedChecks,
    totalChecks:       orderedChecks.length,
    passed,
    failed,
    warned,
    allPassed:         failed === 0,
    cleanRows,
    flaggedRowsByCheck,
  };
}
