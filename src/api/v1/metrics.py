from fastapi import APIRouter, Depends

from core.database import db
from core.deps import get_current_user

router = APIRouter()


@router.get("/overview")
async def get_overview(current_user=Depends(get_current_user)):
    tenant_id = current_user["tenant_id"]

    contacts = await db.fetchval(
        "SELECT COUNT(*) FROM crm_contacts WHERE tenant_id = $1", tenant_id
    )
    products = await db.fetchval(
        "SELECT COUNT(*) FROM erp_products WHERE tenant_id = $1", tenant_id
    )
    orders = await db.fetchval(
        "SELECT COUNT(*) FROM erp_orders WHERE tenant_id = $1", tenant_id
    )
    campaigns = await db.fetchval(
        "SELECT COUNT(*) FROM studio_campaigns WHERE tenant_id = $1", tenant_id
    )
    tickets = await db.fetchval(
        "SELECT COUNT(*) FROM support_tickets WHERE tenant_id = $1", tenant_id
    )

    return {
        "contacts": contacts,
        "products": products,
        "orders": orders,
        "campaigns": campaigns,
        "tickets": tickets,
    }
