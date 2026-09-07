# Power BI Dashboard Handoff (Stage 2)

🚧 Stage 2 is currently under development. This folder contains the repeatable data export, model guidance, DAX measures, and theme that will support a future Power BI dashboard. No completed `.pbix` report is included yet.

## Refresh the source files

From the repository root, run the pipeline in this order:

```powershell
python pipeline/scripts/01_clean_data.py
python pipeline/scripts/02_build_warehouse.py
python pipeline/scripts/03_add_metrics.py
python pipeline/scripts/04_rfm_segmentation.py
python pipeline/scripts/08_export_powerbi.py
```

The last command creates CSV sources in `powerbi/data/`:

- `Fact_Sales.csv`
- `Dim_Date.csv`
- `Dim_Customer.csv`
- `Dim_Product.csv`
- `Dim_Location.csv`
- `Customer_Segments.csv`

## Build the report when Stage 2 begins

In Power BI Desktop, choose **Get data > Text/CSV** and load every file in `powerbi/data/`.
The CSV export route avoids requiring a third-party SQLite connector and makes refreshes repeatable.

Create these one-to-many relationships:

| From | To |
|---|---|
| `Dim_Date[order_date]` | `Fact_Sales[order_date]` |
| `Dim_Customer[customer_key]` | `Fact_Sales[customer_key]` |
| `Dim_Product[product_key]` | `Fact_Sales[product_key]` |
| `Dim_Location[location_key]` | `Fact_Sales[location_key]` |
| `Dim_Customer[customer_id]` | `Customer_Segments[customer_id]` |

Use single-direction filtering from dimensions to `Fact_Sales`. Set `Dim_Date[order_date]` as the date table.
Import the measures in `measures.dax` into the model.

## Suggested report pages

### Executive view

- KPI cards: Total Sales, Orders, Average Order Value, Customers
- Line chart: Total Sales by `Dim_Date[order_date]`
- Bar chart: Total Sales by `Dim_Location[region]`
- Bar chart: Total Sales by `Dim_Product[category]`
- Slicers: Date, Region, Category, Segment

### Customer intelligence

- Donut or treemap: Customers by `Customer_Segments[Segment]`
- Scatter: `Frequency` versus `Monetary`, colored by `Segment`
- Table: customer name, segment, recency, frequency, monetary value
- Bar chart: Monetary value by segment

### Operations

- Column chart: Total Sales by ship mode
- Line chart: Average Days to Ship by month
- Matrix: Region by category with Total Sales and Orders

## Visual direction

Import `theme.json` from **View > Themes > Browse for themes**. Keep the canvas warm and quiet,
use rust for primary emphasis, teal for comparison, and gold only for highlights. Use generous
white space and avoid putting every visual inside a bordered card.

## Refresh behavior

After rerunning the Python pipeline, rerun `08_export_powerbi.py`, then choose **Refresh** in Power BI Desktop.
For scheduled refresh in the Power BI Service, publish the report and configure an on-premises data gateway
for the repository folder, or move the exported CSVs to SharePoint/OneDrive or a cloud database.