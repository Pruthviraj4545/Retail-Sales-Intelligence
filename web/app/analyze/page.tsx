'use client';

import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import {
  Upload, CheckCircle2, Loader2, Lock, ShieldAlert
} from 'lucide-react';
import { COLORS } from '../components/constants';
import { cleanData, type CleaningReport, type CleanRow } from '../../lib/cleanData';
import DataQualityCard from './DataQualityCard';
import AnalysisDashboard from './AnalysisDashboard';
import NavBar from '../../components/NavBar';

// ─── Types ────────────────────────────────────────────────────────────────────

type RawRow = Record<string, string>;

interface ParsedData {
  columns: string[];
  rows: RawRow[];
  fileName: string;
  totalRows: number;
}

interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  description: string;
}

type ColumnMapping = Record<string, string>; // fieldKey → csvColumn

// ─── Constants ────────────────────────────────────────────────────────────────

const REQUIRED_FIELDS: FieldDef[] = [
  { key: 'orderDate',   label: 'Order Date',   required: true,  description: 'Date the transaction was recorded' },
  { key: 'salesAmount', label: 'Sales Amount', required: true,  description: 'Revenue value per transaction line' },
  { key: 'customerId',  label: 'Customer ID',  required: true,  description: 'Unique identifier per customer account' },
];

const OPTIONAL_FIELDS: FieldDef[] = [
  { key: 'region',    label: 'Region',    required: false, description: 'Geographic distribution region' },
  { key: 'category',  label: 'Category',  required: false, description: 'Product classification group' },
  { key: 'shipDate',  label: 'Ship Date', required: false, description: 'Date the order departed warehouse' },
  { key: 'shipMode',  label: 'Ship Mode', required: false, description: 'Carrier classification class' },
];

const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];
const NONE_OPTION = '— not mapped —';

// ─── Bundled Sample CSV ────────────────────────────────────────────────────────

