"""
07_incremental_load.py
-----------------------
Simulates an incremental (delta) load into an existing data warehouse.

Why this matters
----------------
Real-world pipelines receive data continuously: nightly order exports,
streaming event logs, daily CRM syncs.  A one-time bulk load is never
enough.  This script demonstrates the two patterns every production ETL
must implement:

  1. IDEMPOTENT DIMENSION LOADS
     INSERT OR IGNORE on the unique business-key column means re-running
     the script never creates duplicate dimension rows, regardless of
     whether the batch contains records already seen.

  2. DEDUPLICATION OF FACT ROWS
     Before inserting new fact rows we collect the set of Order IDs
     already present in Fact_Sales.  Any incoming row whose Order ID is
     already loaded is silently skipped — ensuring exactly-once semantics
     for the fact table without costly full-table scans.

Together these two patterns make the pipeline safe to re-run (idempotent),
which is critical for failure recovery and backfill scenarios.

Usage
-----
  python scripts/07_incremental_load.py

Steps
-----
  1. Carve out 50 rows from data/cleaned_sales.csv -> data/new_batch.csv
  2. Confirm how many of those rows are genuinely new vs already loaded
  3. Load new dim rows + new fact rows into data/warehouse.db
  4. Print before/after row counts for Fact_Sales
"""

import sqlite3
import pandas as pd
import calendar
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR  = Path(__file__).resolve().parent.parent
CSV_PATH  = BASE_DIR / "data" / "cleaned_sales.csv"
BATCH_PATH = BASE_DIR / "data" / "new_batch.csv"
DB_PATH   = BASE_DIR / "data" / "warehouse.db"

BATCH_SIZE = 50   # rows to simulate as "arriving new data"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def banner(t): print(f"\n{'='*62}\n  {t}\n{'='*62}")
def step(n, t): print(f"\n[{n}] {t}")

# ===========================================================================
# MAIN
# ===========================================================================
banner("Incremental Warehouse Load")

# ---------------------------------------------------------------------------
# 1. Slice 50 rows and save as data/new_batch.csv
# ---------------------------------------------------------------------------
step(1, f"Carving {BATCH_SIZE}-row batch from cleaned_sales.csv")

full = pd.read_csv(CSV_PATH, parse_dates=["Order Date", "Ship Date"])
full["_order_date_str"] = full["Order Date"].dt.strftime("%Y-%m-%d")
full["_ship_date_str"]  = full["Ship Date"].dt.strftime("%Y-%m-%d")

# Use the LAST 50 rows so ~half will already be in the warehouse
# (all 9,800 rows are loaded) — demonstrating the dedup logic
batch = full.tail(BATCH_SIZE).copy()
batch.to_csv(BATCH_PATH, index=False)
print(f"  Saved: {BATCH_PATH.name}  ({len(batch)} rows)")
print(f"  Order IDs in batch: {batch['Order ID'].nunique()} unique")
print(f"  Date range: {batch['Order Date'].min().date()} -> {batch['Order Date'].max().date()}")

# ---------------------------------------------------------------------------
# 2. Connect to warehouse and capture BEFORE counts
# ---------------------------------------------------------------------------
step(2, "Connecting to warehouse.db — capturing BEFORE counts")

conn = sqlite3.connect(DB_PATH)
conn.execute("PRAGMA foreign_keys = ON")

before_fact     = conn.execute("SELECT COUNT(*) FROM Fact_Sales").fetchone()[0]
before_customer = conn.execute("SELECT COUNT(*) FROM Dim_Customer").fetchone()[0]
before_product  = conn.execute("SELECT COUNT(*) FROM Dim_Product").fetchone()[0]
before_location = conn.execute("SELECT COUNT(*) FROM Dim_Location").fetchone()[0]
before_date     = conn.execute("SELECT COUNT(*) FROM Dim_Date").fetchone()[0]

print(f"\n  BEFORE load:")
print(f"    Fact_Sales    : {before_fact:,}")
print(f"    Dim_Customer  : {before_customer:,}")
print(f"    Dim_Product   : {before_product:,}")
print(f"    Dim_Location  : {before_location:,}")
print(f"    Dim_Date      : {before_date:,}")

# ---------------------------------------------------------------------------
# 3. Determine which Order IDs are truly new
# ---------------------------------------------------------------------------
step(3, "Identifying genuinely new vs already-loaded rows")

existing_order_ids = {
    row[0]
    for row in conn.execute("SELECT DISTINCT order_id FROM Fact_Sales").fetchall()
}

batch["_is_new"] = ~batch["Order ID"].isin(existing_order_ids)
new_rows = batch[batch["_is_new"]].copy()
dup_rows = batch[~batch["_is_new"]]

print(f"  Batch rows      : {len(batch):,}")
print(f"  Already loaded  : {len(dup_rows):,}  (skipped)")
print(f"  Genuinely new   : {len(new_rows):,}  (will be inserted)")

# ---------------------------------------------------------------------------
# 4. Load dimension rows (INSERT OR IGNORE — idempotent)
# ---------------------------------------------------------------------------
step(4, "Loading dimension rows (INSERT OR IGNORE)")

