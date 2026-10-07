from collections import defaultdict
from statistics import median

from src.ingestion.mysql_stream import (
    load_advertising,
    load_sales_kpis,
    load_products,
    load_campaign_analysis,
    load_attribution,
    load_cost_analysis,
    load_revenue_forecast,
    load_allocated_budget,
)


def safe_divide(a, b):
    if b in (0, None):
        return 0.0
    return a / b


def calculate_campaign_intelligence(advertising):
    """
    Converts raw MySQL advertising data into campaign-level intelligence.

    All KPIs generated here are DERIVED from the database data.
    No raw business values are fabricated.
    """

    grouped = defaultdict(lambda: {
        "spend": 0.0,
        "impressions": 0,
        "clicks": 0,
        "conversions": 0,
        "sales": 0.0,
        "sessions": 0,
        "users": 0,
        "new_users": 0,
        "page_views": 0,
        "records": 0,
    })

    for row in advertising:
        campaign = str(row.get("campaign") or "Unknown Campaign")
        provider = str(row.get("platform") or "Unknown Platform")
        network = str(row.get("network") or "Unknown Network")
        brand = str(row.get("brand") or "Unknown Brand")

        key = (campaign, provider, network, brand)

        grouped[key]["spend"] += float(row.get("spend") or 0)
        grouped[key]["impressions"] += int(row.get("impressions") or 0)
        grouped[key]["clicks"] += int(row.get("clicks") or 0)
        grouped[key]["conversions"] += int(row.get("conversions") or 0)
        grouped[key]["sales"] += float(row.get("sales") or 0)
        grouped[key]["sessions"] += int(row.get("sessions") or 0)
        grouped[key]["users"] += int(row.get("users") or 0)
        grouped[key]["new_users"] += int(row.get("new_users") or 0)
        grouped[key]["page_views"] += int(row.get("page_views") or 0)
        grouped[key]["records"] += 1

    campaigns = []

    for key, data in grouped.items():

        campaign, provider, network, brand = key

        spend = data["spend"]
        impressions = data["impressions"]
        clicks = data["clicks"]
        conversions = data["conversions"]
        sales = data["sales"]

        roas = safe_divide(sales, spend)
        ctr = safe_divide(clicks, impressions) * 100
        conversion_rate = safe_divide(conversions, clicks) * 100
        cpa = safe_divide(spend, conversions)

        profit_before_other_costs = sales - spend

        # Transparent business rules.
        if spend > 0 and conversions == 0:
            health = "CRITICAL"
            action = "PAUSE"
            reason = "The campaign has advertising spend but recorded zero conversions."

        elif roas < 2:
            health = "WARNING"
            action = "REDUCE"
            reason = "ROAS is below the Athena efficiency threshold of 2.0."

        elif roas >= 4:
            health = "STRONG"
            action = "SCALE"
            reason = "ROAS is at or above the Athena scaling threshold of 4.0."

        else:
            health = "STABLE"
            action = "MAINTAIN"
            reason = "Campaign performance is within the current operating range."

        if action == "PAUSE":
            budget_change = -100
        elif action == "REDUCE":
            budget_change = -20
        elif action == "SCALE":
            budget_change = 25
        else:
            budget_change = 0

        campaigns.append({
            "campaign": campaign,
            "platform": provider,
            "network": network,
            "brand": brand,

            "spend": round(spend, 2),
            "sales": round(sales, 2),
            "impressions": impressions,
            "clicks": clicks,
            "conversions": conversions,

            "roas": round(roas, 4),
            "ctr": round(ctr, 4),
            "conversion_rate": round(conversion_rate, 4),
            "cpa": round(cpa, 2),

            "profit_before_other_costs": round(
                profit_before_other_costs, 2
            ),

            "health": health,
            "recommended_action": action,
            "recommended_budget_change_percent": budget_change,
            "reason": reason,

            "source": "MySQL",
            "derived_metrics": True,
        })

    campaigns.sort(
        key=lambda x: x["spend"],
        reverse=True
    )

    return campaigns


