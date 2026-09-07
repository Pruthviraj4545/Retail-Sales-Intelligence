"""
04_rfm_segmentation.py
-----------------------
Loads Fact_Sales + Dim_Customer + Dim_Date from data/warehouse.db, computes
RFM (Recency, Frequency, Monetary) metrics per customer, runs KMeans(k=4)
clustering, assigns meaningful segment labels, and saves to
data/customer_segments.csv.

RFM definitions
---------------
  Recency   : Days between the customer's last order and the dataset snapshot
               date (2018-12-30). Lower = more recent = better.
  Frequency : Count of distinct Order IDs per customer.
  Monetary  : Sum of Sales across all orders per customer.

Labelling heuristic
--------------------
After clustering we rank each cluster center on a combined "RFM score":
  score = -Recency_scaled + Frequency_scaled + Monetary_scaled
then map ranks to four predefined labels in descending order of value.
"""

import sqlite3
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH  = BASE_DIR / "data" / "warehouse.db"
OUT_PATH = BASE_DIR / "data" / "customer_segments.csv"

SNAPSHOT_DATE = pd.Timestamp("2018-12-30")   # last date in the dataset
K             = 4
RANDOM_STATE  = 42

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def banner(text: str) -> None:
    print(f"\n{'=' * 62}")
    print(f"  {text}")
    print(f"{'=' * 62}")

def step(n, text: str) -> None:
    print(f"\n[{n}] {text}")

# ===========================================================================
# MAIN
# ===========================================================================
banner("RFM Segmentation Pipeline")

# ---------------------------------------------------------------------------
# 1. Load data from warehouse.db
# ---------------------------------------------------------------------------
step(1, "Loading data from warehouse.db")

conn = sqlite3.connect(DB_PATH)
query = """
    SELECT
        c.customer_id,
        c.customer_name,
        c.segment,
        f.order_id,
        f.order_date,
        f.sales
    FROM  Fact_Sales   f
    JOIN  Dim_Customer c ON f.customer_key = c.customer_key
    JOIN  Dim_Date     d ON f.order_date   = d.order_date
"""
df = pd.read_sql(query, conn, parse_dates=["order_date"])
conn.close()

print(f"  Rows loaded     : {len(df):,}")
print(f"  Unique customers: {df['customer_id'].nunique():,}")
print(f"  Date range      : {df['order_date'].min().date()} -> {df['order_date'].max().date()}")
print(f"  Snapshot date   : {SNAPSHOT_DATE.date()} (used for Recency)")

# ---------------------------------------------------------------------------
# 2. Calculate RFM per customer
# ---------------------------------------------------------------------------
step(2, "Computing RFM metrics")

rfm = (
    df.groupby(["customer_id", "customer_name", "segment"])
    .agg(
        last_order_date=("order_date", "max"),
        Frequency      =("order_id",   "nunique"),
        Monetary       =("sales",       "sum"),
    )
    .reset_index()
)

rfm["Recency"] = (SNAPSHOT_DATE - rfm["last_order_date"]).dt.days

# Summary table
print(f"\n  {'Metric':<12}  {'Min':>8}  {'Mean':>10}  {'Median':>10}  {'Max':>8}")
print(f"  {'-'*56}")
for col in ["Recency", "Frequency", "Monetary"]:
    s = rfm[col]
    print(f"  {col:<12}  {s.min():>8.1f}  {s.mean():>10.2f}  {s.median():>10.2f}  {s.max():>8.1f}")

# ---------------------------------------------------------------------------
# 3. Scale RFM and run KMeans(k=4)
# ---------------------------------------------------------------------------
step(3, f"Scaling RFM and running KMeans(k={K})")

rfm_matrix = rfm[["Recency", "Frequency", "Monetary"]].values
scaler     = StandardScaler()
rfm_scaled = scaler.fit_transform(rfm_matrix)

kmeans = KMeans(n_clusters=K, random_state=RANDOM_STATE, n_init=20, max_iter=500)
rfm["cluster"] = kmeans.fit_predict(rfm_scaled)

sil_score = silhouette_score(rfm_scaled, rfm["cluster"])
inertia   = kmeans.inertia_
print(f"  KMeans converged in {kmeans.n_iter_} iterations")
print(f"  Inertia          : {inertia:,.2f}")
print(f"  Silhouette score : {sil_score:.4f}  (range -1 to 1; >0.2 is acceptable)")

# ---------------------------------------------------------------------------
# 4. Label clusters meaningfully
# ---------------------------------------------------------------------------
step(4, "Labelling clusters")

