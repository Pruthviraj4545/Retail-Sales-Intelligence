"""
01_clean_data.py
----------------
Cleans the raw Superstore sales CSV (data/train.csv) and saves the result to
data/cleaned_sales.csv.

Steps performed:
  1. Load raw CSV with Pandas.
  2. Convert 'Order Date' and 'Ship Date' to datetime (format DD/MM/YYYY).
  3. Fill missing 'Postal Code' values with 0 (cast to int).
  4. Remove exact duplicate rows.
  5. Add derived columns: Order Year, Order Month, Order Quarter.
  6. Save cleaned data to data/cleaned_sales.csv.
  7. Print a summary report.
"""

import pandas as pd
from pathlib import Path

# -- Paths ---------------------------------------------------------------------
BASE_DIR    = Path(__file__).resolve().parent.parent
INPUT_PATH  = BASE_DIR / "data" / "train.csv"
OUTPUT_PATH = BASE_DIR / "data" / "cleaned_sales.csv"

# -- 1. Load raw CSV -----------------------------------------------------------
print("=" * 60)
print("  Superstore Sales Data - Cleaning Pipeline")
print("=" * 60)

df_raw = pd.read_csv(INPUT_PATH)
rows_before = len(df_raw)
print(f"\n[1] Loaded '{INPUT_PATH.name}'")
print(f"    Rows   : {rows_before:,}")
print(f"    Columns: {df_raw.shape[1]}")

# -- 2. Convert date columns ---------------------------------------------------
DATE_FORMAT = "%d/%m/%Y"
date_cols = ["Order Date", "Ship Date"]

for col in date_cols:
    df_raw[col] = pd.to_datetime(df_raw[col], format=DATE_FORMAT)

print(f"\n[2] Date columns converted ({', '.join(date_cols)}) -> datetime64[ns]")
print(f"    Order Date range : {df_raw['Order Date'].min().date()} -> {df_raw['Order Date'].max().date()}")
print(f"    Ship Date range  : {df_raw['Ship Date'].min().date()} -> {df_raw['Ship Date'].max().date()}")

# -- 3. Fill missing Postal Codes ----------------------------------------------
nulls_before = df_raw["Postal Code"].isna().sum()
df_raw["Postal Code"] = df_raw["Postal Code"].fillna(0).astype(int)
nulls_after  = df_raw["Postal Code"].isna().sum()

print(f"\n[3] 'Postal Code' null handling")
print(f"    Nulls before : {nulls_before:,}")
print(f"    Nulls after  : {nulls_after:,}  (filled with 0)")

# -- 4. Remove exact duplicates ------------------------------------------------
dupes_count = df_raw.duplicated().sum()
df_clean = df_raw.drop_duplicates().reset_index(drop=True)
rows_after = len(df_clean)

print(f"\n[4] Duplicate removal")
print(f"    Exact duplicates found   : {dupes_count:,}")
print(f"    Rows after deduplication : {rows_after:,}")

# -- 5. Add derived date columns -----------------------------------------------
df_clean["Order Year"]    = df_clean["Order Date"].dt.year
df_clean["Order Month"]   = df_clean["Order Date"].dt.month
df_clean["Order Quarter"] = df_clean["Order Date"].dt.quarter

print(f"\n[5] Derived columns added: 'Order Year', 'Order Month', 'Order Quarter'")
print(f"    Years present    : {sorted(df_clean['Order Year'].unique())}")
print(f"    Quarters present : {sorted(df_clean['Order Quarter'].unique())}")

# -- 6. Save cleaned CSV -------------------------------------------------------
df_clean.to_csv(OUTPUT_PATH, index=False)
print(f"\n[6] Cleaned data saved -> '{OUTPUT_PATH}'")

# -- 7. Summary report ---------------------------------------------------------
print("\n" + "=" * 60)
print("  SUMMARY")
print("=" * 60)
print(f"  Rows before cleaning : {rows_before:,}")
print(f"  Duplicates removed   : {dupes_count:,}")
print(f"  Nulls filled (PC)    : {nulls_before:,}")
print(f"  Rows after cleaning  : {rows_after:,}")
print(f"  New derived columns  : Order Year, Order Month, Order Quarter")
print(f"  Output file          : {OUTPUT_PATH.name}")

# Final null check across all columns
remaining_nulls = df_clean.isnull().sum()
remaining_nulls = remaining_nulls[remaining_nulls > 0]
if remaining_nulls.empty:
    print(f"\n  No remaining nulls in cleaned dataset.")
else:
    print(f"\n  Remaining nulls per column:")
    for col, cnt in remaining_nulls.items():
        print(f"    {col}: {cnt:,}")

print("=" * 60)
print("  Done.")
print("=" * 60)