const SAMPLE_CSV = `Order ID,Order Date,Customer ID,Customer Name,Region,Category,Sales,Ship Date,Ship Mode
CA-2024-001,2024-01-05,CUST-1042,Alice Sharma,West,Technology,899.99,2024-01-08,First Class
CA-2024-002,2024-01-07,CUST-2187,Bob Martinez,East,Furniture,1240.50,2024-01-12,Standard Class
CA-2024-003,2024-01-09,CUST-0831,Carol Zhang,South,Office Supplies,84.30,2024-01-10,Same Day
CA-2024-004,2024-01-11,CUST-3394,David Patel,Central,Technology,499.00,2024-01-14,Second Class
CA-2024-005,2024-01-14,CUST-1042,Alice Sharma,West,Office Supplies,23.75,2024-01-16,Standard Class
CA-2024-006,2024-01-15,CUST-4520,Eva Nguyen,East,Furniture,2340.00,2024-01-20,First Class
CA-2024-007,2024-01-18,CUST-0291,Frank Kim,South,Technology,319.49,2024-01-19,Same Day
CA-2024-008,2024-01-20,CUST-2187,Bob Martinez,East,Office Supplies,61.10,2024-01-24,Standard Class
CA-2024-009,2024-01-22,CUST-5678,Grace Liu,West,Furniture,775.25,2024-01-26,Second Class
CA-2024-010,2024-01-25,CUST-3394,David Patel,Central,Technology,1099.00,2024-01-28,First Class
CA-2024-011,2024-02-02,CUST-7712,Henry Ford,North,Technology,450.00,2024-02-05,Second Class
CA-2024-012,2024-02-04,CUST-9201,Ivy Chen,East,Furniture,890.50,2024-02-08,Standard Class
CA-2024-013,2024-02-06,CUST-0831,Carol Zhang,South,Office Supplies,34.20,2024-02-07,Same Day
CA-2024-014,2024-02-10,CUST-4520,Eva Nguyen,East,Technology,1540.00,2024-02-14,First Class
CA-2024-015,2024-02-13,CUST-1042,Alice Sharma,West,Furniture,620.00,2024-02-17,Standard Class
CA-2024-016,2024-02-18,CUST-2187,Bob Martinez,East,Technology,310.75,2024-02-21,Second Class
CA-2024-017,2024-02-20,CUST-7712,Henry Ford,North,Office Supplies,88.40,2024-02-22,Same Day
CA-2024-018,2024-02-24,CUST-3394,David Patel,Central,Furniture,1230.00,2024-02-28,First Class
CA-2024-019,2024-03-01,CUST-5678,Grace Liu,West,Technology,540.00,2024-03-04,Standard Class
CA-2024-020,2024-03-05,CUST-9201,Ivy Chen,East,Office Supplies,72.80,2024-03-07,Same Day
`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Upload and Preview' },
    { n: 2, label: 'Map Columns'      },
    { n: 3, label: 'Data Quality'     },
  ];
  const activeIdx  = step - 1;
  const filledPct  = activeIdx > 0 ? `${activeIdx * 50}%` : '0%';

  return (
    <div style={{ position: 'relative', marginBottom: 40, paddingTop: 8 }}>
      {/* Background Dotted Line */}
      <div style={{ position: 'absolute', top: 22, left: '16.66%', right: '16.66%', height: 1, borderTop: `2px dashed ${COLORS.line}` }} />
      {/* Filled Track */}
      <motion.div
        style={{ position: 'absolute', top: 22, left: '16.66%', height: 1, borderTop: `2px solid ${COLORS.ledger}`, width: filledPct }}
        animate={{ width: filledPct }}
        transition={{ duration: 0.4, ease: [0.25, 0, 0, 1] }}
      />
      {/* Step Nodes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {steps.map((s) => {
          const done   = step > s.n;
          const active = step === s.n;
          const color  = done ? COLORS.ledger : active ? COLORS.stamp : COLORS.inkMuted;
          return (
            <div key={s.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width:          26,
                  height:         26,
                  borderRadius:   2,
                  background:     active ? COLORS.stamp : done ? COLORS.ledger : COLORS.paper,
                  border:         `1.5px solid ${color}`,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  position:       'relative',
                  zIndex:         1,
                  transition:     'background 0.25s, border-color 0.25s',
                }}
              >
                {done ? (
                  <CheckCircle2 size={12} color={COLORS.paper} />
                ) : (
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: active ? COLORS.paper : COLORS.inkMuted }}>
                    {s.n}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, color: active ? COLORS.stamp : done ? COLORS.ledger : COLORS.inkMuted, whiteSpace: 'nowrap', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 1: Drop Zone ────────────────────────────────────────────────────────

function friendlyParseError(raw: string, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext && ext !== 'csv') {
    return `File type ".${ext}" is not supported. Please select a comma-separated value (.csv) file.`;
  }
  return `Error during parsing: ${raw}. Verify file delimiters and header rows.`;
}

interface UploadZoneProps {
  onParsed:     (data: ParsedData) => void;
  onSampleLoad: () => void;
}

function UploadZone({ onParsed, onSampleLoad }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoverSample, setHoverSample] = useState(false);

  const parseCsvText = useCallback((text: string, fileName: string) => {
    setError(null);
    setErrorHint(null);
    setLoading(true);

    Papa.parse<RawRow>(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setLoading(false);
        if (!results.data.length) {
          setError('Empty transaction manifest.');
          setErrorHint('The parsed CSV does not contain any transaction rows.');
          return;
        }
        const cols = results.meta.fields ?? [];
        if (cols.length === 0) {
          setError('No schema columns detected.');
          setErrorHint('Ensure the first row of your CSV contains header fields.');
          return;
        }
        onParsed({
          columns: cols,
          rows: results.data,
          fileName,
          totalRows: results.data.length,
        });
      },
      error: (err: { message: string }) => {
        setLoading(false);
        setError(friendlyParseError(err.message, fileName));
      }
    });
  }, [onParsed]);

  const processFile = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv') {
      setError(`Unsupported file type: "${file.name}"`);
      setErrorHint('Only valid CSV documents (.csv) can be processed.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => parseCsvText(ev.target?.result as string, file.name);
    reader.onerror = () => {
      setLoading(false);
      setError('File reading error. Try again.');
    };
    setLoading(true);
    reader.readAsText(file);
  }, [parseCsvText]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !loading && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && !loading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          border:       `2px dashed ${error ? COLORS.stamp : dragging ? COLORS.ledger : COLORS.line}`,
          borderRadius: 2,
          background:   error ? `${COLORS.stamp}06` : dragging ? `${COLORS.ledger}06` : COLORS.surface, // Surface background #24272C
          padding:      '48px 32px',
          textAlign:    'center',
          cursor:       loading ? 'default' : 'pointer',
          outline:      'none',
          position:     'relative',
        }}
      >
        <input ref={inputRef} type="file" accept=".csv" onChange={onInputChange} style={{ display: 'none' }} />

        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin" size={24} color={COLORS.ledger} />
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: COLORS.ink }}>PARSING CSV METADATA...</div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload size={24} color={error ? COLORS.stamp : COLORS.inkMuted} />
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontStyle: 'italic', color: COLORS.ink, fontWeight: 500 }}>
              Drag and drop cargo manifest CSV
            </div>
            <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: COLORS.inkMuted }}>
              or click to browse local files
            </div>
            <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: COLORS.inkMuted, border: `1px solid ${COLORS.line}`, padding: '2px 8px', background: COLORS.paper }}>
              .CSV ONLY
            </span>
          </div>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 16, background: `${COLORS.stamp}12`, border: `1px solid ${COLORS.stamp}`, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <ShieldAlert size={16} color={COLORS.stamp} style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.stamp }}>
              {error}
            </div>
            {errorHint && (
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: COLORS.inkMuted, marginTop: 4 }}>
                {errorHint}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Try with sample data */}
      <div className="flex items-center justify-between mt-6" style={{ borderTop: `1px dashed ${COLORS.line}`, paddingTop: 16 }}>
        <button
          onClick={() => { onSampleLoad(); parseCsvText(SAMPLE_CSV, 'sample_retail_manifest.csv'); }}
          onMouseEnter={() => setHoverSample(true)}
          onMouseLeave={() => setHoverSample(false)}
          style={{
            fontFamily:     "'IBM Plex Sans', sans-serif",
            fontSize:       12,
            fontWeight:     600,
            color:          COLORS.ink,
            background:     hoverSample ? 'rgba(237, 231, 218, 0.08)' : 'transparent',
            border:         `1.5px solid #4A4E56`, // Visible 1.5px border
            padding:        '6px 12px',
            cursor:         'pointer',
            transition:     'background-color 0.15s',
          }}
        >
          Try with Sample Manifest
        </button>
        <span style={{ fontSize: 11, color: COLORS.inkMuted, fontFamily: "'IBM Plex Sans', sans-serif" }}>
          * Loads a pre-built retail test manifest.
        </span>
      </div>
    </div>
  );
}

