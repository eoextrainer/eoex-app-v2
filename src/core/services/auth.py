from typing import Any, Dict, Optional

from fastapi import HTTPException, status

from ..database import db
from ..utils.security import get_password_hash, verify_password, create_access_token


class AuthService:
    async def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        query = """
            SELECT user_id, tenant_id, email, password_hash, is_active, role
            FROM users
            WHERE email = $1 AND is_active = true
        """
        user = await db.fetchrow(query, email)
        if not user:
            return None
        if not verify_password(password, user["password_hash"]):
            return None

        return {
            "user_id": str(user["user_id"]),
            "tenant_id": str(user["tenant_id"]),
            "email": user["email"],
            "role": user["role"],
        }

    async def register_user(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        existing = await db.fetchval("SELECT 1 FROM users WHERE email = $1", payload["email"])
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        tenant_id = payload["tenant_id"]
        hashed_password = get_password_hash(payload["password"])

        query = """
            INSERT INTO users (
                tenant_id, username, email, password_hash, first_name, last_name, role
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING user_id, email, role, created_at
        """

        result = await db.fetchrow(
            query,
            tenant_id,
            payload["email"].split("@")[0],
            payload["email"],
            hashed_password,
            payload.get("first_name", ""),
            payload.get("last_name", ""),
            payload.get("role", "user"),
        )

        return dict(result)

    def create_token(self, user: Dict[str, Any]) -> str:
        return create_access_token(
            {"sub": user["user_id"], "tenant_id": user["tenant_id"], "role": user["role"]}
        )
