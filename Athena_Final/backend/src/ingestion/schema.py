from pydantic import BaseModel
from datetime import date

class AdvertisingData(BaseModel):
    campaign_id: str
    platform: str
    sku: str
    date: date

    spend: float
    impressions: int
    clicks: int
    conversions: int

class SalesData(BaseModel):
    order_id: str
    sku: str
    date: date
    units_sold: int
    revenue: float

class ProductData(BaseModel):
    sku: str
    product_name: str

    selling_price: float
    cost_price: float

class InventoryData(BaseModel):
    sku: str
    available_units: int

class UnifiedCampaignData(BaseModel):
    campaign_id: str
    platform: str
    sku: str
    date: date

    spend: float
    impressions: int
    clicks: int
    conversions: int

    revenue: float
    units_sold: int

    selling_price: float
    cost_price: float

    available_units: int

