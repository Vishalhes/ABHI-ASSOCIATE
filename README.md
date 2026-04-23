**ABHI ASSOCIATE · BI DASHBOARD**

# ABHI ASSOCIATE · BI DASHBOARD

A professional Business Intelligence Dashboard built for **ABHI ASSOCIATE** to analyze **sales, purchase, stock, profitability, brand performance, customer trends, and future forecasts** in one place.

This dashboard connects with **Supabase** and transforms business data into clear, interactive, and decision-friendly insights.

---

## Overview

The **ABHI ASSOCIATE BI Dashboard** is designed to help monitor overall business performance using visual charts, KPI cards, and filter-based analysis.

It provides a complete view of:

- Total Sales
- Profit and Margin
- Purchase Value
- LMTD Sale
- Growth / De-Growth
- Brand Performance
- Item Performance
- Customer Performance
- Stock Summary
- Forecast Trends

The dashboard is useful for quickly understanding where the business is growing, where margins are weak, which brands are performing better, and how future sales may trend.

---

## How It Works

The dashboard works by fetching data from **Supabase** tables and converting that raw data into interactive visual insights.

### Main data sources:
- **fifo_profit_report**  
  Used for sales, profit, item, party, and brand analysis

- **purchase_card_summary**  
  Used for purchase value and purchase quantity analysis

- **stock_summary_latest**  
  Used for latest stock value and stock quantity analysis

### Process:
1. User logs in securely
2. Dashboard fetches data from Supabase
3. Data is filtered by:
   - Brand
   - Year
   - Month
4. KPI cards and charts update automatically
5. User can switch between different dashboard sections:
   - Overview
   - Brands
   - Items
   - Customers
   - Stock
   - Forecast

---

## Key Features

### 1. Overview Dashboard
Shows high-level business performance with KPI cards such as:
- Total Sale
- Profit
- Total Purchase
- LMTD Sale
- Growth / De-Growth
- Margin %
- Active Brands
- Unique Items

### 2. LMTD and Growth / De-Growth Logic
The dashboard uses business-friendly comparison logic:

- **Current MTD** = current month sale till latest available date
- **LMTD** = last month sale till the same date
- **Growth / De-Growth** = comparison of Current MTD vs LMTD

This helps measure whether sales are higher or lower compared to the same point in the previous month.

### 3. Brand Analysis
Shows:
- Brand-wise sales
- Brand-wise profit
- Brand margin %
- Brand stock value
- Brand contribution share

### 4. Item Analysis
Shows:
- Top 10 items by sales
- Bottom 10 items
- Top 10 items by profit
- Item-wise quantity, sale, profit, and margin

### 5. Customer Analysis
Shows:
- Top customers by sales
- Bottom customers
- Customer contribution %
- Customer-wise sale, profit, and quantity

### 6. Stock Analysis
Shows:
- Latest stock value
- Closing stock quantity
- Average stock value per unit
- Highest stock holding brand

### 7. Forecast Module
Uses weighted regression logic to estimate future sales and profit trends based on available month-wise history.

It provides:
- 3-month forecast
- Monthly sales trend
- Purchase vs sales trend
- Brand-wise next month forecast
- Item-wise projected trend

---

## Filters Available

The dashboard supports dynamic filters for:

- **Brand**
- **Year**
- **Month**

These filters update the dashboard instantly and allow detailed performance analysis for selected business segments.

---

## Tech Stack

- **HTML**
- **CSS**
- **JavaScript**
- **Chart.js**
- **Supabase**

---

## Use Case

This project is useful for businesses that want to:

- Track sales and profit performance
- Compare monthly progress
- Monitor stock position
- Identify top brands and customers
- Review weak-performing items
- Measure growth against last month
- Forecast future trends for better planning

---

## Project Structure

```text
index.html
style.css
script.js
README.md
