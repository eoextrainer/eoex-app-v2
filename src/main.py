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

    password_hash = get_password_hash("Welcome123!")
    users = [
        ("system.admin@eoex.com", "system", "Admin", "system_admin"),
        ("crm.manager@eoex.com", "CRM", "Manager", "crm_manager"),
        ("studio.manager@eoex.com", "Studio", "Manager", "studio_manager"),
        ("erp.manager@eoex.com", "ERP", "Manager", "erp_manager"),
        ("service.manager@eoex.com", "Service", "Manager", "service_manager"),
        ("bdr@eoex.com", "Business", "Development", "crm_bdr"),
        ("sales.manager@eoex.com", "Sales", "Account", "crm_sales_manager"),
        ("marketing.manager@eoex.com", "Marketing", "Manager", "studio_marketing_manager"),
        ("digital.marketing@eoex.com", "Digital", "Marketing", "studio_digital_marketing"),
        ("campaign.manager@eoex.com", "Campaign", "Manager", "studio_campaign_manager"),
        ("hr.manager@eoex.com", "HR", "Manager", "erp_hr_manager"),
        ("finance.manager@eoex.com", "Finance", "Manager", "erp_finance_manager"),
        ("resource.planner@eoex.com", "Resource", "Planner", "erp_resource_planning_manager"),
        ("ceo@eoex.com", "Chief", "Executive", "erp_ceo"),
        ("support.l1@eoex.com", "Level 1", "Support", "service_level1"),
        ("support.l2@eoex.com", "Level 2", "Support", "service_level2"),
        ("support.l3@eoex.com", "Level 3", "Support", "service_level3"),
    ]

    for email, first_name, last_name, role in users:
        existing_user = await db.fetchval(
            "SELECT 1 FROM users WHERE email = $1",
            email,
        )
        if existing_user:
            await db.execute(
                """
                UPDATE users
                SET password_hash = $1,
                    role = $2,
                    first_name = $3,
                    last_name = $4,
                    is_active = true
                WHERE email = $5
                """,
                password_hash,
                role,
                first_name,
                last_name,
                email,
            )
        else:
            await db.execute(
                """
                INSERT INTO users (
                    tenant_id, username, email, password_hash, first_name, last_name, role
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                tenant["tenant_id"],
                email.split("@")[0],
                email,
                password_hash,
                first_name,
                last_name,
                role,
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
