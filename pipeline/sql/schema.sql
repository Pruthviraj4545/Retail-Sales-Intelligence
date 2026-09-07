-- =============================================================================
-- sql/schema.sql
-- Retail Sales Intelligence Data Warehouse — Star Schema
-- =============================================================================
-- Architecture : Star Schema
-- Fact table   : Fact_Sales
-- Dimensions   : Dim_Date, Dim_Customer, Dim_Product, Dim_Location
--
-- Conventions:
--   • Surrogate PKs  : INTEGER  GENERATED ALWAYS AS IDENTITY
--   • Natural/biz PKs: preserved as UNIQUE NOT NULL where appropriate
--   • Monetary values: DECIMAL(12,2) to handle max observed $22,638
--   • Date columns   : DATE (no time component needed)
--   • All FK columns  carry an explicit index for join performance
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0. Safety: drop in reverse dependency order (facts before dims)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS Fact_Sales;
DROP TABLE IF EXISTS Dim_Date;
DROP TABLE IF EXISTS Dim_Customer;
DROP TABLE IF EXISTS Dim_Product;
DROP TABLE IF EXISTS Dim_Location;


-- =============================================================================
-- DIMENSION TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Dim_Date
-- Grain : one row per calendar day that appears as an Order Date
-- PK    : order_date (natural key — dates are inherently unique)
-- ---------------------------------------------------------------------------
CREATE TABLE Dim_Date (
    order_date       DATE           NOT NULL,
    order_year       SMALLINT       NOT NULL,   -- e.g. 2015 – 2018
    order_month      TINYINT        NOT NULL,   -- 1 – 12
    order_quarter    TINYINT        NOT NULL,   -- 1 – 4

    -- Derived convenience columns (computed from the natural key)
    month_name       VARCHAR(10)    NOT NULL,   -- e.g. 'January'
    quarter_label    CHAR(2)        NOT NULL,   -- e.g. 'Q1'

    CONSTRAINT PK_Dim_Date            PRIMARY KEY (order_date),
    CONSTRAINT CHK_Date_month         CHECK (order_month   BETWEEN 1 AND 12),
    CONSTRAINT CHK_Date_quarter       CHECK (order_quarter BETWEEN 1 AND 4)
);

COMMENT ON TABLE  Dim_Date              IS 'Calendar dimension — one row per distinct order date';
COMMENT ON COLUMN Dim_Date.order_date   IS 'Natural primary key (calendar day)';
COMMENT ON COLUMN Dim_Date.quarter_label IS 'Human-readable quarter label, e.g. Q1, Q2';


-- ---------------------------------------------------------------------------
-- Dim_Customer
-- Grain  : one row per unique customer
-- PK     : customer_key (surrogate) — protects against future ID changes
-- Biz key: customer_id (natural, unique)
-- ---------------------------------------------------------------------------
CREATE TABLE Dim_Customer (
    customer_key     INTEGER        NOT NULL GENERATED ALWAYS AS IDENTITY,
    customer_id      VARCHAR(20)    NOT NULL,   -- e.g. CG-12520
    customer_name    VARCHAR(100)   NOT NULL,
    segment          VARCHAR(30)    NOT NULL,   -- Consumer | Corporate | Home Office

    CONSTRAINT PK_Dim_Customer        PRIMARY KEY (customer_key),
    CONSTRAINT UQ_Dim_Customer_id     UNIQUE      (customer_id),
    CONSTRAINT CHK_Customer_segment   CHECK (segment IN ('Consumer', 'Corporate', 'Home Office'))
);

COMMENT ON TABLE  Dim_Customer              IS 'Customer dimension — one row per customer';
COMMENT ON COLUMN Dim_Customer.customer_key IS 'Surrogate primary key';
COMMENT ON COLUMN Dim_Customer.customer_id  IS 'Business / natural key from source system';
COMMENT ON COLUMN Dim_Customer.segment      IS 'Market segment: Consumer, Corporate, Home Office';