def calculate_channel_intelligence(attribution):
    """
    Aggregates attribution data by marketing channel.
    """

    grouped = defaultdict(lambda: {
        "clicks": 0,
        "conversions": 0,
        "attributed_conversions": 0,
        "roi_values": [],
    })

    for row in attribution:
        channel = str(row.get("channel") or "Unknown Channel")

        grouped[channel]["clicks"] += int(row.get("clicks") or 0)
        grouped[channel]["conversions"] += int(
            row.get("conversions") or 0
        )
        grouped[channel]["attributed_conversions"] += int(
            row.get("attributed_conversions") or 0
        )

        roi = row.get("roi")

        if roi is not None:
            try:
                grouped[channel]["roi_values"].append(float(roi))
            except (TypeError, ValueError):
                pass

    channels = []

    for channel, data in grouped.items():

        roi_values = data["roi_values"]

        avg_roi = (
            sum(roi_values) / len(roi_values)
            if roi_values
            else 0
        )

        attribution_rate = safe_divide(
            data["attributed_conversions"],
            data["conversions"]
        ) * 100

        channels.append({
            "channel": channel,
            "clicks": data["clicks"],
            "conversions": data["conversions"],
            "attributed_conversions": data[
                "attributed_conversions"
            ],
            "average_roi": round(avg_roi, 4),
            "attribution_rate": round(attribution_rate, 2),
            "source": "MySQL",
            "derived_metrics": True,
        })

    channels.sort(
        key=lambda x: x["average_roi"],
        reverse=True
    )

    return channels


def calculate_budget_intelligence(allocated_budget):
    """
    Evaluates existing budget allocation data.
    """

    results = []

    for row in allocated_budget:

        channel = row.get("channel")

        expected_return = float(
            row.get("expected_return") or 0
        )

        cost = float(
            row.get("cost") or 0
        )

        budget = float(
            row.get("allocated_budget") or 0
        )

        efficiency = safe_divide(
            expected_return,
            cost
        )

        results.append({
            "channel": channel,
            "expected_return": round(expected_return, 2),
            "cost": round(cost, 2),
            "allocated_budget": round(budget, 2),
            "return_per_cost": round(efficiency, 4),
            "source": "MySQL",
            "derived_metrics": True,
        })

    results.sort(
        key=lambda x: x["return_per_cost"],
        reverse=True
    )

    return results


def calculate_forecast_intelligence(forecast):
    """
    Summarizes the existing 30-day revenue forecast.
    """

    values = []

    for row in forecast:
        value = row.get("predicted_revenue")

        if value is not None:
            try:
                values.append(float(value))
            except (TypeError, ValueError):
                pass

    if not values:
        return {
            "available": False,
            "source": "MySQL",
        }

    return {
        "available": True,
        "days": len(values),
        "total_predicted_revenue": round(sum(values), 2),
        "average_daily_predicted_revenue": round(
            sum(values) / len(values),
            2
        ),
        "minimum_predicted_revenue": round(
            min(values),
            2
        ),
        "maximum_predicted_revenue": round(
            max(values),
            2
        ),
        "source": "MySQL",
        "derived_metrics": True,
    }


def generate_insights(campaigns, channels, budgets, forecast):
    """
    Generates evidence-backed Athena insights.
    """

    insights = []

    critical_campaigns = [
        c for c in campaigns
        if c["health"] == "CRITICAL"
    ]

    for campaign in critical_campaigns:
        insights.append({
            "type": "critical",
            "title": f"{campaign['campaign']} is spending without conversions",
            "what_happened": (
                f"The campaign spent ₹{campaign['spend']:,.2f} "
                f"and recorded {campaign['conversions']} conversions."
            ),
            "why_it_matters": (
                "Continued spend without conversions can destroy "
                "advertising efficiency."
            ),
            "recommendation": "Pause the campaign and investigate its targeting or creative.",
            "campaign": campaign["campaign"],
            "source": "MySQL",
        })

    weak_campaigns = [
        c for c in campaigns
        if c["health"] == "WARNING"
    ]

    for campaign in weak_campaigns:
        insights.append({
            "type": "warning",
            "title": f"{campaign['campaign']} has weak ROAS",
            "what_happened": (
                f"ROAS is {campaign['roas']:.2f}."
            ),
            "why_it_matters": (
                "The campaign is generating less revenue relative "
                "to advertising spend than Athena's efficiency threshold."
            ),
            "recommendation": "Reduce spend and review campaign performance.",
            "campaign": campaign["campaign"],
            "source": "MySQL",
        })

    if channels:
        best_channel = channels[0]

        insights.append({
            "type": "opportunity",
            "title": f"{best_channel['channel']} is the strongest attributed channel",
            "what_happened": (
                f"It has an average ROI of "
                f"{best_channel['average_roi']:.2f}."
            ),
            "why_it_matters": (
                "Higher-return channels may provide stronger "
                "opportunities for future budget allocation."
            ),
            "recommendation": (
                f"Evaluate whether more budget should be allocated "
                f"to {best_channel['channel']}."
            ),
            "channel": best_channel["channel"],
            "source": "MySQL",
        })

    if budgets:
        best_budget_channel = budgets[0]

        insights.append({
            "type": "opportunity",
            "title": "Budget allocation opportunity detected",
            "what_happened": (
                f"{best_budget_channel['channel']} has the highest "
                f"expected return-to-cost ratio in the allocation data."
            ),
            "why_it_matters": (
                "Existing allocation data suggests differences "
                "in expected efficiency across channels."
            ),
            "recommendation": (
                "Review future budget allocation using expected return "
                "and cost efficiency."
            ),
            "channel": best_budget_channel["channel"],
            "source": "MySQL",
        })

    if forecast.get("available"):
        insights.append({
            "type": "observation",
            "title": "30-day revenue forecast available",
            "what_happened": (
                f"Predicted revenue across "
                f"{forecast['days']} days is "
                f"₹{forecast['total_predicted_revenue']:,.2f}."
            ),
            "why_it_matters": (
                "The forecast provides a forward-looking reference "
                "for planning and decision-making."
            ),
            "recommendation": (
                "Use the forecast alongside campaign efficiency "
                "when planning future spend."
            ),
            "source": "MySQL",
        })

    return insights


