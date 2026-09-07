# Retail Sales Intelligence Web App

This directory contains the Next.js front end for the Retail Sales Intelligence project.

## Routes

- `/` — Stage 1 case study: ingestion, cleaning, warehouse, analysis, and segmentation.
- `/analyze` — Client-side CSV upload, schema mapping, data-quality checks, KPI charts, and RFM analysis.

## Local Development

From this directory:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000` in a browser.

## Production Check

```powershell
npm run build
npm run start
```

The app currently has no required environment variables. Uploaded CSV files are parsed and analyzed in the browser; this project does not send them to a backend service.

## Stage 2 Note

Power BI work is pending. The handoff assets are maintained in the repository-level `powerbi/` directory and are not presented as a completed dashboard here.

## Author

Pruthviraj Mule