-- ---------------------------------------------------------------------------
-- Dim_Product
-- Grain  : one row per unique product
-- PK     : product_key (surrogate)
-- Biz key: product_id (natural, unique)
-- ---------------------------------------------------------------------------
CREATE TABLE Dim_Product (
    product_key      INTEGER        NOT NULL GENERATED ALWAYS AS IDENTITY,
    product_id       VARCHAR(30)    NOT NULL,   -- e.g. FUR-BO-10001798
    category         VARCHAR(50)    NOT NULL,   -- Furniture | Office Supplies | Technology
    sub_category     VARCHAR(50)    NOT NULL,   -- e.g. Bookcases, Chairs, Labels ...
    product_name     VARCHAR(255)   NOT NULL,

    CONSTRAINT PK_Dim_Product         PRIMARY KEY (product_key),
    CONSTRAINT UQ_Dim_Product_id      UNIQUE      (product_id),
    CONSTRAINT CHK_Product_category   CHECK (category IN ('Furniture', 'Office Supplies', 'Technology'))
);

COMMENT ON TABLE  Dim_Product              IS 'Product dimension — one row per SKU';
COMMENT ON COLUMN Dim_Product.product_key  IS 'Surrogate primary key';
COMMENT ON COLUMN Dim_Product.product_id   IS 'Business / natural key from source system';


-- ---------------------------------------------------------------------------
-- Dim_Location
-- Grain  : one row per unique postal-code area
-- PK     : location_key (surrogate) — postal_code used as biz key
-- Note   : postal_code 0 = Burlington, VT (missing code filled during ETL)
-- ---------------------------------------------------------------------------
CREATE TABLE Dim_Location (
    location_key     INTEGER        NOT NULL GENERATED ALWAYS AS IDENTITY,
    postal_code      INTEGER        NOT NULL,   -- 0 = unknown/filled
    city             VARCHAR(100)   NOT NULL,
    state            VARCHAR(100)   NOT NULL,
    region           VARCHAR(20)    NOT NULL,   -- East | West | Central | South
    country          VARCHAR(50)    NOT NULL    DEFAULT 'United States',

    CONSTRAINT PK_Dim_Location        PRIMARY KEY (location_key),
    CONSTRAINT UQ_Dim_Location_pc     UNIQUE      (postal_code),
    CONSTRAINT CHK_Location_region    CHECK (region IN ('East', 'West', 'Central', 'South'))
);

COMMENT ON TABLE  Dim_Location              IS 'Geographic dimension — one row per postal code area';
COMMENT ON COLUMN Dim_Location.location_key IS 'Surrogate primary key';
COMMENT ON COLUMN Dim_Location.postal_code  IS 'Business key; 0 indicates missing/unknown postal code';


-- =============================================================================
-- FACT TABLE
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Fact_Sales
-- Grain : one row per order line (Order ID + Product ID combination)
-- Measures: sales amount (additive)
-- ---------------------------------------------------------------------------
CREATE TABLE Fact_Sales (
    sale_key         INTEGER        NOT NULL GENERATED ALWAYS AS IDENTITY,

    -- --- Degenerate dimension (kept in fact, no separate dim needed) ---------
    order_id         VARCHAR(20)    NOT NULL,   -- e.g. CA-2017-152156

    -- --- Foreign keys to dimension tables ------------------------------------
    product_key      INTEGER        NOT NULL,   -- FK -> Dim_Product
    customer_key     INTEGER        NOT NULL,   -- FK -> Dim_Customer
    location_key     INTEGER        NOT NULL,   -- FK -> Dim_Location
    order_date       DATE           NOT NULL,   -- FK -> Dim_Date

    -- --- Shipping detail (degenerate dimension) ------------------------------
    ship_mode        VARCHAR(20)    NOT NULL,   -- First Class | Second Class | Standard Class | Same Day
    ship_date        DATE           NOT NULL,

    -- --- Additive measure ----------------------------------------------------
    sales            DECIMAL(12,2)  NOT NULL,

    -- --- Constraints ----------------------------------------------------------
    CONSTRAINT PK_Fact_Sales             PRIMARY KEY (sale_key),

    CONSTRAINT FK_FactSales_Product      FOREIGN KEY (product_key)
        REFERENCES Dim_Product  (product_key)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT FK_FactSales_Customer     FOREIGN KEY (customer_key)
        REFERENCES Dim_Customer (customer_key)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT FK_FactSales_Location     FOREIGN KEY (location_key)
        REFERENCES Dim_Location (location_key)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT FK_FactSales_Date         FOREIGN KEY (order_date)
        REFERENCES Dim_Date     (order_date)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT CHK_FactSales_sales       CHECK (sales > 0),
    CONSTRAINT CHK_FactSales_ship_mode   CHECK (ship_mode IN (
                                             'First Class', 'Second Class',
                                             'Standard Class', 'Same Day'))
);