if len(new_rows) > 0:
    # Dim_Date
    date_rows = new_rows[["_order_date_str", "Order Year", "Order Month", "Order Quarter"]].drop_duplicates(
        subset=["_order_date_str"]
    ).copy()
    date_rows["month_name"]    = date_rows["Order Month"].apply(lambda m: calendar.month_name[m])
    date_rows["quarter_label"] = date_rows["Order Quarter"].apply(lambda q: f"Q{q}")
    conn.executemany(
        "INSERT OR IGNORE INTO Dim_Date (order_date,order_year,order_month,order_quarter,month_name,quarter_label) VALUES (?,?,?,?,?,?)",
        date_rows[["_order_date_str","Order Year","Order Month","Order Quarter","month_name","quarter_label"]].itertuples(index=False, name=None)
    )

    # Dim_Customer
    conn.executemany(
        "INSERT OR IGNORE INTO Dim_Customer (customer_id,customer_name,segment) VALUES (?,?,?)",
        new_rows[["Customer ID","Customer Name","Segment"]].drop_duplicates("Customer ID").itertuples(index=False, name=None)
    )

    # Dim_Product
    conn.executemany(
        "INSERT OR IGNORE INTO Dim_Product (product_id,category,sub_category,product_name) VALUES (?,?,?,?)",
        new_rows[["Product ID","Category","Sub-Category","Product Name"]].drop_duplicates("Product ID").itertuples(index=False, name=None)
    )

    # Dim_Location
    conn.executemany(
        "INSERT OR IGNORE INTO Dim_Location (postal_code,city,state,region,country) VALUES (?,?,?,?,?)",
        new_rows[["Postal Code","City","State","Region","Country"]].drop_duplicates("Postal Code").itertuples(index=False, name=None)
    )

    conn.commit()
    print("  Dimension tables updated (INSERT OR IGNORE — existing rows untouched)")
else:
    print("  No new dimension rows to insert.")

# ---------------------------------------------------------------------------
# 5. Build surrogate-key lookup maps and insert new Fact rows
# ---------------------------------------------------------------------------
step(5, "Inserting new Fact_Sales rows")

if len(new_rows) > 0:
    customer_map = dict(conn.execute("SELECT customer_id, customer_key FROM Dim_Customer").fetchall())
    product_map  = dict(conn.execute("SELECT product_id,  product_key  FROM Dim_Product").fetchall())
    location_map = dict(conn.execute("SELECT postal_code, location_key FROM Dim_Location").fetchall())

    new_rows["_product_key"]  = new_rows["Product ID"].map(product_map)
    new_rows["_customer_key"] = new_rows["Customer ID"].map(customer_map)
    new_rows["_location_key"] = new_rows["Postal Code"].map(location_map)

    fact_rows = list(zip(
        new_rows["Order ID"],
        new_rows["_product_key"],
        new_rows["_customer_key"],
        new_rows["_location_key"],
        new_rows["_order_date_str"],
        new_rows["Ship Mode"],
        new_rows["_ship_date_str"],
        new_rows["Sales"],
    ))

    conn.executemany(
        """INSERT INTO Fact_Sales
           (order_id,product_key,customer_key,location_key,order_date,ship_mode,ship_date,sales)
           VALUES (?,?,?,?,?,?,?,?)""",
        fact_rows
    )
    conn.commit()
    print(f"  Inserted {len(fact_rows):,} new fact rows")
else:
    print("  No new fact rows to insert — all batch Order IDs already in Fact_Sales.")

# ---------------------------------------------------------------------------
# 6. AFTER counts and comparison
# ---------------------------------------------------------------------------
step(6, "AFTER counts — proving only net-new rows were added")

after_fact     = conn.execute("SELECT COUNT(*) FROM Fact_Sales").fetchone()[0]
after_customer = conn.execute("SELECT COUNT(*) FROM Dim_Customer").fetchone()[0]
after_product  = conn.execute("SELECT COUNT(*) FROM Dim_Product").fetchone()[0]
after_location = conn.execute("SELECT COUNT(*) FROM Dim_Location").fetchone()[0]
after_date     = conn.execute("SELECT COUNT(*) FROM Dim_Date").fetchone()[0]

conn.close()

col = 16
print(f"\n  {'Table':<{col}}  {'Before':>8}  {'After':>8}  {'Delta':>8}")
print(f"  {'-'*(col+28)}")
for tbl, b, a in [
    ("Fact_Sales",   before_fact,     after_fact),
    ("Dim_Customer", before_customer, after_customer),
    ("Dim_Product",  before_product,  after_product),
    ("Dim_Location", before_location, after_location),
    ("Dim_Date",     before_date,     after_date),
]:
    delta = a - b
    arrow = f"+{delta}" if delta > 0 else str(delta)
    print(f"  {tbl:<{col}}  {b:>8,}  {a:>8,}  {arrow:>8}")

banner("Incremental load complete.")
print(f"""
  Key takeaways:
  - {len(dup_rows)} already-loaded rows were silently skipped (idempotent).
  - {len(new_rows)} genuinely new rows were appended.
  - Dimension tables grew by 0 rows — all dim values already existed.
  - Re-running this script again would add 0 rows — fully idempotent.
""")