def generate_mysql_intelligence():
    """
    Main MySQL intelligence pipeline.
    """

    advertising = load_advertising()
    sales_kpis = load_sales_kpis()
    products = load_products()
    campaign_analysis = load_campaign_analysis()
    attribution = load_attribution()
    cost_analysis = load_cost_analysis()
    revenue_forecast = load_revenue_forecast()
    allocated_budget = load_allocated_budget()

    campaigns = calculate_campaign_intelligence(
        advertising
    )

    channels = calculate_channel_intelligence(
        attribution
    )

    budgets = calculate_budget_intelligence(
        allocated_budget
    )

    forecast = calculate_forecast_intelligence(
        revenue_forecast
    )

    insights = generate_insights(
        campaigns,
        channels,
        budgets,
        forecast
    )

    total_spend = sum(
        c["spend"] for c in campaigns
    )

    total_sales = sum(
        c["sales"] for c in campaigns
    )

    total_clicks = sum(
        c["clicks"] for c in campaigns
    )

    total_conversions = sum(
        c["conversions"] for c in campaigns
    )

    summary = {
        "total_ad_spend": round(total_spend, 2),
        "total_sales": round(total_sales, 2),
        "overall_roas": round(
            safe_divide(total_sales, total_spend),
            4
        ),
        "total_clicks": total_clicks,
        "total_conversions": total_conversions,
        "campaign_count": len(campaigns),
        "critical_campaigns": len([
            c for c in campaigns
            if c["health"] == "CRITICAL"
        ]),
        "warning_campaigns": len([
            c for c in campaigns
            if c["health"] == "WARNING"
        ]),
        "source": "MySQL",
    }

    return {
        "summary": summary,
        "campaigns": campaigns,
        "channels": channels,
        "budgets": budgets,
        "forecast": forecast,
        "insights": insights,

        # These are included for future integration.
        "products": products,
        "sales_kpis": sales_kpis,
        "campaign_analysis": campaign_analysis,
        "cost_analysis": cost_analysis,

        "data_source": "mysql",
    }


if __name__ == "__main__":

    print("\n======================================")
    print(" ATHENA MYSQL INTELLIGENCE ENGINE")
    print("======================================\n")

    result = generate_mysql_intelligence()

    print("SUMMARY")
    print("--------------------------------------")

    for key, value in result["summary"].items():
        print(f"{key}: {value}")

    print("\nCAMPAIGNS")
    print("--------------------------------------")

    for campaign in result["campaigns"]:
        print(
            f"{campaign['campaign']} | "
            f"Spend: {campaign['spend']:.2f} | "
            f"Sales: {campaign['sales']:.2f} | "
            f"ROAS: {campaign['roas']:.2f} | "
            f"Action: {campaign['recommended_action']}"
        )

    print("\nCHANNELS")
    print("--------------------------------------")

    for channel in result["channels"]:
        print(
            f"{channel['channel']} | "
            f"ROI: {channel['average_roi']:.2f}"
        )

    print("\nINSIGHTS")
    print("--------------------------------------")

    for insight in result["insights"]:
        print(
            f"[{insight['type'].upper()}] "
            f"{insight['title']}"
        )

    print("\n======================================")
    print(" INTELLIGENCE ENGINE COMPLETE")
    print("======================================")