COMMENT ON TABLE  Fact_Sales             IS 'Central fact table — one row per order line item';
COMMENT ON COLUMN Fact_Sales.sale_key    IS 'Surrogate primary key';
COMMENT ON COLUMN Fact_Sales.order_id    IS 'Degenerate dimension: source order identifier';
COMMENT ON COLUMN Fact_Sales.sales       IS 'Line-item revenue in USD (additive measure)';
COMMENT ON COLUMN Fact_Sales.ship_mode   IS 'Degenerate dimension: shipping method';


-- =============================================================================
-- INDEXES  (beyond the implicit PK indexes — optimise common join/filter paths)
-- =============================================================================

-- Fact_Sales — FK columns + frequent filter columns
CREATE INDEX IDX_FactSales_order_date   ON Fact_Sales (order_date);
CREATE INDEX IDX_FactSales_product_key  ON Fact_Sales (product_key);
CREATE INDEX IDX_FactSales_customer_key ON Fact_Sales (customer_key);
CREATE INDEX IDX_FactSales_location_key ON Fact_Sales (location_key);
CREATE INDEX IDX_FactSales_order_id     ON Fact_Sales (order_id);

-- Dim_Date — frequent filter / GROUP BY paths
CREATE INDEX IDX_DimDate_year           ON Dim_Date (order_year);
CREATE INDEX IDX_DimDate_year_quarter   ON Dim_Date (order_year, order_quarter);
CREATE INDEX IDX_DimDate_year_month     ON Dim_Date (order_year, order_month);

-- Dim_Product — frequent filter paths
CREATE INDEX IDX_DimProduct_category    ON Dim_Product (category);
CREATE INDEX IDX_DimProduct_sub_cat     ON Dim_Product (sub_category);

-- Dim_Customer — segment filtering
CREATE INDEX IDX_DimCustomer_segment    ON Dim_Customer (segment);

-- Dim_Location — geographic drill-down
CREATE INDEX IDX_DimLocation_state      ON Dim_Location (state);
CREATE INDEX IDX_DimLocation_region     ON Dim_Location (region);


-- =============================================================================
-- SAMPLE ANALYTICAL QUERIES  (illustrating the star schema in action)
-- =============================================================================

-- Q1: Total sales by year and quarter
-- SELECT  d.order_year, d.quarter_label, SUM(f.sales) AS total_sales
-- FROM    Fact_Sales  f
-- JOIN    Dim_Date    d ON f.order_date = d.order_date
-- GROUP BY d.order_year, d.quarter_label
-- ORDER BY d.order_year, d.quarter_label;

-- Q2: Top 5 sub-categories by revenue
-- SELECT  p.sub_category, SUM(f.sales) AS total_sales
-- FROM    Fact_Sales   f
-- JOIN    Dim_Product  p ON f.product_key = p.product_key
-- GROUP BY p.sub_category
-- ORDER BY total_sales DESC
-- LIMIT 5;

-- Q3: Sales by region and customer segment
-- SELECT  l.region, c.segment, SUM(f.sales) AS total_sales
-- FROM    Fact_Sales    f
-- JOIN    Dim_Location  l ON f.location_key = l.location_key
-- JOIN    Dim_Customer  c ON f.customer_key = c.customer_key
-- GROUP BY l.region, c.segment
-- ORDER BY l.region, total_sales DESC;

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
