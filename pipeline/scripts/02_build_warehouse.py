"""
02_build_warehouse.py
----------------------
Builds a SQLite data warehouse at data/warehouse.db from the cleaned CSV.

Design note
-----------
sql/schema.sql is written for a production RDBMS (PostgreSQL / SQL Server) and
uses syntax unsupported by SQLite (GENERATED ALWAYS AS IDENTITY, COMMENT ON,
SMALLINT / TINYINT, DECIMAL). This script re-expresses the *same logical star
schema* using SQLite-compatible DDL:
  - Surrogate PKs  -> INTEGER PRIMARY KEY AUTOINCREMENT
  - Type names     -> SQLite type affinity equivalents (TEXT, INTEGER, REAL)
  - FK enforcement -> PRAGMA foreign_keys = ON

Loading strategy
----------------
Dimensions are populated with INSERT OR IGNORE on the unique business-key
column so re-runs are idempotent.  Surrogate keys are looked up via a dict
built after each dim load.  Fact_Sales rows are inserted in bulk using
executemany().
"""

import sqlite3
import pandas as pd
from pathlib import Path
import calendar

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR   = Path(__file__).resolve().parent.parent
CSV_PATH   = BASE_DIR / "data" / "cleaned_sales.csv"
DB_PATH    = BASE_DIR / "data" / "warehouse.db"
SCHEMA_REF = BASE_DIR / "sql"   / "schema.sql"   # kept for documentation

# ---------------------------------------------------------------------------
# SQLite-compatible DDL  (mirrors sql/schema.sql logical design)
# ---------------------------------------------------------------------------
SQLITE_DDL = """
PRAGMA foreign_keys = ON;

-- Drop in reverse dependency order so re-runs are safe
DROP TABLE IF EXISTS Fact_Sales;
DROP TABLE IF EXISTS Dim_Date;
DROP TABLE IF EXISTS Dim_Customer;
DROP TABLE IF EXISTS Dim_Product;
DROP TABLE IF EXISTS Dim_Location;

-- -----------------------------------------------------------------------
-- Dim_Date  (natural PK: order_date)
-- -----------------------------------------------------------------------
CREATE TABLE Dim_Date (
    order_date       TEXT    NOT NULL,   -- stored as YYYY-MM-DD
    order_year       INTEGER NOT NULL,
    order_month      INTEGER NOT NULL CHECK (order_month  BETWEEN 1 AND 12),
    order_quarter    INTEGER NOT NULL CHECK (order_quarter BETWEEN 1 AND 4),
    month_name       TEXT    NOT NULL,
    quarter_label    TEXT    NOT NULL,
    PRIMARY KEY (order_date)
);

-- -----------------------------------------------------------------------
-- Dim_Customer  (surrogate PK, unique biz key: customer_id)
-- -----------------------------------------------------------------------
CREATE TABLE Dim_Customer (
    customer_key     INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    customer_id      TEXT    NOT NULL UNIQUE,
    customer_name    TEXT    NOT NULL,
    segment          TEXT    NOT NULL
                             CHECK (segment IN ('Consumer','Corporate','Home Office'))
);

-- -----------------------------------------------------------------------
-- Dim_Product  (surrogate PK, unique biz key: product_id)
-- -----------------------------------------------------------------------
CREATE TABLE Dim_Product (
    product_key      INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    product_id       TEXT    NOT NULL UNIQUE,
    category         TEXT    NOT NULL
                             CHECK (category IN ('Furniture','Office Supplies','Technology')),
    sub_category     TEXT    NOT NULL,
    product_name     TEXT    NOT NULL
);

-- -----------------------------------------------------------------------
-- Dim_Location  (surrogate PK, unique biz key: postal_code)
-- -----------------------------------------------------------------------
CREATE TABLE Dim_Location (
    location_key     INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    postal_code      INTEGER NOT NULL UNIQUE,
    city             TEXT    NOT NULL,
    state            TEXT    NOT NULL,
    region           TEXT    NOT NULL CHECK (region IN ('East','West','Central','South')),
    country          TEXT    NOT NULL DEFAULT 'United States'
);

-- -----------------------------------------------------------------------
-- Fact_Sales  (surrogate PK; FKs to all four dims)
-- -----------------------------------------------------------------------
CREATE TABLE Fact_Sales (
    sale_key         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    order_id         TEXT    NOT NULL,
    product_key      INTEGER NOT NULL REFERENCES Dim_Product  (product_key)
                             ON UPDATE CASCADE ON DELETE RESTRICT,
    customer_key     INTEGER NOT NULL REFERENCES Dim_Customer (customer_key)
                             ON UPDATE CASCADE ON DELETE RESTRICT,
    location_key     INTEGER NOT NULL REFERENCES Dim_Location (location_key)
                             ON UPDATE CASCADE ON DELETE RESTRICT,
    order_date       TEXT    NOT NULL REFERENCES Dim_Date     (order_date)
                             ON UPDATE CASCADE ON DELETE RESTRICT,
    ship_mode        TEXT    NOT NULL
                             CHECK (ship_mode IN ('First Class','Second Class',
                                                  'Standard Class','Same Day')),
    ship_date        TEXT    NOT NULL,
    sales            REAL    NOT NULL CHECK (sales > 0)
);

-- Indexes for common join / filter paths
CREATE INDEX IDX_FactSales_order_date   ON Fact_Sales (order_date);
CREATE INDEX IDX_FactSales_product_key  ON Fact_Sales (product_key);
CREATE INDEX IDX_FactSales_customer_key ON Fact_Sales (customer_key);
CREATE INDEX IDX_FactSales_location_key ON Fact_Sales (location_key);
CREATE INDEX IDX_FactSales_order_id     ON Fact_Sales (order_id);

CREATE INDEX IDX_DimDate_year           ON Dim_Date (order_year);
CREATE INDEX IDX_DimDate_year_quarter   ON Dim_Date (order_year, order_quarter);
CREATE INDEX IDX_DimProduct_category    ON Dim_Product (category);
CREATE INDEX IDX_DimProduct_sub_cat     ON Dim_Product (sub_category);
CREATE INDEX IDX_DimCustomer_segment    ON Dim_Customer (segment);
CREATE INDEX IDX_DimLocation_region     ON Dim_Location (region);
CREATE INDEX IDX_DimLocation_state      ON Dim_Location (state);
"""

