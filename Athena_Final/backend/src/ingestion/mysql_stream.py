"""
Athena MySQL Data Layer

Reads the Athena MySQL database and converts the available
business datasets into clean Python dictionaries.

Important:
- This layer READS data only.
- It does not invent raw business values.
- Derived/predicted values are calculated by the intelligence layer.
"""
import os
from typing import Any

import mysql.connector
from dotenv import load_dotenv

load_dotenv()

# =========================================================
# DATABASE CONFIGURATION
# =========================================================

DB_CONFIG = {
    "host": os.getenv("ATHENA_DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("ATHENA_DB_PORT", "3306")),
    "user": os.getenv("ATHENA_DB_USER", "root"),
    "password": os.getenv("ATHENA_DB_PASSWORD", ""),
    "database": os.getenv("ATHENA_DB_NAME", "athena"),
}


# =========================================================
# CONNECTION
# =========================================================

def get_connection():
    """Create a connection to the Athena MySQL database."""

    return mysql.connector.connect(**DB_CONFIG)


# =========================================================
# GENERIC QUERY HELPER
# =========================================================

def fetch_all(query: str, params=None):
    """Execute a read-only query and return dictionaries."""

    connection = get_connection()

    try:
        cursor = connection.cursor(dictionary=True)

        cursor.execute(query, params or ())
        rows = cursor.fetchall()

        cursor.close()

        return rows

    finally:
        connection.close()


# =========================================================
# ADVERTISING DATA
# =========================================================

def load_advertising():

    rows = fetch_all(
        """
        SELECT
            date,
            provider,
            network,
            account_id,
            shortname,
            campaign_start_date,
            campaign_end_date,
            brand,
            adset_name,
            adset_group,
            ad_name,
            ad_type,
            device,
            spend,
            clicks,
            imps,
            conversions,
            sessions,
            users,
            new_users,
            page_views,
            Sales
        FROM advertising_campaigns_result
        """
    )

    advertising = []

    for row in rows:

        spend = float(row["spend"] or 0)
        clicks = int(float(row["clicks"] or 0))
        impressions = int(float(row["imps"] or 0))
        conversions = int(float(row["conversions"] or 0))
        sales = float(row["Sales"] or 0)

        advertising.append(
            {
                "date": row["date"],
                "platform": row["provider"],
                "network": row["network"],
                "campaign": row["shortname"],
                "brand": row["brand"],
                "adset": row["adset_name"],
                "ad": row["ad_name"],
                "ad_type": row["ad_type"],
                "device": row["device"],

                "spend": spend,
                "clicks": clicks,
                "impressions": impressions,
                "conversions": conversions,

                "sessions": int(float(row["sessions"] or 0)),
                "users": int(float(row["users"] or 0)),
                "new_users": int(float(row["new_users"] or 0)),
                "page_views": int(float(row["page_views"] or 0)),

                "sales": sales,
            }
        )

    return advertising


# =========================================================
# SALES KPI DATA
# =========================================================

def load_sales_kpis():

    rows = fetch_all(
        """
        SELECT
            Sales_Record,
            Units_Sold,
            Revenue,
            Advertising_Cost,
            Campaign_Day
        FROM sales_kpi_calculators
        """
    )

    return [
        {
            "record": int(row["Sales_Record"]),
            "units_sold": float(row["Units_Sold"] or 0),
            "revenue": float(row["Revenue"] or 0),
            "advertising_cost": float(
                row["Advertising_Cost"] or 0
            ),
            "campaign_day": int(row["Campaign_Day"] or 0),
        }
        for row in rows
    ]


# =========================================================
# PRODUCT DATA
# =========================================================

def load_products():

    rows = fetch_all(
        """
        SELECT
            Product_ID,
            Product_Name,
            Category,
            Price,
            Ad_ID,
            Ad_Name,
            Campaign_Budget
        FROM product_and_advertisement_data
        """
    )

    return [
        {
            "product_id": int(row["Product_ID"]),
            "product_name": row["Product_Name"],
            "category": row["Category"],
            "price": float(row["Price"] or 0),
            "ad_id": int(row["Ad_ID"]),
            "ad_name": row["Ad_Name"],
            "campaign_budget": float(
                row["Campaign_Budget"] or 0
            ),
        }
        for row in rows
    ]


# =========================================================
# CAMPAIGN ANALYSIS
# =========================================================

def load_campaign_analysis():

    rows = fetch_all(
        """
        SELECT *
        FROM campaign_analysis
        """
    )

    return rows


# =========================================================
# ATTRIBUTION + ROI
# =========================================================

def load_attribution():

    rows = fetch_all(
        """
        SELECT
            Date,
            Channel,
            Clicks,
            Conversions,
            Attributed_Conversions,
            ROI
        FROM attribution_model_and_roi_analysis
        """
    )

    return [
        {
            "date": row["Date"],
            "channel": row["Channel"],
            "clicks": int(float(row["Clicks"] or 0)),
            "conversions": int(float(row["Conversions"] or 0)),
            "attributed_conversions": float(
                row["Attributed_Conversions"] or 0
            ),
            "roi": float(row["ROI"] or 0),
        }
        for row in rows
    ]


# =========================================================
# COST ANALYSIS
# =========================================================

def load_cost_analysis():

    rows = fetch_all(
        """
        SELECT
            product,
            current_cost,
            incremental_cost,
            opportunity_cost,
            sunk_cost,
            differential_cost,
            relevant_cost
        FROM cost_analysis_for_decision_making
        """
    )

    return [
        {
            "product": row["product"],
            "current_cost": float(row["current_cost"] or 0),
            "incremental_cost": float(
                row["incremental_cost"] or 0
            ),
            "opportunity_cost": float(
                row["opportunity_cost"] or 0
            ),
            "sunk_cost": float(row["sunk_cost"] or 0),
            "differential_cost": float(
                row["differential_cost"] or 0
            ),
            "relevant_cost": float(
                row["relevant_cost"] or 0
            ),
        }
        for row in rows
    ]


# =========================================================
# REVENUE FORECAST
# =========================================================

def load_revenue_forecast():

    rows = fetch_all(
        """
        SELECT
            Date,
            Predicted_Revenue
        FROM revenu_prediction_for_30_days
        """
    )

    return [
        {
            "date": row["Date"],
            "predicted_revenue": float(
                row["Predicted_Revenue"] or 0
            ),
        }
        for row in rows
    ]


# =========================================================
# BUDGET ALLOCATION
# =========================================================

def load_allocated_budget():

    rows = fetch_all(
        """
        SELECT
            Channel,
            Expected_Return,
            Cost,
            Allocated_Budget
        FROM allocated_budget
        """
    )

    return [
        {
            "channel": row["Channel"],
            "expected_return": float(
                row["Expected_Return"] or 0
            ),
            "cost": float(row["Cost"] or 0),
            "allocated_budget": float(
                row["Allocated_Budget"] or 0
            ),
        }
        for row in rows
    ]


# =========================================================
# UNIFIED ATHENA DATASET
# =========================================================

def generate_mysql_dataset():

    return {
        "advertising": load_advertising(),
        "sales_kpis": load_sales_kpis(),
        "products": load_products(),
        "campaign_analysis": load_campaign_analysis(),
        "attribution": load_attribution(),
        "cost_analysis": load_cost_analysis(),
        "revenue_forecast": load_revenue_forecast(),
        "allocated_budget": load_allocated_budget(),
    }


# =========================================================
# TEST
# =========================================================

if __name__ == "__main__":

    dataset = generate_mysql_dataset()

    print("\nATHENA MYSQL CONNECTION SUCCESSFUL\n")

    for name, rows in dataset.items():

        print(
            f"{name:25} : "
            f"{len(rows):>6} rows"
        )

    print("\nAthena is now reading directly from MySQL.")