import stripe
import json
from fastapi import APIRouter, HTTPException, Request, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.services.supabase_client import supabase
from app.core.config import settings

router = APIRouter()

stripe.api_key = settings.STRIPE_SECRET_KEY

PRICE_MAP = {
    "professional": settings.STRIPE_PRICE_PROFESSIONAL,
    "studio_max": settings.STRIPE_PRICE_STUDIO_MAX,
}

PLAN_LABELS = {
    settings.STRIPE_PRICE_PROFESSIONAL: "professional",
    settings.STRIPE_PRICE_STUDIO_MAX: "studio_max",
}


class CheckoutRequest(BaseModel):
    plan: str
    user_id: str
    email: str

class ProfileRequest(BaseModel):
    user_id: str

class SyncSessionRequest(BaseModel):
    session_id: str
    user_id: str

@router.post("/create-profile")
async def create_profile(body: ProfileRequest):
    supabase.table("profiles").upsert(
        {"id": body.user_id, "plan": "starter"},
        on_conflict="id",
        ignore_duplicates=True,
    ).execute()
    return {"ok": True}


@router.post("/create-checkout-session")
async def create_checkout_session(body: CheckoutRequest):
    price_id = PRICE_MAP.get(body.plan)
    if not price_id:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {body.plan}")

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            customer_email=body.email,
            metadata={"user_id": body.user_id, "plan": body.plan},
            success_url=f"{settings.FRONTEND_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.FRONTEND_URL}/#pricing",
        )
        return {"url": session.url}
    except stripe.StripeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    payload = await request.body()

    try:
        # Verify signature with Stripe SDK, then parse as plain dict to avoid
        # StripeObject.get() incompatibility in stripe-python v15+
        stripe.Webhook.construct_event(payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET)
    except stripe.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    event = json.loads(payload)
    event_type = event["type"]
    obj = event["data"]["object"]

    if event_type == "checkout.session.completed":
        metadata = obj.get("metadata") or {}
        user_id = metadata.get("user_id")
        plan = metadata.get("plan")
        stripe_customer_id = obj.get("customer")

        if user_id and plan:
            supabase.table("profiles").upsert({
                "id": user_id,
                "plan": plan,
                "stripe_customer_id": stripe_customer_id,
            }).execute()

    elif event_type in ("customer.subscription.deleted", "customer.subscription.updated"):
        customer_id = obj.get("customer")
        status = obj.get("status")

        result = supabase.table("profiles").select("id").eq("stripe_customer_id", customer_id).execute()
        if result.data:
            user_id = result.data[0]["id"]
            if status in ("canceled", "unpaid", "past_due"):
                supabase.table("profiles").update({"plan": "starter"}).eq("id", user_id).execute()
            elif event_type == "customer.subscription.updated":
                price_id = obj["items"]["data"][0]["price"]["id"]
                updated_plan = PLAN_LABELS.get(price_id)
                if updated_plan:
                    supabase.table("profiles").update({"plan": updated_plan}).eq("id", user_id).execute()

    return JSONResponse({"received": True})


@router.post("/sync-session")
async def sync_session(body: SyncSessionRequest):
    """Fallback for when webhook can't reach localhost — frontend calls this after redirect."""
    try:
        session = stripe.checkout.Session.retrieve(body.session_id)
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if session.get("status") != "complete" or session.get("payment_status") != "paid":
        raise HTTPException(status_code=400, detail="Session not completed")

    metadata = session.get("metadata") or {}
    session_user_id = metadata.get("user_id")

    if session_user_id != body.user_id:
        raise HTTPException(status_code=403, detail="User ID mismatch")

    plan = metadata.get("plan")
    stripe_customer_id = session.get("customer")

    if not plan:
        raise HTTPException(status_code=400, detail="No plan in session metadata")

    supabase.table("profiles").upsert({
        "id": body.user_id,
        "plan": plan,
        "stripe_customer_id": stripe_customer_id,
    }).execute()

    return {"ok": True, "plan": plan}