// ─── Step 1: Data Preview ─────────────────────────────────────────────────────

interface DataPreviewProps {
  data:       ParsedData;
  onContinue: () => void;
  onReset:    () => void;
}

function DataPreview({ data, onContinue, onReset }: DataPreviewProps) {
  const previewRows = data.rows.slice(0, 5);

  return (
    <div>
      <div style={{ display: 'flex', justifyItems: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.inkMuted }}>
          MANIFEST: {data.fileName} &bull; {data.totalRows.toLocaleString()} rows detected
        </div>
        <button onClick={onReset} style={{ background: 'none', border: 'none', color: COLORS.stamp, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 600 }}>
          Cancel Manifest
        </button>
      </div>

      {/* Manifest Receipt Table */}
      <div>
        <div style={{ height: 6, background: `repeating-linear-gradient(90deg, ${COLORS.line} 0px, ${COLORS.line} 8px, transparent 8px, transparent 14px)` }} />
        <div style={{ border: `1px solid ${COLORS.line}`, background: COLORS.surface, overflowX: 'auto' }}>
          <table className="manifest-table">
            <thead>
              <tr>
                {data.columns.slice(0, 6).map(c => (
                  <th key={c}>{c}</th>
                ))}
                {data.columns.length > 6 && <th>...</th>}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {data.columns.slice(0, 6).map(c => (
                    <td key={c}>{row[c] || '—'}</td>
                  ))}
                  {data.columns.length > 6 && <td style={{ color: COLORS.inkMuted }}>...</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ height: 6, background: `repeating-linear-gradient(90deg, ${COLORS.line} 0px, ${COLORS.line} 8px, transparent 8px, transparent 14px)` }} />
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
        <button
          onClick={onContinue}
          style={{
            padding:    '8px 18px',
            background: COLORS.stamp,
            border:     'none',
            color:      '#17191D', // Dark text for contrast
            fontWeight: 600,
            fontSize:   13,
            cursor:     'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1.0'; }}
        >
          Configure Column Mappings
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Column Mapper ────────────────────────────────────────────────────

interface ColumnMapperProps {
  data:       ParsedData;
  onComplete: (mapping: ColumnMapping, mappedRows: RawRow[]) => void;
  onBack:     () => void;
}

function ColumnMapper({ data, onComplete, onBack }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(() => {
    const initial: ColumnMapping = {};
    ALL_FIELDS.forEach(f => {
      const match = data.columns.find(col =>
        col.toLowerCase().replace(/[^a-z0-9]/g, '') === f.key.toLowerCase() ||
        col.toLowerCase().replace(/[^a-z0-9]/g, '') === f.label.toLowerCase().replace(/[^a-z0-9]/g, '')
      );
      initial[f.key] = match || NONE_OPTION;
    });
    return initial;
  });

  const handleSelectChange = (fieldKey: string, value: string) => {
    setMapping(prev => ({ ...prev, [fieldKey]: value }));
  };

  const isAllRequiredMapped = REQUIRED_FIELDS.every(
    f => mapping[f.key] && mapping[f.key] !== NONE_OPTION
  );

  const handleSubmit = () => {
    if (!isAllRequiredMapped) return;
    const finalRows = data.rows.map(row => {
      const mapped: RawRow = {};
      ALL_FIELDS.forEach(f => {
        const csvCol = mapping[f.key];
        mapped[f.key] = csvCol && csvCol !== NONE_OPTION ? row[csvCol] : '';
      });
      return mapped;
    });
    onComplete(mapping, finalRows);
  };

  return (
    <div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.inkMuted, marginBottom: 14 }}>
        Configure manifest mappings to standard logistics fields:
      </div>

      <div style={{ display: 'grid', gap: 14, marginBottom: 28 }}>
        {ALL_FIELDS.map(f => {
          const selected = mapping[f.key];
          const isRequiredMissing = f.required && selected === NONE_OPTION;

          return (
            <div
              key={f.key}
              style={{
                background:  COLORS.surface,
                border:      `1px solid ${isRequiredMissing ? COLORS.stamp : COLORS.line}`,
                padding:     '12px 16px',
                display:     'grid',
                gridTemplateColumns: '1fr 240px',
                alignItems:  'center',
                gap:         16,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink }}>{f.label}</span>
                  {f.required ? (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: COLORS.stamp, border: `1px solid ${COLORS.stamp}`, padding: '1px 5px', background: 'transparent' }}>
                      REQUIRED
                    </span>
                  ) : (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: COLORS.inkMuted, border: `1px solid ${COLORS.line}`, padding: '1px 5px' }}>
                      OPTIONAL
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: COLORS.inkMuted, marginTop: 4 }}>{f.description}</div>
              </div>

              <select
                value={selected}
                onChange={(e) => handleSelectChange(f.key, e.target.value)}
                style={{
                  width:      '100%',
                  padding:    '6px 10px',
                  background: COLORS.paper,
                  border:     `1px solid ${COLORS.line}`,
                  color:      COLORS.ink,
                  fontSize:   12,
                  fontFamily: "'IBM Plex Mono', monospace",
                  outline:    'none',
                }}
              >
                <option value={NONE_OPTION}>{NONE_OPTION}</option>
                {data.columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          onClick={handleSubmit}
          disabled={!isAllRequiredMapped}
          style={{
            padding:    '8px 18px',
            background: isAllRequiredMapped ? COLORS.stamp : COLORS.line,
            color:      isAllRequiredMapped ? '#17191D' : COLORS.inkMuted, // Dark text when enabled
            fontWeight: 600,
            fontSize:   13,
            cursor:     isAllRequiredMapped ? 'pointer' : 'not-allowed',
            border:     'none',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { if (isAllRequiredMapped) e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={e => { if (isAllRequiredMapped) e.currentTarget.style.opacity = '1.0'; }}
        >
          Verify Data Integrity &rarr;
        </button>

        <button
          onClick={onBack}
          style={{
            background: 'none',
            border:     'none',
            color:      COLORS.inkMuted,
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize:   13,
            cursor:     'pointer',
          }}
        >
          Back
        </button>
      </div>
    </div>
  );
}

// ─── Processing Overlay ──────────────────────────────────────────────────────

function ProcessingOverlay() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(23, 25, 29, 0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, padding: '24px 32px', textAlign: 'center', boxShadow: `4px 4px 0 ${COLORS.line}` }}>
        <Loader2 className="animate-spin" size={28} color={COLORS.stamp} style={{ margin: '0 auto 12px' }} />
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontStyle: 'italic', color: COLORS.ink, fontWeight: 500 }}>
          Running database constraints...
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.inkMuted, marginTop: 4 }}>
          Validating date sequences and clustering RFM data...
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function AnalyzePage() {
  const [parsedData,    setParsedData   ] = useState<ParsedData | null>(null);
  const [step,          setStep         ] = useState<1 | 2 | 3>(1);
  const [qaReport,      setQaReport     ] = useState<CleaningReport | null>(null);
  const [cleanRows,     setCleanRows    ] = useState<CleanRow[] | null>(null);
  const [isProcessing,  setIsProcessing ] = useState(false);

  const done = cleanRows !== null && qaReport !== null && step > 3;

  const handleParsed = (data: ParsedData) => {
    setParsedData(data);
    setStep(1);
  };

  const handleReset = () => {
    setParsedData(null);
    setQaReport(null);
    setCleanRows(null);
    setStep(1);
    setIsProcessing(false);
  };

  const handleComplete = (_m: ColumnMapping, rows: RawRow[]) => {
    setIsProcessing(true);
    setTimeout(() => {
      const report = cleanData(rows);
      setQaReport(report);
      setCleanRows(report.cleanRows);
      setIsProcessing(false);
      setStep(3);
    }, 30);
  };

  const handleProceed = () => {
    setStep(4 as unknown as 3);
  };

  return (
    <div style={{ background: COLORS.paper, minHeight: '100vh', color: COLORS.ink }}>
      <NavBar />

      <div className="max-w-[840px] mx-auto px-6 pt-12 pb-20">
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.12em', color: COLORS.ledger, textTransform: 'uppercase', marginBottom: 10 }}>
          Cargo Manifest Processing
        </div>

        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(28px, 4.5vw, 42px)', fontWeight: 500, color: COLORS.ink, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
          Upload and Map Your Manifest
        </h1>

        <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: COLORS.inkMuted, marginBottom: 20, lineHeight: 1.6 }}>
          Drop in any retail transaction spreadsheet. Map database columns to logistics properties. All records processed entirely in memory.
        </p>

        {/* Privacy Note */}
        <div
          style={{
            padding:      '10px 14px',
            background:   COLORS.surface, // Surface #24272C
            borderLeft:   `3px solid ${COLORS.ledger}`,
            border:       `1px solid ${COLORS.line}`,
            fontSize:     12,
            color:        COLORS.inkMuted,
            display:      'flex',
            alignItems:   'center',
            gap:          8,
            marginBottom: 28,
          }}
        >
          <Lock size={13} color={COLORS.ledger} />
          <span>
            Privacy Notice: Calculations run client-side. Manifest data is <strong style={{ color: COLORS.ink }}>never uploaded to any server</strong>.
          </span>
        </div>

        {/* Step indicator */}
        {!done && step <= 3 && (
          <StepIndicator step={step <= 3 ? (step as 1 | 2 | 3) : 3} />
        )}

        {/* Processing overlay */}
        {isProcessing && <ProcessingOverlay />}

        {/* State Machine Transition */}
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <AnalysisDashboard cleanRows={cleanRows!} onReset={handleReset} />
            </motion.div>
          ) : parsedData === null ? (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <UploadZone onParsed={handleParsed} onSampleLoad={() => {}} />
            </motion.div>
          ) : step === 1 ? (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <DataPreview data={parsedData} onContinue={() => setStep(2)} onReset={handleReset} />
            </motion.div>
          ) : step === 2 ? (
            <motion.div key="mapper" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <ColumnMapper data={parsedData} onComplete={handleComplete} onBack={() => setStep(1)} />
            </motion.div>
          ) : (
            qaReport && (
              <motion.div key="qa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <DataQualityCard report={qaReport} onProceed={handleProceed} onReset={handleReset} />
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

      <footer style={{ textAlign: 'center', padding: '30px 24px', borderTop: `1px solid ${COLORS.line}`, background: COLORS.surface }}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.inkMuted }}>
          Retail Manifest Processing &bull; PapaParse Client Engine
        </p>
      </footer>
    </div>
  );
}
