"""
05_forecast_sales.py
---------------------
Forecasts next-quarter (Jan–Mar 2019) monthly sales using a classical
decomposition model built entirely from numpy/scipy/matplotlib (no Prophet
or statsmodels required).

Decomposition approach
----------------------
  Sales(t) = Trend(t) * Seasonal(m)   [multiplicative model]

  1. Trend  : ordinary least-squares linear fit on the 48 monthly totals.
  2. Seasonal: for each calendar month (1-12) compute the mean of
               (actual / trend_fitted) ratios — "ratio-to-trend" factors.
  3. Forecast: project trend to months 49-51, then multiply by the
               matching seasonal factors.

This is equivalent to what most simple BI tools call "linear trend with
seasonality" and mirrors the SES + seasonal indices approach.
"""

import sqlite3
import calendar
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mtick
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR  = Path(__file__).resolve().parent.parent
DB_PATH   = BASE_DIR / "data"    / "warehouse.db"
PLOT_PATH = BASE_DIR / "scripts" / "plots" / "sales_forecast.png"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def banner(t): print(f"\n{'='*62}\n  {t}\n{'='*62}")
def step(n, t): print(f"\n[{n}] {t}")

# ===========================================================================
# MAIN
# ===========================================================================
banner("Sales Forecast — Linear Trend + Monthly Seasonality")

# ---------------------------------------------------------------------------
# 1. Load monthly aggregated sales from warehouse.db
# ---------------------------------------------------------------------------
step(1, "Loading data from warehouse.db")

conn = sqlite3.connect(DB_PATH)
df   = pd.read_sql(
    """SELECT f.order_date, f.sales
       FROM   Fact_Sales f
       JOIN   Dim_Date   d ON f.order_date = d.order_date""",
    conn
)
conn.close()

df["order_date"] = pd.to_datetime(df["order_date"])
df["period"]     = df["order_date"].dt.to_period("M")

monthly = (
    df.groupby("period")["sales"]
    .sum()
    .reset_index()
    .sort_values("period")
    .reset_index(drop=True)
)
monthly["t"]          = np.arange(1, len(monthly) + 1)           # 1-based index
monthly["month"]      = monthly["period"].dt.month
monthly["year"]       = monthly["period"].dt.year
monthly["period_str"] = monthly["period"].astype(str)

n = len(monthly)
print(f"  Monthly periods: {n}  ({monthly['period_str'].iloc[0]} -> {monthly['period_str'].iloc[-1]})")

# ---------------------------------------------------------------------------
# 2. Fit linear trend via OLS
# ---------------------------------------------------------------------------
step(2, "Fitting OLS linear trend")

t_arr = monthly["t"].values
y_arr = monthly["sales"].values

coeffs        = np.polyfit(t_arr, y_arr, deg=1)   # [slope, intercept]
slope, intercept = coeffs
trend_fitted  = np.polyval(coeffs, t_arr)
monthly["trend"] = trend_fitted

print(f"  Slope     : {slope:+,.2f} $/month  ({'rising' if slope>0 else 'falling'} trend)")
print(f"  Intercept : {intercept:,.2f}")

# R² goodness of fit
ss_res = np.sum((y_arr - trend_fitted) ** 2)
ss_tot = np.sum((y_arr - y_arr.mean()) ** 2)
r2     = 1 - ss_res / ss_tot
print(f"  R²        : {r2:.4f}")

# ---------------------------------------------------------------------------
# 3. Compute monthly seasonal indices
# ---------------------------------------------------------------------------
step(3, "Computing seasonal indices (ratio-to-trend)")

monthly["ratio"] = monthly["sales"] / monthly["trend"]

# Average ratio per calendar month across all available years
seasonal_idx = (
    monthly.groupby("month")["ratio"]
    .mean()
    .rename("seasonal_idx")
    .reset_index()
)
# Re-scale so the 12 factors average to 1.0 (sum = 12)
scale             = 12 / seasonal_idx["seasonal_idx"].sum()
seasonal_idx["seasonal_idx"] *= scale

