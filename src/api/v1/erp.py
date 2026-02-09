from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel

from core.database import db
from core.deps import get_current_user

router = APIRouter()


class ProductCreate(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    unit_price: float
    stock_quantity: int = 0


@router.get("/products")
async def list_products(
    current_user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * limit
    items = await db.fetch(
        """
        SELECT * FROM erp_products
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        """,
        current_user["tenant_id"],
        limit,
        offset,
    )
    total = await db.fetchval(
        "SELECT COUNT(*) FROM erp_products WHERE tenant_id = $1",
        current_user["tenant_id"],
    )
    return {"items": [dict(row) for row in items], "total": total}


@router.post("/products", status_code=status.HTTP_201_CREATED)
async def create_product(payload: ProductCreate, current_user=Depends(get_current_user)):
    row = await db.fetchrow(
        """
        INSERT INTO erp_products (
            tenant_id, sku, name, description, category, unit_price, stock_quantity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        """,
        current_user["tenant_id"],
        payload.sku,
        payload.name,
        payload.description,
        payload.category,
        payload.unit_price,
        payload.stock_quantity,
    )
    return dict(row)


@router.get("/orders")
async def list_orders(
    current_user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * limit
    items = await db.fetch(
        """
        SELECT * FROM erp_orders
        WHERE tenant_id = $1
        ORDER BY order_date DESC
        LIMIT $2 OFFSET $3
        """,
        current_user["tenant_id"],
        limit,
        offset,
    )
    total = await db.fetchval(
        "SELECT COUNT(*) FROM erp_orders WHERE tenant_id = $1",
        current_user["tenant_id"],
    )
    return {"items": [dict(row) for row in items], "total": total}
