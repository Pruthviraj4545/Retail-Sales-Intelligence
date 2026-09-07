import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Retail Sales Intelligence Warehouse',
  description:
    'End-to-end data engineering pipeline: 9,800 raw rows → ETL → Star Schema SQLite warehouse → ANOVA + correlation analysis → RFM KMeans customer segmentation.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
