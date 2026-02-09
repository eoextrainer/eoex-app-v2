from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr

from core.database import db
from core.deps import get_current_user

router = APIRouter()


class ContactCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: str = "new"


class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: Optional[str] = None


@router.get("/contacts")
async def list_contacts(
    current_user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
):
    offset = (page - 1) * limit
    params = [current_user["tenant_id"]]
    filters = ""

    if search:
        params.append(f"%{search}%")
        filters += f" AND (first_name ILIKE ${len(params)} OR last_name ILIKE ${len(params)} OR email ILIKE ${len(params)})"

    if status:
        params.append(status)
        filters += f" AND status = ${len(params)}"

    query = (
        "SELECT * FROM crm_contacts WHERE tenant_id = $1"
        + filters
        + f" ORDER BY created_at DESC LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}"
    )
    params.extend([limit, offset])

    items = await db.fetch(query, *params)
    total = await db.fetchval(
        "SELECT COUNT(*) FROM crm_contacts WHERE tenant_id = $1" + filters,
        *params[: len(params) - 2],
    )

    return {
        "items": [dict(row) for row in items],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.post("/contacts", status_code=status.HTTP_201_CREATED)
async def create_contact(payload: ContactCreate, current_user=Depends(get_current_user)):
    row = await db.fetchrow(
        """
        INSERT INTO crm_contacts (
            tenant_id, first_name, last_name, email, phone, company, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        """,
        current_user["tenant_id"],
        payload.first_name,
        payload.last_name,
        payload.email,
        payload.phone,
        payload.company,
        payload.status,
    )
    return dict(row)


@router.patch("/contacts/{contact_id}")
async def update_contact(
    contact_id: str, payload: ContactUpdate, current_user=Depends(get_current_user)
):
    updates = payload.dict(exclude_unset=True)
    if not updates:
        return {"status": "no_changes"}

    set_clauses = []
    params = []
    for field, value in updates.items():
        params.append(value)
        set_clauses.append(f"{field} = ${len(params)}")

    params.extend([current_user["tenant_id"], contact_id])
    query = (
        f"UPDATE crm_contacts SET {', '.join(set_clauses)} "
        f"WHERE tenant_id = ${len(params) - 1} AND contact_id = ${len(params)} RETURNING *"
    )

    row = await db.fetchrow(query, *params)
    if not row:
        raise HTTPException(status_code=404, detail="Contact not found")
    return dict(row)


@router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, current_user=Depends(get_current_user)):
    result = await db.fetchval(
        "DELETE FROM crm_contacts WHERE tenant_id = $1 AND contact_id = $2 RETURNING 1",
        current_user["tenant_id"],
        contact_id,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"status": "deleted"}
