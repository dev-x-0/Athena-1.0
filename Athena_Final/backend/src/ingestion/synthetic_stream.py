import csv
from pathlib import Path
from datetime import datetime
from collections import defaultdict

from .schema import (
    AdvertisingData,
    SalesData,
    ProductData,
    InventoryData,
)


# =========================================================
# DATA LOCATION
# =========================================================

DATA_DIR = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "raw"
)


# =========================================================
# HELPERS
# =========================================================

def parse_date(value):
    return datetime.strptime(
        value,
        "%Y-%m-%d"
    ).date()


def read_csv(filename):
    path = DATA_DIR / filename

    if not path.exists():
        raise FileNotFoundError(
            f"Data file not found: {path}"
        )

    with open(
        path,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        return list(
            csv.DictReader(file)
        )


# =========================================================
# LOAD ADVERTISING DATA
# =========================================================

def load_advertising():
    rows = read_csv(
        "advertising.csv"
    )

    # The source contains multiple platform rows
    # for the same campaign/date/SKU.
    #
    # Athena's core engine works at campaign level,
    # so aggregate those rows here.

    aggregated = defaultdict(
        lambda: {
            "platforms": set(),
            "spend": 0.0,
            "impressions": 0,
            "clicks": 0,
            "conversions": 0,
        }
    )

    for row in rows:

        key = (
            row["campaign_id"],
            row["sku"],
            parse_date(row["date"]),
        )

        item = aggregated[key]

        item["platforms"].add(
            row["platform"]
        )

        item["spend"] += float(
            row["spend"]
        )

        item["impressions"] += int(
            row["impressions"]
        )

        item["clicks"] += int(
            row["clicks"]
        )

        item["conversions"] += int(
            row["conversions"]
        )

    result = []

    for (
        campaign_id,
        sku,
        date
    ), values in aggregated.items():

        platforms = sorted(
            values["platforms"]
        )

        platform = (
            platforms[0]
            if len(platforms) == 1
            else "Multi-platform"
        )

        result.append(
            AdvertisingData(
                campaign_id=campaign_id,
                platform=platform,
                sku=sku,
                date=date,

                spend=round(
                    values["spend"],
                    2
                ),

                impressions=values[
                    "impressions"
                ],

                clicks=values[
                    "clicks"
                ],

                conversions=values[
                    "conversions"
                ],
            )
        )

    return result


# =========================================================
# LOAD SALES DATA
# =========================================================

def load_sales():
    rows = read_csv(
        "sales.csv"
    )

    result = []

    for row in rows:

        # Only use completed/paid orders
        if row["order_status"] != "COMPLETED":
            continue

        if row["payment_status"] != "PAID":
            continue

        result.append(
            SalesData(
                order_id=row["order_id"],
                sku=row["sku"],
                date=parse_date(
                    row["date"]
                ),

                units_sold=int(
                    row["quantity"]
                ),

                revenue=float(
                    row["net_revenue"]
                ),
            )
        )

    return result


# =========================================================
# LOAD PRODUCT DATA
# =========================================================

def load_products():
    rows = read_csv(
        "products.csv"
    )

    result = []

    for row in rows:

        result.append(
            ProductData(
                sku=row["sku"],
                product_name=row[
                    "product_name"
                ],

                selling_price=float(
                    row["selling_price"]
                ),

                cost_price=float(
                    row["cost"]
                ),
            )
        )

    return result


# =========================================================
# LOAD INVENTORY DATA
# =========================================================

def load_inventory():
    rows = read_csv(
        "inventory.csv"
    )

    result = []

    for row in rows:

        result.append(
            InventoryData(
                sku=row["sku"],

                available_units=int(
                    row["available_inventory"]
                ),
            )
        )

    return result


# =========================================================
# MAIN ATHENA DATASET
# =========================================================

def generate_dataset():
    """
    Load the real Athena dataset from CSV files.

    The function name is intentionally preserved so that
    the existing analytics, diagnostic, optimizer,
    execution, feedback and reasoning layers continue
    working without architectural changes.
    """

    dataset = {
        "advertising": load_advertising(),
        "sales": load_sales(),
        "products": load_products(),
        "inventory": load_inventory(),
    }

    return dataset


# =========================================================
# TEST DATA LOADER
# =========================================================

if __name__ == "__main__":

    dataset = generate_dataset()

    print()
    print("=" * 70)
    print("             ATHENA REAL DATA LOADER")
    print("=" * 70)

    print(
        f"Advertising records: "
        f"{len(dataset['advertising'])}"
    )

    print(
        f"Sales records: "
        f"{len(dataset['sales'])}"
    )

    print(
        f"Product records: "
        f"{len(dataset['products'])}"
    )

    print(
        f"Inventory records: "
        f"{len(dataset['inventory'])}"
    )

    print()
    print("Sample advertising record:")
    print(dataset["advertising"][0])

    print()
    print("Sample sales record:")
    print(dataset["sales"][0])

    print()
    print("Sample product record:")
    print(dataset["products"][0])

    print()
    print("Sample inventory record:")
    print(dataset["inventory"][0])