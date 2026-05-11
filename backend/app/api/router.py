from fastapi import APIRouter
from app.api.endpoints import jobs, webhooks, payments

api_router = APIRouter()

api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
