# =============================================================================
# r-analysis/statistical_analysis.R
# Retail Sales Intelligence — Statistical Analysis
# =============================================================================
# Prerequisites (install once in R console):
#   install.packages(c("ggplot2", "reshape2", "dplyr"))
#
# Run from project root:
#   Rscript r-analysis/statistical_analysis.R
# =============================================================================

library(ggplot2)
library(reshape2)
library(dplyr)

# ---------------------------------------------------------------------------
# 0. Paths
# ---------------------------------------------------------------------------
BASE_DIR  <- normalizePath(file.path(dirname(sys.frame(1)$ofile), ".."),
                           mustWork = FALSE)
CSV_PATH  <- file.path(BASE_DIR, "data", "cleaned_sales.csv")
PLOT_DIR  <- file.path(BASE_DIR, "r-analysis", "plots")
dir.create(PLOT_DIR, recursive = TRUE, showWarnings = FALSE)

cat(rep("=", 60), "\n", sep = "")
cat("  Retail Sales — Statistical Analysis (R)\n")
cat(rep("=", 60), "\n\n", sep = "")

# ---------------------------------------------------------------------------
# 1. Load data
# ---------------------------------------------------------------------------
df <- read.csv(CSV_PATH, stringsAsFactors = FALSE)
df$Order.Date <- as.Date(df$Order.Date)
df$Ship.Date  <- as.Date(df$Ship.Date)

cat(sprintf("[1] Loaded '%s'\n", basename(CSV_PATH)))
cat(sprintf("    Rows: %d  |  Columns: %d\n\n", nrow(df), ncol(df)))

# Ensure Days.to.Ship exists (added by 03_add_metrics.py)
stopifnot("Days.to.Ship" %in% names(df))

# ---------------------------------------------------------------------------
# 2. ANOVA: Sales ~ Region
# ---------------------------------------------------------------------------
cat(rep("-", 60), "\n", sep = "")
cat("[2] One-Way ANOVA: Sales ~ Region\n")
cat(rep("-", 60), "\n", sep = "")

anova_sales_region <- aov(Sales ~ Region, data = df)
summary_sales      <- summary(anova_sales_region)
print(summary_sales)

p_sales_region <- summary_sales[[1]][["Pr(>F)"]][1]
f_sales_region <- summary_sales[[1]][["F value"]][1]

if (p_sales_region < 0.05) {
  cat(sprintf("\nINTERPRETATION: Region has a STATISTICALLY SIGNIFICANT effect on Sales.\n"))
  cat(sprintf("  F = %.4f,  p = %.4e  (p < 0.05 -> reject H0)\n\n", f_sales_region, p_sales_region))
} else {
  cat(sprintf("\nINTERPRETATION: Region does NOT have a significant effect on Sales.\n"))
  cat(sprintf("  F = %.4f,  p = %.4f  (p >= 0.05 -> fail to reject H0)\n\n", f_sales_region, p_sales_region))
}

# ---------------------------------------------------------------------------
# 3. ANOVA: Days to Ship ~ Ship Mode
# ---------------------------------------------------------------------------
cat(rep("-", 60), "\n", sep = "")
cat("[3] One-Way ANOVA: Days.to.Ship ~ Ship.Mode\n")
cat(rep("-", 60), "\n", sep = "")

anova_days_ship <- aov(Days.to.Ship ~ Ship.Mode, data = df)
summary_days    <- summary(anova_days_ship)
print(summary_days)

p_days_ship <- summary_days[[1]][["Pr(>F)"]][1]
f_days_ship <- summary_days[[1]][["F value"]][1]

if (p_days_ship < 0.05) {
  cat(sprintf("\nINTERPRETATION: Ship Mode has a STATISTICALLY SIGNIFICANT effect on Days to Ship.\n"))
  cat(sprintf("  F = %.4f,  p = %.4e  (p < 0.05 -> reject H0)\n\n", f_days_ship, p_days_ship))
} else {
  cat(sprintf("\nINTERPRETATION: Ship Mode does NOT have a significant effect on Days to Ship.\n"))
  cat(sprintf("  F = %.4f,  p = %.4f  (p >= 0.05 -> fail to reject H0)\n\n", f_days_ship, p_days_ship))
}

# ---------------------------------------------------------------------------
# 4. Correlation matrix: Sales & Days to Ship
# ---------------------------------------------------------------------------
cat(rep("-", 60), "\n", sep = "")
cat("[4] Correlation Matrix: Sales & Days to Ship\n")
cat(rep("-", 60), "\n", sep = "")

cor_vars   <- df[, c("Sales", "Days.to.Ship")]
cor_matrix <- cor(cor_vars, use = "complete.obs")
print(round(cor_matrix, 4))

r_val <- cor_matrix["Sales", "Days.to.Ship"]
cor_test_result <- cor.test(df$Sales, df$Days.to.Ship)

cat(sprintf("\nPearson r (Sales vs Days to Ship): %.4f\n", r_val))
cat(sprintf("p-value of correlation test      : %.4f\n", cor_test_result$p.value))
if (cor_test_result$p.value < 0.05) {
  cat("INTERPRETATION: The correlation is statistically significant.\n\n")
} else {
  cat("INTERPRETATION: The correlation is NOT statistically significant.\n\n")
}

