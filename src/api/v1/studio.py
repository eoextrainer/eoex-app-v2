from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel

from core.database import db
from core.deps import get_current_user

router = APIRouter()


class CampaignCreate(BaseModel):
    name: str
    campaign_type: str
    status: str = "draft"
    budget: Optional[float] = None


@router.get("/campaigns")
async def list_campaigns(
    current_user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * limit
    items = await db.fetch(
        """
        SELECT * FROM studio_campaigns
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        """,
        current_user["tenant_id"],
        limit,
        offset,
    )
    total = await db.fetchval(
        "SELECT COUNT(*) FROM studio_campaigns WHERE tenant_id = $1",
        current_user["tenant_id"],
    )
    return {"items": [dict(row) for row in items], "total": total}


@router.post("/campaigns", status_code=status.HTTP_201_CREATED)
async def create_campaign(payload: CampaignCreate, current_user=Depends(get_current_user)):
    row = await db.fetchrow(
        """
        INSERT INTO studio_campaigns (
            tenant_id, name, campaign_type, status, budget, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        """,
        current_user["tenant_id"],
        payload.name,
        payload.campaign_type,
        payload.status,
        payload.budget,
        current_user["user_id"],
    )
    return dict(row)
