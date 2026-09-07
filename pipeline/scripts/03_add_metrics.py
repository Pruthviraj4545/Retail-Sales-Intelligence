"""
03_add_metrics.py
-----------------
Adds the derived column "Days to Ship" to data/cleaned_sales.csv and re-saves.

  Days to Ship = Ship Date - Order Date  (integer number of days)
"""

import pandas as pd
from pathlib import Path

BASE_DIR   = Path(__file__).resolve().parent.parent
CSV_PATH   = BASE_DIR / "data" / "cleaned_sales.csv"

print("=" * 55)
print("  Adding Derived Metric: Days to Ship")
print("=" * 55)

df = pd.read_csv(CSV_PATH, parse_dates=["Order Date", "Ship Date"])
print(f"\n  Loaded : {len(df):,} rows from {CSV_PATH.name}")

# Guard: skip if column already exists (idempotent)
if "Days to Ship" in df.columns:
    print("  'Days to Ship' column already present — recalculating.")

df["Days to Ship"] = (df["Ship Date"] - df["Order Date"]).dt.days

print(f"\n  Days to Ship stats:")
print(f"    Min  : {df['Days to Ship'].min()} days")
print(f"    Max  : {df['Days to Ship'].max()} days")
print(f"    Mean : {df['Days to Ship'].mean():.2f} days")
print(f"    Nulls: {df['Days to Ship'].isna().sum()}")

df.to_csv(CSV_PATH, index=False)
print(f"\n  Re-saved: {CSV_PATH.name}  ({df.shape[1]} columns now)")
print("=" * 55)
print("  Done.")
print("=" * 55)