print("\n  Seasonal indices (1.0 = average month):")
for _, row in seasonal_idx.iterrows():
    bar = "#" * int(round(row["seasonal_idx"] * 20))
    print(f"  {calendar.month_abbr[int(row['month'])]:>3}  {row['seasonal_idx']:.4f}  {bar}")

# ---------------------------------------------------------------------------
# 4. Forecast Jan–Mar 2019 (months 49, 50, 51)
# ---------------------------------------------------------------------------
step(4, "Generating Q1-2019 forecast (Jan / Feb / Mar)")

forecast_months = [
    {"t": 49, "month": 1, "period_str": "2019-01"},
    {"t": 50, "month": 2, "period_str": "2019-02"},
    {"t": 51, "month": 3, "period_str": "2019-03"},
]

si_dict = seasonal_idx.set_index("month")["seasonal_idx"].to_dict()

forecast = []
for fm in forecast_months:
    trend_val    = np.polyval(coeffs, fm["t"])
    seasonal_val = si_dict[fm["month"]]
    forecast_val = trend_val * seasonal_val
    forecast.append({
        "period_str": fm["period_str"],
        "month":      fm["month"],
        "trend":      trend_val,
        "seasonal":   seasonal_val,
        "forecast":   forecast_val,
    })

fc_df = pd.DataFrame(forecast)

print(f"\n  {'Month':<10}  {'Trend ($)':>12}  {'Seas. Idx':>10}  {'Forecast ($)':>14}")
print(f"  {'-'*52}")
for _, r in fc_df.iterrows():
    print(f"  {r['period_str']:<10}  {r['trend']:>12,.2f}  {r['seasonal']:>10.4f}  {r['forecast']:>14,.2f}")

total_q = fc_df["forecast"].sum()
print(f"\n  Forecast Q1-2019 total : ${total_q:,.2f}")

# ---------------------------------------------------------------------------
# 5. Plot historical vs forecast
# ---------------------------------------------------------------------------
step(5, "Generating forecast chart")

# Colour palette (matches warehouse project theme)
C_HIST   = "#4FA8A0"   # teal — historical actuals
C_TREND  = "#8A94A6"   # muted grey — fitted trend
C_FC     = "#E8A33D"   # amber — forecast
C_SHADE  = "#E8A33D"   # amber — CI band
BG       = "#12161C"
SURFACE  = "#1B212B"
TEXT     = "#EDEEF0"
MUTED    = "#8A94A6"
LINE     = "#2C3542"

fig, ax = plt.subplots(figsize=(13, 5.5))
fig.patch.set_facecolor(BG)
ax.set_facecolor(SURFACE)

# Historical actuals
ax.plot(
    monthly["period_str"], monthly["sales"],
    color=C_HIST, linewidth=2, marker="o", markersize=3.5,
    label="Historical sales", zorder=3
)

# Fitted trend line (historical portion)
ax.plot(
    monthly["period_str"], monthly["trend"],
    color=C_TREND, linewidth=1.2, linestyle="--",
    label="OLS trend", zorder=2, alpha=0.7
)

# Bridge connector — last historical → first forecast
bridge_x = [monthly["period_str"].iloc[-1], fc_df["period_str"].iloc[0]]
bridge_y = [monthly["sales"].iloc[-1], fc_df["forecast"].iloc[0]]
ax.plot(bridge_x, bridge_y, color=C_FC, linewidth=1.5, linestyle=":", alpha=0.6, zorder=2)

# Forecast line
ax.plot(
    fc_df["period_str"], fc_df["forecast"],
    color=C_FC, linewidth=2.5, marker="D", markersize=6,
    label="Q1-2019 forecast", zorder=4
)

# ±15 % confidence band around forecast
ci_pct = 0.15
for _, r in fc_df.iterrows():
    ax.errorbar(
        r["period_str"], r["forecast"],
        yerr=r["forecast"] * ci_pct,
        fmt="none", ecolor=C_SHADE, elinewidth=1.5, capsize=4, alpha=0.55, zorder=3
    )

