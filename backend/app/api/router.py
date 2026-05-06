from fastapi import APIRouter
from app.api.endpoints import jobs, webhooks

api_router = APIRouter()

api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
