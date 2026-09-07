"""
06_data_quality_report.py
--------------------------
Runs five data-quality checks across:
  - data/cleaned_sales.csv   (source layer)
  - data/warehouse.db        (warehouse layer)

Checks performed
----------------
  1. No negative or zero Sales values
  2. No Ship Date earlier than Order Date
  3. No dates in the future (> today)
  4. No orphaned Fact_Sales rows (every FK must resolve in its dim table)
  5. No duplicate primary keys in any dimension table

Outputs
-------
  - Console: PASS / FAIL with violation counts
  - File   : reports/data_quality_report.md (markdown with summary table)
"""

import sqlite3
import pandas as pd
from datetime import date
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR  = Path(__file__).resolve().parent.parent
CSV_PATH  = BASE_DIR / "data" / "cleaned_sales.csv"
DB_PATH   = BASE_DIR / "data" / "warehouse.db"
RPT_PATH  = BASE_DIR / "reports" / "data_quality_report.md"
RPT_PATH.parent.mkdir(exist_ok=True)

TODAY = date.today()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def banner(t): print(f"\n{'='*62}\n  {t}\n{'='*62}")
def step(n, t): print(f"\n[{n}] {t}")

results = []   # list of dicts for the markdown table

def record(check_id, layer, description, violations, total, details=""):
    status = "[PASS]" if violations == 0 else "[FAIL]"
    pct    = f"{violations/total*100:.1f}%" if total else "N/A"
    results.append({
        "check_id":    check_id,
        "layer":       layer,
        "description": description,
        "status":      status,
        "violations":  violations,
        "total":       total,
        "pct":         pct,
        "details":     details,
    })
    tag  = "PASS" if violations == 0 else "FAIL"
    icon = "+" if violations == 0 else "!"
    print(f"  [{icon}] {tag}  --  {description}")
    if violations > 0:
        print(f"       Violations : {violations:,} / {total:,} ({pct})")
        if details:
            print(f"       Detail     : {details}")
    else:
        print(f"       Checked    : {total:,} rows -- all clean")

# ===========================================================================
# MAIN
# ===========================================================================
banner("Data Quality Report")
print(f"  CSV    : {CSV_PATH.name}")
print(f"  DB     : {DB_PATH.name}")
print(f"  Today  : {TODAY}")

# ---------------------------------------------------------------------------
# Load CSV
# ---------------------------------------------------------------------------
step("L", "Loading cleaned_sales.csv")
csv = pd.read_csv(CSV_PATH, parse_dates=["Order Date", "Ship Date"])
print(f"  Rows: {len(csv):,}")

# Load DB
conn = sqlite3.connect(DB_PATH)
fact = pd.read_sql("SELECT * FROM Fact_Sales", conn)
dim_customer = pd.read_sql("SELECT customer_key FROM Dim_Customer", conn)
dim_product  = pd.read_sql("SELECT product_key  FROM Dim_Product",  conn)
dim_location = pd.read_sql("SELECT location_key FROM Dim_Location", conn)
dim_date     = pd.read_sql("SELECT order_date   FROM Dim_Date",     conn)

# ===========================================================================
# CHECK 1 — No negative or zero Sales
# ===========================================================================
step(1, "No negative or zero Sales values")

bad_csv = (csv["Sales"] <= 0).sum()
bad_db  = (fact["sales"] <= 0).sum()
total_v = len(csv) + len(fact)
record("C1", "CSV + DB",
       "Sales > 0 (no zero/negative values)",
       int(bad_csv + bad_db), total_v,
       f"CSV: {bad_csv} | Fact_Sales: {bad_db}")

# ===========================================================================
# CHECK 2 — Ship Date >= Order Date
# ===========================================================================
step(2, "No Ship Date earlier than Order Date")

csv["_delta"] = (csv["Ship Date"] - csv["Order Date"]).dt.days
bad_ship = (csv["_delta"] < 0).sum()
record("C2", "CSV",
       "Ship Date >= Order Date",
       int(bad_ship), len(csv),
       f"{bad_ship} rows where Ship Date < Order Date" if bad_ship else "")

# ===========================================================================
# CHECK 3 — No future dates
# ===========================================================================
step(3, "No dates in the future (> today)")

future_order = (csv["Order Date"].dt.date > TODAY).sum()
future_ship  = (csv["Ship Date"].dt.date  > TODAY).sum()
total_dates  = len(csv) * 2
record("C3", "CSV",
       f"No dates after {TODAY}",
       int(future_order + future_ship), total_dates,
       f"Future Order Dates: {future_order} | Future Ship Dates: {future_ship}")