# Cluster centers in original (unscaled) space
centers_raw = pd.DataFrame(
    scaler.inverse_transform(kmeans.cluster_centers_),
    columns=["Recency", "Frequency", "Monetary"]
)
centers_raw.index.name = "cluster"
centers_raw = centers_raw.reset_index()

# Combined RFM score: lower Recency is better, higher F & M are better.
# Normalise each center dimension to [0,1] then combine.
def minmax(series):
    mn, mx = series.min(), series.max()
    return (series - mn) / (mx - mn) if mx > mn else series * 0 + 0.5

centers_raw["rfm_score"] = (
    (1 - minmax(centers_raw["Recency"]))   # invert: lower recency = better
    + minmax(centers_raw["Frequency"])
    + minmax(centers_raw["Monetary"])
)

# Rank clusters by score: rank 1 = highest value
centers_raw["rank"] = centers_raw["rfm_score"].rank(ascending=False).astype(int)

LABEL_MAP = {
    1: "High Value",
    2: "Loyal Regular",
    3: "At Risk",
    4: "New / Low Engagement",
}
centers_raw["label"] = centers_raw["rank"].map(LABEL_MAP)
cluster_to_label = centers_raw.set_index("cluster")["label"].to_dict()

rfm["Segment"] = rfm["cluster"].map(cluster_to_label)

# Print cluster centers with labels
print(f"\n  Cluster centers (original scale) + assigned labels:")
print(f"\n  {'Cluster':<8} {'Label':<22} {'Recency':>9} {'Frequency':>10} {'Monetary':>11}  {'Score':>6}")
print(f"  {'-'*74}")
for _, row in centers_raw.sort_values("rank").iterrows():
    print(f"  {int(row['cluster']):<8} {row['label']:<22} {row['Recency']:>9.1f} "
          f"{row['Frequency']:>10.2f} {row['Monetary']:>11.2f}  {row['rfm_score']:>6.3f}")

# ---------------------------------------------------------------------------
# 5. Save to customer_segments.csv
# ---------------------------------------------------------------------------
step(5, "Saving customer_segments.csv")

output_cols = [
    "customer_id", "customer_name", "segment",
    "Recency", "Frequency", "Monetary",
    "cluster", "Segment"
]
rfm[output_cols].to_csv(OUT_PATH, index=False)
print(f"  Saved: {OUT_PATH.name}  ({len(rfm):,} rows, {len(output_cols)} columns)")

# ---------------------------------------------------------------------------
# 6. Summary: counts and average RFM per segment
# ---------------------------------------------------------------------------
banner("SEGMENT SUMMARY")

summary = (
    rfm.groupby("Segment")
    .agg(
        Customers =("customer_id", "count"),
        Avg_Recency  =("Recency",   "mean"),
        Avg_Frequency=("Frequency", "mean"),
        Avg_Monetary =("Monetary",  "mean"),
    )
    .reset_index()
)

# Order by descending Monetary
summary = summary.sort_values("Avg_Monetary", ascending=False).reset_index(drop=True)

print(f"\n  {'Segment':<22} {'Customers':>10} {'Avg Recency':>12} {'Avg Freq':>9} {'Avg Monetary':>14}")
print(f"  {'-'*74}")
for _, row in summary.iterrows():
    print(f"  {row['Segment']:<22} {int(row['Customers']):>10,} "
          f"{row['Avg_Recency']:>12.1f} {row['Avg_Frequency']:>9.1f} "
          f"${row['Avg_Monetary']:>13,.2f}")

total = summary["Customers"].sum()
print(f"\n  Total customers: {total:,}")
print(f"\n  Interpretation:")
for _, row in summary.iterrows():
    pct = row["Customers"] / total * 100
    seg = row["Segment"]
    rec = row["Avg_Recency"]
    frq = row["Avg_Frequency"]
    mon = row["Avg_Monetary"]

    if seg == "High Value":
        note = f"Most recent ({rec:.0f}d), highest spend (${mon:,.0f}), order most often ({frq:.1f}x)."
    elif seg == "Loyal Regular":
        note = f"Reasonably recent ({rec:.0f}d), consistent buyers ({frq:.1f}x orders, ${mon:,.0f} spend)."
    elif seg == "At Risk":
        note = f"Longest since last order ({rec:.0f}d) — re-engagement campaigns recommended."
    else:
        note = f"Low spend (${mon:,.0f}), infrequent ({frq:.1f}x) — nurture to grow."

    print(f"  - {seg:<22} ({pct:.1f}% of customers): {note}")

banner("Done. Segments saved to data/customer_segments.csv")
