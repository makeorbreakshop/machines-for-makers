from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class Machine(BaseModel):
    """Model representing a machine in the database"""
    id: str
    name: str = Field(alias="Machine Name")
    company: str = Field(alias="Company")
    affiliate_link: Optional[str] = Field(alias="Affiliate Link", default=None)
    product_link: Optional[str] = None
    price: Optional[float] = Field(alias="Price", default=None)
    price_configuration_identifier: Optional[str] = None
    
    class Config:
        populate_by_name = True

class PriceExtraction(BaseModel):
    """Model representing price extraction result"""
    machine_id: str
    success: bool
    new_price: Optional[float] = None
    currency: str = "USD"
    error: Optional[str] = None
    debug_info: Optional[Dict[str, Any]] = None

class PriceUpdateResponse(BaseModel):
    """API response model for price updates"""
    success: bool
    message: str
    machine_id: str
    new_price: Optional[float] = None
    currency: Optional[str] = None
    debug_info: Optional[Dict[str, Any]] = None

class BatchUpdateRequest(BaseModel):
    """API request model for batch price updates"""
    machine_ids: List[str]
    debug_mode: bool = False

class BatchUpdateResponse(BaseModel):
    """API response model for batch price updates"""
    success: bool
    message: str
    results: List[Dict[str, Any]]
    failed_count: int
    success_count: int

class BatchStatusResponse(BaseModel):
    """API response model for batch status"""
    batch_id: str
    status: str
    machine_count: int
    success_count: Optional[int] = None
    failed_count: Optional[int] = None
    created_at: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    results: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None

class PriceHistoryRecord(BaseModel):
    """Model for price history records"""
    machine_id: str
    price: float
    currency: str = "USD"
    extraction_date: str
    html_content: Optional[str] = None
    debug_info: Optional[Dict[str, Any]] = None 