from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from core.database import db
from core.services.auth import AuthService

router = APIRouter()
auth_service = AuthService()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    tenant_name: str
    tenant_domain: str
    email: EmailStr
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None


@router.post("/login")
async def login(payload: LoginRequest):
    user = await auth_service.authenticate_user(payload.email, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = auth_service.create_token(user)
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/register")
async def register(payload: RegisterRequest):
    tenant_row = await db.fetchrow(
        "SELECT tenant_id FROM tenants WHERE tenant_domain = $1",
        payload.tenant_domain,
    )
    if tenant_row:
        tenant_id = tenant_row["tenant_id"]
    else:
        tenant_row = await db.fetchrow(
            """
            INSERT INTO tenants (tenant_name, tenant_domain)
            VALUES ($1, $2)
            RETURNING tenant_id
            """,
            payload.tenant_name,
            payload.tenant_domain,
        )
        tenant_id = tenant_row["tenant_id"]

    user = await auth_service.register_user(
        {
            "tenant_id": tenant_id,
            "email": payload.email,
            "password": payload.password,
            "first_name": payload.first_name,
            "last_name": payload.last_name,
            "role": "admin",
        }
    )

    return {"user": user, "tenant_id": str(tenant_id)}
