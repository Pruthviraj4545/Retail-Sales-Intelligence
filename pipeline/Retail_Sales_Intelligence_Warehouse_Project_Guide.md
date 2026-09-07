# Retail Sales Intelligence Warehouse
### A Complete Data Analytics + Data Engineering Project Guide

---

## 1. Project Overview

**What it is:** An end-to-end data project that takes raw, messy retail sales data and turns it into business insights — covering the full lifecycle: ingestion, cleaning, warehousing, statistical analysis, machine learning, and visualization.

**Why it matters:** Most student projects only show one slice (either a dashboard, or a model, or an app). This project deliberately covers the **entire data pipeline**, which is exactly what both Data Analytics and Data Engineering roles look for.

**Time to build:** ~4-6 hours, doable in a single day.

**Cost:** $0 — every tool used is free.

**Skills demonstrated:** Python, R, SQL, Data Warehousing (star schema), Power BI, Statistics, Machine Learning (clustering), ETL pipeline design.

---

## 2. Tools & Setup (All Free)

| Purpose | Tool | Link/Notes |
|---|---|---|
| Data source | Kaggle "Superstore Sales" or UCI "Online Retail" dataset | Free download, CSV format |
| Python environment | Google Colab | No install needed, runs in browser |
| Data warehouse | SQLite | Built into Python (`sqlite3` library), no server setup |
| Statistical analysis | R via Posit Cloud (formerly RStudio Cloud) | Free tier, browser-based |
| Visualization | Power BI Desktop | Free download for Windows |
| Version control | GitHub | Free, use to host code + README |
| AI coding assistant | ChatGPT / Claude / Copilot | For "vibe coding" each step faster |

---

## 3. Architecture (The Big Picture)

```
Raw CSV Data
     ↓
[Python: Clean & Validate] (Pandas, NumPy)
     ↓
[SQLite: Star Schema Warehouse] (Fact + Dimension tables)
     ↓
     ├──→ [R: Statistical Analysis] (ANOVA, correlation)
     ├──→ [Python: ML Clustering] (RFM customer segmentation)
     └──→ [Power BI: Dashboard] (visual insights)
```

This flow itself is the "story" you tell in interviews: raw data → structured warehouse → analysis → insight.

---

## 4. Step-by-Step Build Guide

### Step 1: Get the Data (10 min)
- Download the Superstore or Online Retail dataset from Kaggle/UCI.
- Open it once manually to understand columns (Order Date, Customer ID, Product, Region, Sales, Quantity, etc.)

### Step 2: Clean the Data (Python, ~45 min)
In Google Colab:
- Load CSV with Pandas
- Handle missing values, duplicate rows, inconsistent date formats
- Standardize column names and types
- Export a clean CSV

*AI prompt to use:* "Here are my raw CSV columns: [paste column names + 5 sample rows]. Write Pandas code to clean nulls, standardize dates, and remove duplicates."

### Step 3: Design the Star Schema (Data Warehousing, ~20 min)
Design these tables:
- **Fact_Sales** (Order ID, Product ID, Customer ID, Date ID, Region ID, Sales Amount, Quantity, Profit)
- **Dim_Product** (Product ID, Category, Sub-Category, Product Name)
- **Dim_Customer** (Customer ID, Customer Name, Segment)
- **Dim_Date** (Date ID, Day, Month, Quarter, Year)
- **Dim_Region** (Region ID, Region Name, State, City)

*AI prompt to use:* "Design a star schema for retail sales data with these columns: [list]. Give me SQLite CREATE TABLE statements."

### Step 4: Load Data into the Warehouse (Python, ~20 min)
- Write a Python script using `sqlite3` to create the tables and insert your cleaned data into the correct fact/dimension structure.

*AI prompt to use:* "Write a Python script that reads this cleaned CSV and inserts it into these SQLite tables: [paste your CREATE TABLE statements]."

### Step 5: Statistical Analysis in R (~30-40 min)
On Posit Cloud:
- Import the cleaned CSV
- Run ANOVA: does Region significantly affect Sales?
- Run correlation analysis between Sales, Profit, Quantity, Discount
- Build a correlation heatmap

*AI prompt to use:* "Write R code to test if sales differ significantly across regions using ANOVA, and generate a correlation heatmap for sales, profit, quantity, and discount."

### Step 6: Customer Segmentation / ML (Python, ~30-40 min)
Run an RFM (Recency, Frequency, Monetary) analysis with KMeans clustering to segment customers into groups like "high value," "at risk," "new," etc.

*AI prompt to use:* "Write a Python script for RFM analysis and KMeans clustering to segment customers by purchase recency, frequency, and monetary value."

### Step 7: Build the Power BI Dashboard (~45 min)
Import your cleaned CSV or SQLite export into Power BI Desktop. Build 4 core visuals:
1. Revenue trend over time (line chart)
2. Sales by region (map or bar chart)
3. Top-performing products/categories (bar chart)
4. Customer segments from your RFM analysis (pie/bar chart)

*AI prompt to use:* "What are the 4 most impactful visuals for a retail sales Power BI dashboard covering revenue trends, regional performance, top products, and customer segments?"

### Step 8: Document Everything (~20 min)
Create a GitHub repo with:
- A clear README (problem, approach, architecture diagram, key findings)
- All code (Python notebooks, R script, SQL schema)
- Screenshots of the Power BI dashboard
- A short "Key Insights" section (e.g., "Region X underperforms due to Y")

*AI prompt to use:* "Help me write a clean GitHub README for this project explaining the architecture, schema, and key findings."

---

## 5. How to Frame It on Your Resume (Two Versions)

**For Data Analytics roles:**
> Performed end-to-end retail sales analysis: cleaned raw transactional data, conducted statistical hypothesis testing (ANOVA) in R, built an RFM-based customer segmentation model, and developed a Power BI dashboard surfacing revenue, regional, and customer insights.

**For Data Engineering roles:**
> Designed and implemented a star-schema data warehouse (SQLite) for retail sales data, building a full ETL pipeline in Python to ingest, clean, and load raw data into fact/dimension tables, enabling downstream analytics and BI reporting.

---

## 6. Skills Mapping (What This Project Proves)

| Skill Area | Demonstrated By |
|---|---|
| Python (Pandas, NumPy) | Data cleaning, ETL script |
| SQL / Data Warehousing | Star schema design, SQLite implementation |
| R / Statistics | ANOVA, correlation analysis |
| Machine Learning | RFM + KMeans clustering |
| Power BI / Data Analytics | Dashboard with business insights |
| Documentation | GitHub README, architecture diagram |
| (Optional) React/TypeScript | If you add a simple frontend to display JSON-exported insights |

---

## 7. Optional Stretch Goal

If you want to also flex your React/TypeScript skills, export your final insights (top products, regional summary, customer segments) as a JSON file and build a simple Next.js page that fetches and displays it as cards/charts (using a free library like Recharts). This turns it into a full-stack data product, not just a backend pipeline.

---

## 8. Next Steps

1. Pick your dataset today.
2. Follow Steps 1-4 first (get the pipeline working) — this is the hardest part.
3. Do Steps 5-7 once the pipeline is solid.
4. Push everything to GitHub and update your resume with the appropriate framing.