# ===========================================================================
# CHECK 4 — No orphaned FK rows in Fact_Sales
# ===========================================================================
step(4, "No orphaned FK records in Fact_Sales")

valid_ck = set(dim_customer["customer_key"])
valid_pk = set(dim_product["product_key"])
valid_lk = set(dim_location["location_key"])
valid_od = set(dim_date["order_date"])

orphan_ck = (~fact["customer_key"].isin(valid_ck)).sum()
orphan_pk = (~fact["product_key"].isin(valid_pk)).sum()
orphan_lk = (~fact["location_key"].isin(valid_lk)).sum()
orphan_od = (~fact["order_date"].isin(valid_od)).sum()
total_orphan = int(orphan_ck + orphan_pk + orphan_lk + orphan_od)

record("C4", "DB",
       "All Fact_Sales FK keys resolve in dimension tables",
       total_orphan, len(fact) * 4,
       f"customer: {orphan_ck} | product: {orphan_pk} | location: {orphan_lk} | date: {orphan_od}")

# ===========================================================================
# CHECK 5 — No duplicate PKs in dimension tables
# ===========================================================================
step(5, "No duplicate primary keys in dimension tables")

def count_dupes(df, pk_col):
    return int(df[pk_col].duplicated().sum())

d = {
    "Dim_Customer (customer_key)":  count_dupes(dim_customer, "customer_key"),
    "Dim_Product  (product_key)":   count_dupes(dim_product,  "product_key"),
    "Dim_Location (location_key)":  count_dupes(dim_location, "location_key"),
    "Dim_Date     (order_date)":    count_dupes(dim_date,     "order_date"),
}
total_dupes = sum(d.values())
total_rows  = sum(len(df) for df in [dim_customer, dim_product, dim_location, dim_date])
detail_str  = " | ".join(f"{k}: {v}" for k, v in d.items())
record("C5", "DB",
       "No duplicate PKs in any dimension table",
       total_dupes, total_rows, detail_str)

conn.close()

# ===========================================================================
# Console summary
# ===========================================================================
banner("SUMMARY")
passes = sum(1 for r in results if "PASS" in r["status"])
fails  = sum(1 for r in results if "FAIL" in r["status"])
print(f"\n  {'Check':<5}  {'Layer':<10}  {'Status':<10}  {'Violations':>12}  {'Total':>10}")
print(f"  {'-'*56}")
for r in results:
    print(f"  {r['check_id']:<5}  {r['layer']:<10}  {r['status']:<10}  {r['violations']:>12,}  {r['total']:>10,}")
print(f"\n  Total checks : {len(results)}")
print(f"  Passed       : {passes}")
print(f"  Failed       : {fails}")

# ===========================================================================
# Write markdown report
# ===========================================================================
banner("Writing reports/data_quality_report.md")

md_lines = [
    "# Data Quality Report",
    "",
    f"> Generated: {date.today()}  |  Source: `data/cleaned_sales.csv` + `data/warehouse.db`",
    "",
    "## Summary",
    "",
    f"| Metric | Value |",
    f"|--------|-------|",
    f"| Total checks run | {len(results)} |",
    f"| Passed | **{passes}** |",
    f"| Failed | **{fails}** |",
    f"| Overall status | {'ALL PASS' if fails == 0 else 'ISSUES FOUND'} |",
    "",
    "## Check Results",
    "",
    "| # | Layer | Description | Status | Violations | Total Rows | % Bad |",
    "|---|-------|-------------|--------|------------|------------|-------|",
]

for r in results:
    md_lines.append(
        f"| {r['check_id']} | {r['layer']} | {r['description']} "
        f"| {r['status']} | {r['violations']:,} | {r['total']:,} | {r['pct']} |"
    )

md_lines += [
    "",
    "## Check Details",
    "",
]
for r in results:
    md_lines.append(f"### {r['check_id']}: {r['description']}")
    md_lines.append(f"- **Layer**: {r['layer']}")
    md_lines.append(f"- **Status**: {r['status']}")
    md_lines.append(f"- **Violations**: {r['violations']:,} / {r['total']:,} rows")
    if r["details"]:
        md_lines.append(f"- **Detail**: `{r['details']}`")
    md_lines.append("")

RPT_PATH.write_text("\n".join(md_lines), encoding="utf-8")
print(f"  Saved: {RPT_PATH.relative_to(BASE_DIR)}")
banner("Done.")
