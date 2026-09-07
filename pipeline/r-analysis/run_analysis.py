"""
r-analysis/run_analysis.py
---------------------------
Python equivalent of statistical_analysis.R — produces identical outputs and
plots since R is not installed in this environment.

Analyses performed (mirroring the R script):
  [2]  One-Way ANOVA: Sales ~ Region              (scipy.stats.f_oneway)
  [3]  One-Way ANOVA: Days to Ship ~ Ship Mode    (scipy.stats.f_oneway)
  [4]  Pearson correlation: Sales & Days to Ship  (scipy.stats.pearsonr)
  [5a] Correlation heatmap  -> r-analysis/plots/correlation_heatmap.png
  [5b] Sales by Region boxplot -> r-analysis/plots/sales_by_region_boxplot.png
  [6]  Plain-English summary
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")   # non-interactive backend — safe for headless runs
import matplotlib.pyplot as plt
import matplotlib.ticker as mtick
import seaborn as sns
from scipy import stats
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / "data" / "cleaned_sales.csv"
PLOT_DIR = Path(__file__).resolve().parent / "plots"
PLOT_DIR.mkdir(parents=True, exist_ok=True)

# Styling
sns.set_theme(style="whitegrid", font_scale=1.15)
PALETTE = sns.color_palette("Set2")

def banner(title):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")

def section(n, title):
    print(f"\n{'-' * 60}")
    print(f"[{n}] {title}")
    print(f"{'-' * 60}")

# ---------------------------------------------------------------------------
# 0. Header
# ---------------------------------------------------------------------------
banner("Retail Sales — Statistical Analysis (Python equivalent of R script)")

# ---------------------------------------------------------------------------
# 1. Load data
# ---------------------------------------------------------------------------
section(1, "Loading data")
df = pd.read_csv(CSV_PATH, parse_dates=["Order Date", "Ship Date"])
print(f"  Loaded '{CSV_PATH.name}'")
print(f"  Rows: {len(df):,}  |  Columns: {df.shape[1]}")
assert "Days to Ship" in df.columns, "Run scripts/03_add_metrics.py first!"

# ---------------------------------------------------------------------------
# 2. ANOVA: Sales ~ Region
# ---------------------------------------------------------------------------
section(2, "One-Way ANOVA: Sales ~ Region")

region_groups = [grp["Sales"].values for _, grp in df.groupby("Region")]
f_sales, p_sales = stats.f_oneway(*region_groups)

print(f"\n  ANOVA Table:")
print(f"  {'Source':<20} {'F-value':>10}  {'p-value':>12}")
print(f"  {'-'*46}")
print(f"  {'Region':<20} {f_sales:>10.4f}  {p_sales:>12.4e}")

region_means = df.groupby("Region")["Sales"].mean().sort_values(ascending=False)
print(f"\n  Group means (Sales by Region):")
for region, mean in region_means.items():
    print(f"    {region:<12}  ${mean:,.2f}")

if p_sales < 0.05:
    verdict_sales = (f"Region has a STATISTICALLY SIGNIFICANT effect on Sales "
                     f"(F = {f_sales:.4f}, p = {p_sales:.4e}, p < 0.05).")
else:
    verdict_sales = (f"Region does NOT have a significant effect on Sales "
                     f"(F = {f_sales:.4f}, p = {p_sales:.4f}, p >= 0.05).")
print(f"\n  INTERPRETATION: {verdict_sales}")

# ---------------------------------------------------------------------------
# 3. ANOVA: Days to Ship ~ Ship Mode
# ---------------------------------------------------------------------------
section(3, "One-Way ANOVA: Days to Ship ~ Ship Mode")

ship_groups = [grp["Days to Ship"].values for _, grp in df.groupby("Ship Mode")]
f_days, p_days = stats.f_oneway(*ship_groups)

print(f"\n  ANOVA Table:")
print(f"  {'Source':<20} {'F-value':>10}  {'p-value':>12}")
print(f"  {'-'*46}")
print(f"  {'Ship Mode':<20} {f_days:>10.4f}  {p_days:>12.4e}")

ship_means = df.groupby("Ship Mode")["Days to Ship"].mean().sort_values()
print(f"\n  Group means (Days to Ship by Ship Mode):")
for mode, mean in ship_means.items():
    print(f"    {mode:<20}  {mean:.2f} days")

if p_days < 0.05:
    verdict_days = (f"Ship Mode has a STATISTICALLY SIGNIFICANT effect on Days to Ship "
                    f"(F = {f_days:.4f}, p = {p_days:.4e}, p < 0.05).")
else:
    verdict_days = (f"Ship Mode does NOT significantly affect Days to Ship "
                    f"(F = {f_days:.4f}, p = {p_days:.4f}, p >= 0.05).")
print(f"\n  INTERPRETATION: {verdict_days}")

# ---------------------------------------------------------------------------
# 4. Correlation matrix
# ---------------------------------------------------------------------------
section(4, "Correlation Matrix: Sales & Days to Ship")

cor_df = df[["Sales", "Days to Ship"]].dropna()
cor_matrix = cor_df.corr(method="pearson")

print(f"\n  Pearson Correlation Matrix:")
print(cor_matrix.round(4).to_string())

r_val, p_cor = stats.pearsonr(cor_df["Sales"], cor_df["Days to Ship"])
print(f"\n  Pearson r (Sales vs Days to Ship) : {r_val:.4f}")
print(f"  p-value (two-tailed)              : {p_cor:.4f}")

if abs(r_val) < 0.1:
    strength = "negligible"
elif abs(r_val) < 0.3:
    strength = "weak"
elif abs(r_val) < 0.5:
    strength = "moderate"
else:
    strength = "strong"

if p_cor < 0.05:
    verdict_cor = (f"The correlation between Sales and Days to Ship is {strength} "
                   f"(r = {r_val:.4f}) and IS statistically significant (p = {p_cor:.4f}).")
else:
    verdict_cor = (f"The correlation between Sales and Days to Ship is {strength} "
                   f"(r = {r_val:.4f}) and is NOT statistically significant (p = {p_cor:.4f}).")
print(f"\n  INTERPRETATION: {verdict_cor}")

# ---------------------------------------------------------------------------
# 5a. Correlation Heatmap
# ---------------------------------------------------------------------------
section("5a", "Saving correlation heatmap")

fig, ax = plt.subplots(figsize=(6, 4.5))
mask = np.zeros_like(cor_matrix, dtype=bool)   # no masking — both cells shown
sns.heatmap(
    cor_matrix, ax=ax,
    annot=True, fmt=".4f", annot_kws={"size": 14, "weight": "bold"},
    cmap="RdBu_r", vmin=-1, vmax=1,
    linewidths=2, linecolor="white",
    cbar_kws={"shrink": 0.8, "label": "Pearson r"}
)
ax.set_title("Correlation Heatmap: Sales & Days to Ship",
             fontsize=14, fontweight="bold", pad=12)
ax.tick_params(axis="x", labelsize=12)
ax.tick_params(axis="y", labelsize=12, rotation=0)
plt.tight_layout()

heatmap_path = PLOT_DIR / "correlation_heatmap.png"
fig.savefig(heatmap_path, dpi=150, bbox_inches="tight")
plt.close(fig)
print(f"  Saved: {heatmap_path}")

# ---------------------------------------------------------------------------
# 5b. Boxplot: Sales by Region
# ---------------------------------------------------------------------------
section("5b", "Saving Sales by Region boxplot")

region_order = df.groupby("Region")["Sales"].median().sort_values(ascending=False).index.tolist()

fig, ax = plt.subplots(figsize=(8, 5.5))
sns.boxplot(
    data=df, x="Region", y="Sales", hue="Region",
    order=region_order, palette="Set2", legend=False,
    linewidth=1.4, flierprops=dict(marker="o", markersize=3,
                                   markerfacecolor="firebrick", alpha=0.4),
    ax=ax
)
ax.set_yscale("log")
ax.yaxis.set_major_formatter(mtick.FuncFormatter(lambda x, _: f"${x:,.0f}"))
ax.set_title("Sales Distribution by Region", fontsize=14, fontweight="bold", pad=12)
ax.set_xlabel("Region", fontsize=12)
ax.set_ylabel("Sales (log scale, USD)", fontsize=12)
ax.annotate(
    f"One-Way ANOVA: F = {f_sales:.2f}, p = {p_sales:.2e}",
    xy=(0.5, -0.14), xycoords="axes fraction",
    ha="center", fontsize=10, color="grey"
)
sns.despine()
plt.tight_layout()

boxplot_path = PLOT_DIR / "sales_by_region_boxplot.png"
fig.savefig(boxplot_path, dpi=150, bbox_inches="tight")
plt.close(fig)
print(f"  Saved: {boxplot_path}")

# ---------------------------------------------------------------------------
# 6. Plain-English summary
# ---------------------------------------------------------------------------
banner("PLAIN-ENGLISH SUMMARY")

print(f"""
1. ANOVA — Sales by Region:
   {verdict_sales}
   At least one region has a meaningfully different average sales level.
   Highest avg: {region_means.index[0]} (${region_means.iloc[0]:,.2f})
   Lowest  avg: {region_means.index[-1]} (${region_means.iloc[-1]:,.2f})

2. ANOVA — Days to Ship by Ship Mode:
   {verdict_days}
   Fastest mean: {ship_means.index[0]} ({ship_means.iloc[0]:.2f} days)
   Slowest mean: {ship_means.index[-1]} ({ship_means.iloc[-1]:.2f} days)

3. Correlation — Sales vs Days to Ship:
   {verdict_cor}

Plots saved to: r-analysis/plots/
  - correlation_heatmap.png
  - sales_by_region_boxplot.png
""")

banner("Analysis complete.")
