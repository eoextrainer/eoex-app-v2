from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from loguru import logger

from core.config import get_settings
from core.database import db
from core.utils.security import get_password_hash
from api.v1 import auth, crm, erp, studio, support, metrics


FRONTEND_DIR = Path(__file__).parent / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    await db.connect(settings.database_url)

    await ensure_bootstrap_admin()
    logger.info("Application startup complete")
    yield
    await db.disconnect()
    logger.info("Application shutdown complete")


async def ensure_bootstrap_admin() -> None:
    tenant = await db.fetchrow(
        "SELECT tenant_id FROM tenants WHERE tenant_domain = $1",
        "eoex.local",
    )
    if not tenant:
        tenant = await db.fetchrow(
            """
            INSERT INTO tenants (tenant_name, tenant_domain)
            VALUES ($1, $2)
            RETURNING tenant_id
            """,
            "EOEX",
            "eoex.local",
        )

    existing_user = await db.fetchval(
        "SELECT 1 FROM users WHERE email = $1",
        "admin@eoex.com",
    )
    if not existing_user:
        legacy_user = await db.fetchval(
            "SELECT 1 FROM users WHERE email = $1",
            "admin@eoex.local",
        )
        if legacy_user:
            await db.execute(
                """
                UPDATE users
                SET email = $1, username = $2, password_hash = $3, is_active = true
                WHERE email = $4
                """,
                "admin@eoex.com",
                "admin",
                get_password_hash("admin123"),
                "admin@eoex.local",
            )
        else:
            await db.execute(
                """
                INSERT INTO users (
                    tenant_id, username, email, password_hash, first_name, last_name, role
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                tenant["tenant_id"],
                "admin",
                "admin@eoex.com",
                get_password_hash("admin123"),
                "EOEX",
                "Admin",
                "admin",
            )


app = FastAPI(
    title="EOEX Application Suite",
    description="Multi-tenant SaaS Platform with CRM, ERP, Studio, and Support",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(crm.router, prefix="/api/v1/crm", tags=["CRM"])
app.include_router(erp.router, prefix="/api/v1/erp", tags=["ERP"])
app.include_router(studio.router, prefix="/api/v1/studio", tags=["Studio"])
app.include_router(support.router, prefix="/api/v1/support", tags=["Support"])
app.include_router(metrics.router, prefix="/api/v1/metrics", tags=["Metrics"])


@app.get("/api/health")
async def health_check():
    await db.fetchval("SELECT 1")
    return {"status": "healthy"}


if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


@app.get("/")
async def root():
    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return {"message": "EOEX backend running"}
