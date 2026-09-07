"""
08_export_powerbi.py
--------------------
Exports the warehouse tables and RFM customer segments as Power BI-ready CSVs.
"""

import sqlite3
from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "warehouse.db"
SEGMENTS_PATH = BASE_DIR / "data" / "customer_segments.csv"
OUTPUT_DIR = BASE_DIR.parent / "powerbi" / "data"


TABLES = [
    "Fact_Sales",
    "Dim_Date",
    "Dim_Customer",
    "Dim_Product",
    "Dim_Location",
]


def main() -> None:
    if not DB_PATH.exists():
        raise FileNotFoundError(
            f"Missing {DB_PATH}. Run 01_clean_data.py and 02_build_warehouse.py first."
        )

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as connection:
        for table_name in TABLES:
            table = pd.read_sql_query(f'SELECT * FROM "{table_name}"', connection)
            output_path = OUTPUT_DIR / f"{table_name}.csv"
            table.to_csv(output_path, index=False)
            print(f"Exported {table_name}: {len(table):,} rows -> {output_path}")

    if SEGMENTS_PATH.exists():
        segments = pd.read_csv(SEGMENTS_PATH)
        segments.to_csv(OUTPUT_DIR / "Customer_Segments.csv", index=False)
        print(f"Exported Customer_Segments: {len(segments):,} rows")
    else:
        print(f"Skipped missing optional file: {SEGMENTS_PATH}")


if __name__ == "__main__":
    main()