# ---------------------------------------------------------------------------
# Helper: print a section header
# ---------------------------------------------------------------------------
def section(title: str) -> None:
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")

def step(n: int, msg: str) -> None:
    print(f"\n[{n}] {msg}")

# ===========================================================================
# MAIN
# ===========================================================================
section("Retail Sales Intelligence - Warehouse Build")
print(f"  Source CSV : {CSV_PATH.name}")
print(f"  Target DB  : {DB_PATH.name}")
print(f"  Schema ref : {SCHEMA_REF.name}")

# ---------------------------------------------------------------------------
# STEP 1 - Create / recreate the SQLite database
# ---------------------------------------------------------------------------
step(1, "Creating SQLite database and star schema")

if DB_PATH.exists():
    DB_PATH.unlink()
    print(f"    Removed existing {DB_PATH.name}")

conn = sqlite3.connect(DB_PATH)
conn.executescript(SQLITE_DDL)
conn.commit()
print(f"    Schema created: 5 tables + indexes")

# ---------------------------------------------------------------------------
# STEP 2 - Load cleaned CSV
# ---------------------------------------------------------------------------
step(2, f"Loading '{CSV_PATH.name}'")

df = pd.read_csv(CSV_PATH, parse_dates=["Order Date", "Ship Date"])
print(f"    Rows loaded : {len(df):,}")
print(f"    Columns     : {df.shape[1]}")

# Normalise date columns to YYYY-MM-DD strings (SQLite TEXT storage)
df["_order_date_str"] = df["Order Date"].dt.strftime("%Y-%m-%d")
df["_ship_date_str"]  = df["Ship Date"].dt.strftime("%Y-%m-%d")

# ---------------------------------------------------------------------------
# STEP 3 - Populate Dim_Date
# ---------------------------------------------------------------------------
step(3, "Populating Dim_Date")

date_dim_rows = (
    df[["_order_date_str", "Order Year", "Order Month", "Order Quarter"]]
    .drop_duplicates(subset=["_order_date_str"])
    .copy()
)
date_dim_rows["month_name"]    = date_dim_rows["Order Month"].apply(
                                     lambda m: calendar.month_name[m])
date_dim_rows["quarter_label"] = date_dim_rows["Order Quarter"].apply(
                                     lambda q: f"Q{q}")

conn.executemany(
    """INSERT OR IGNORE INTO Dim_Date
       (order_date, order_year, order_month, order_quarter, month_name, quarter_label)
       VALUES (?, ?, ?, ?, ?, ?)""",
    date_dim_rows[[
        "_order_date_str", "Order Year", "Order Month",
        "Order Quarter", "month_name", "quarter_label"
    ]].itertuples(index=False, name=None)
)
conn.commit()
dim_date_count = conn.execute("SELECT COUNT(*) FROM Dim_Date").fetchone()[0]
print(f"    Rows inserted : {dim_date_count:,}  (distinct order dates)")

# ---------------------------------------------------------------------------
# STEP 4 - Populate Dim_Customer
# ---------------------------------------------------------------------------
step(4, "Populating Dim_Customer")

customer_rows = (
    df[["Customer ID", "Customer Name", "Segment"]]
    .drop_duplicates(subset=["Customer ID"])
)
conn.executemany(
    """INSERT OR IGNORE INTO Dim_Customer (customer_id, customer_name, segment)
       VALUES (?, ?, ?)""",
    customer_rows.itertuples(index=False, name=None)
)
conn.commit()
dim_customer_count = conn.execute("SELECT COUNT(*) FROM Dim_Customer").fetchone()[0]
print(f"    Rows inserted : {dim_customer_count:,}  (unique customers)")

# ---------------------------------------------------------------------------
# STEP 5 - Populate Dim_Product
# ---------------------------------------------------------------------------
step(5, "Populating Dim_Product")