# ---------------------------------------------------------------------------
# 5a. Plot: Correlation Heatmap
# ---------------------------------------------------------------------------
cat(rep("-", 60), "\n", sep = "")
cat("[5a] Saving correlation heatmap\n")
cat(rep("-", 60), "\n", sep = "")

cor_melt <- melt(cor_matrix)

heatmap_path <- file.path(PLOT_DIR, "correlation_heatmap.png")
p_heat <- ggplot(cor_melt, aes(x = Var1, y = Var2, fill = value, label = round(value, 3))) +
  geom_tile(colour = "white") +
  geom_text(size = 5, fontface = "bold") +
  scale_fill_gradient2(low = "#2166AC", mid = "white", high = "#D6604D",
                       midpoint = 0, limits = c(-1, 1), name = "Pearson r") +
  labs(title = "Correlation Heatmap: Sales & Days to Ship",
       x = NULL, y = NULL) +
  theme_minimal(base_size = 13) +
  theme(plot.title = element_text(face = "bold", hjust = 0.5))

ggsave(heatmap_path, p_heat, width = 6, height = 4, dpi = 150)
cat(sprintf("    Saved: %s\n\n", heatmap_path))

# ---------------------------------------------------------------------------
# 5b. Plot: Boxplot of Sales by Region
# ---------------------------------------------------------------------------
cat(rep("-", 60), "\n", sep = "")
cat("[5b] Saving boxplot of Sales by Region\n")
cat(rep("-", 60), "\n", sep = "")

boxplot_path <- file.path(PLOT_DIR, "sales_by_region_boxplot.png")
p_box <- ggplot(df, aes(x = Region, y = Sales, fill = Region)) +
  geom_boxplot(outlier.colour = "firebrick", outlier.alpha = 0.5,
               notch = FALSE, width = 0.5) +
  scale_fill_brewer(palette = "Set2") +
  scale_y_log10(labels = scales::dollar_format()) +
  labs(title = "Sales Distribution by Region",
       x = "Region", y = "Sales (log scale, USD)",
       caption = sprintf("One-Way ANOVA: F = %.2f, p = %.3e", f_sales_region, p_sales_region)) +
  theme_minimal(base_size = 13) +
  theme(legend.position = "none",
        plot.title   = element_text(face = "bold", hjust = 0.5),
        plot.caption = element_text(colour = "grey50"))

ggsave(boxplot_path, p_box, width = 7, height = 5, dpi = 150)
cat(sprintf("    Saved: %s\n\n", boxplot_path))

# ---------------------------------------------------------------------------
# 6. Plain-English summary
# ---------------------------------------------------------------------------
cat(rep("=", 60), "\n", sep = "")
cat("  PLAIN-ENGLISH SUMMARY\n")
cat(rep("=", 60), "\n\n", sep = "")

# ANOVA 1
if (p_sales_region < 0.05) {
  cat(sprintf("1. ANOVA — Sales by Region:\n   Region has a statistically significant effect on Sales\n   (F = %.2f, p = %.2e, p < 0.05). At least one region has a\n   meaningfully different average sales level.\n\n",
              f_sales_region, p_sales_region))
} else {
  cat(sprintf("1. ANOVA — Sales by Region:\n   Region does NOT significantly affect Sales\n   (F = %.2f, p = %.4f, p >= 0.05).\n\n",
              f_sales_region, p_sales_region))
}

# ANOVA 2
if (p_days_ship < 0.05) {
  cat(sprintf("2. ANOVA — Days to Ship by Ship Mode:\n   Ship Mode has a statistically significant effect on shipping\n   time (F = %.2f, p = %.2e, p < 0.05). Different shipping modes\n   lead to meaningfully different delivery durations.\n\n",
              f_days_ship, p_days_ship))
} else {
  cat(sprintf("2. ANOVA — Days to Ship by Ship Mode:\n   Ship Mode does NOT significantly affect Days to Ship\n   (F = %.2f, p = %.4f, p >= 0.05).\n\n",
              f_days_ship, p_days_ship))
}

# Correlation
cat(sprintf("3. Correlation — Sales vs Days to Ship:\n   Pearson r = %.4f", r_val))
if (abs(r_val) < 0.1) {
  cat(" (negligible correlation).\n")
} else if (abs(r_val) < 0.3) {
  cat(" (weak correlation).\n")
} else if (abs(r_val) < 0.5) {
  cat(" (moderate correlation).\n")
} else {
  cat(" (strong correlation).\n")
}
if (cor_test_result$p.value < 0.05) {
  cat(sprintf("   This correlation IS statistically significant (p = %.4f).\n\n",
              cor_test_result$p.value))
} else {
  cat(sprintf("   This correlation is NOT statistically significant (p = %.4f).\n\n",
              cor_test_result$p.value))
}

cat("Plots saved to: r-analysis/plots/\n")
cat(rep("=", 60), "\n", sep = "")
cat("  Analysis complete.\n")
cat(rep("=", 60), "\n", sep = "")
