from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel

from core.database import db
from core.deps import get_current_user

router = APIRouter()


class TicketCreate(BaseModel):
    subject: str
    description: str
    priority: str = "medium"
    status: str = "open"


@router.get("/tickets")
async def list_tickets(
    current_user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * limit
    items = await db.fetch(
        """
        SELECT * FROM support_tickets
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        """,
        current_user["tenant_id"],
        limit,
        offset,
    )
    total = await db.fetchval(
        "SELECT COUNT(*) FROM support_tickets WHERE tenant_id = $1",
        current_user["tenant_id"],
    )
    return {"items": [dict(row) for row in items], "total": total}


@router.post("/tickets", status_code=status.HTTP_201_CREATED)
async def create_ticket(payload: TicketCreate, current_user=Depends(get_current_user)):
    row = await db.fetchrow(
        """
        INSERT INTO support_tickets (
            tenant_id, ticket_number, subject, description, priority, status, assigned_to
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        """,
        current_user["tenant_id"],
        f"TKT-{current_user['user_id'][:6]}-{payload.subject[:6].upper()}",
        payload.subject,
        payload.description,
        payload.priority,
        payload.status,
        current_user["user_id"],
    )
    return dict(row)