product_rows = (
    df[["Product ID", "Category", "Sub-Category", "Product Name"]]
    .drop_duplicates(subset=["Product ID"])
)
conn.executemany(
    """INSERT OR IGNORE INTO Dim_Product
       (product_id, category, sub_category, product_name)
       VALUES (?, ?, ?, ?)""",
    product_rows.itertuples(index=False, name=None)
)
conn.commit()
dim_product_count = conn.execute("SELECT COUNT(*) FROM Dim_Product").fetchone()[0]
print(f"    Rows inserted : {dim_product_count:,}  (unique products)")

# ---------------------------------------------------------------------------
# STEP 6 - Populate Dim_Location
# ---------------------------------------------------------------------------
step(6, "Populating Dim_Location")

location_rows = (
    df[["Postal Code", "City", "State", "Region", "Country"]]
    .drop_duplicates(subset=["Postal Code"])
)
conn.executemany(
    """INSERT OR IGNORE INTO Dim_Location
       (postal_code, city, state, region, country)
       VALUES (?, ?, ?, ?, ?)""",
    location_rows.itertuples(index=False, name=None)
)
conn.commit()
dim_location_count = conn.execute("SELECT COUNT(*) FROM Dim_Location").fetchone()[0]
print(f"    Rows inserted : {dim_location_count:,}  (unique postal codes)")

# ---------------------------------------------------------------------------
# STEP 7 - Build surrogate-key lookup dicts  (biz-key -> surrogate)
# ---------------------------------------------------------------------------
step(7, "Building surrogate-key lookup maps from dimension tables")

customer_map  = dict(conn.execute("SELECT customer_id,  customer_key  FROM Dim_Customer").fetchall())
product_map   = dict(conn.execute("SELECT product_id,   product_key   FROM Dim_Product").fetchall())
location_map  = dict(conn.execute("SELECT postal_code,  location_key  FROM Dim_Location").fetchall())
# Dim_Date uses its natural key directly — no lookup dict needed

print(f"    Customers mapped : {len(customer_map):,}")
print(f"    Products mapped  : {len(product_map):,}")
print(f"    Locations mapped : {len(location_map):,}")

# ---------------------------------------------------------------------------
# STEP 8 - Populate Fact_Sales
# ---------------------------------------------------------------------------
step(8, "Populating Fact_Sales")

# Build Fact_Sales rows vectorially — avoids itertuples column-name mangling
# (spaces in column names become underscores, breaking dict access)
df["_product_key"]  = df["Product ID"].map(product_map)
df["_customer_key"] = df["Customer ID"].map(customer_map)
df["_location_key"] = df["Postal Code"].map(location_map)

fact_rows = list(zip(
    df["Order ID"],
    df["_product_key"],
    df["_customer_key"],
    df["_location_key"],
    df["_order_date_str"],
    df["Ship Mode"],
    df["_ship_date_str"],
    df["Sales"],
))

conn.executemany(
    """INSERT INTO Fact_Sales
       (order_id, product_key, customer_key, location_key,
        order_date, ship_mode, ship_date, sales)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
    fact_rows
)
conn.commit()
fact_count = conn.execute("SELECT COUNT(*) FROM Fact_Sales").fetchone()[0]
print(f"    Rows inserted : {fact_count:,}  (order line items)")

# ---------------------------------------------------------------------------
# STEP 9 - Verify FK integrity with a quick spot-check join
# ---------------------------------------------------------------------------
step(9, "Verifying referential integrity (sample join)")

check = conn.execute("""
    SELECT COUNT(*) AS matched_rows
    FROM   Fact_Sales   f
    JOIN   Dim_Product  p ON f.product_key  = p.product_key
    JOIN   Dim_Customer c ON f.customer_key = c.customer_key
    JOIN   Dim_Location l ON f.location_key = l.location_key
    JOIN   Dim_Date     d ON f.order_date   = d.order_date
""").fetchone()[0]
print(f"    Full 4-way join returned : {check:,} rows  (expected: {fact_count:,})")
if check == fact_count:
    print("    All FK references are valid.")
else:
    print("    WARNING: join count mismatch - check for broken FK references!")

# ---------------------------------------------------------------------------
# Final summary
# ---------------------------------------------------------------------------
section("ROW COUNT SUMMARY")
tables = [
    ("Dim_Date",     dim_date_count),
    ("Dim_Customer", dim_customer_count),
    ("Dim_Product",  dim_product_count),
    ("Dim_Location", dim_location_count),
    ("Fact_Sales",   fact_count),
]
col_w = 16
print(f"\n  {'Table':<{col_w}}  Rows")
print(f"  {'-'*col_w}  --------")
for name, count in tables:
    print(f"  {name:<{col_w}}  {count:>8,}")

db_size_kb = DB_PATH.stat().st_size / 1024
print(f"\n  Database file : {DB_PATH.name}  ({db_size_kb:.1f} KB)")
print(f"\n{'=' * 60}")
print("  Done. Warehouse is ready.")
print(f"{'=' * 60}")

conn.close()