# Vertical divider
ax.axvline(x=monthly["period_str"].iloc[-1], color=LINE, linewidth=1.2,
           linestyle="--", alpha=0.8)
ax.text(monthly["period_str"].iloc[-1], ax.get_ylim()[1] if ax.get_ylim()[1] > 0 else 1,
        " ◄ Actual   Forecast ►", color=MUTED, fontsize=8, va="top")

# Annotate forecast values
for _, r in fc_df.iterrows():
    ax.annotate(
        f"${r['forecast']:,.0f}",
        xy=(r["period_str"], r["forecast"]),
        xytext=(0, 14), textcoords="offset points",
        ha="center", fontsize=9, color=C_FC, fontweight="bold"
    )

# Tick formatting
ax.yaxis.set_major_formatter(mtick.FuncFormatter(lambda x, _: f"${x/1000:.0f}K"))
x_labels = monthly["period_str"].tolist()
visible  = [l if i % 6 == 0 or i == len(x_labels)-1 else "" for i, l in enumerate(x_labels)]
visible += fc_df["period_str"].tolist()
all_x    = monthly["period_str"].tolist() + fc_df["period_str"].tolist()
ax.set_xticks(all_x)
ax.set_xticklabels(
    [l if l in [monthly["period_str"].tolist()[i] for i in range(0, n, 6)] + fc_df["period_str"].tolist() else ""
     for l in all_x],
    rotation=30, ha="right", fontsize=9
)
ax.tick_params(colors=MUTED)
for spine in ax.spines.values():
    spine.set_edgecolor(LINE)
ax.yaxis.label.set_color(MUTED)
ax.xaxis.label.set_color(MUTED)
ax.grid(axis="y", color=LINE, linewidth=0.7, alpha=0.6)
ax.grid(axis="x", visible=False)

# Legend + title
legend = ax.legend(
    facecolor=SURFACE, edgecolor=LINE, labelcolor=TEXT,
    fontsize=9, loc="upper left"
)
ax.set_title(
    "Monthly Sales: 2015–2018 Actuals + Q1-2019 Forecast",
    fontsize=13, fontweight="bold", color=TEXT, pad=14
)
ax.set_xlabel("Month", fontsize=10, color=MUTED, labelpad=6)
ax.set_ylabel("Total Sales", fontsize=10, color=MUTED, labelpad=6)

plt.tight_layout()
fig.savefig(PLOT_PATH, dpi=150, bbox_inches="tight", facecolor=BG)
plt.close(fig)
print(f"  Plot saved -> {PLOT_PATH.relative_to(BASE_DIR)}")

# ---------------------------------------------------------------------------
# 6. Plain-English trend summary
# ---------------------------------------------------------------------------
step(6, "Trend summary")

# Determine seasonality character
peak_month = seasonal_idx.loc[seasonal_idx["seasonal_idx"].idxmax(), "month"]
trough_month = seasonal_idx.loc[seasonal_idx["seasonal_idx"].idxmin(), "month"]

trend_word = "rising" if slope > 0 else "falling"
peak_name  = calendar.month_name[int(peak_month)]
trough_name = calendar.month_name[int(trough_month)]

# Q4 check (Oct/Nov/Dec are months 10-12)
q4_avg = seasonal_idx[seasonal_idx["month"].isin([10,11,12])]["seasonal_idx"].mean()
q4_note = " peaking in Q4 (Nov is highest)" if q4_avg > 1.15 else ""

summary = (
    f"Sales show a {trend_word} trend (+${slope:,.0f}/month) with strong monthly seasonality — "
    f"peak in {peak_name} (index {seasonal_idx.loc[seasonal_idx['seasonal_idx'].idxmax(),'seasonal_idx']:.2f}x), "
    f"trough in {trough_name} (index {seasonal_idx.loc[seasonal_idx['seasonal_idx'].idxmin(),'seasonal_idx']:.2f}x){q4_note}."
)

print(f"\n  {summary}")

banner(f"Done. Forecast chart saved to scripts/plots/sales_forecast.png")
