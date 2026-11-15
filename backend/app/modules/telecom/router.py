from typing import List
from fastapi import APIRouter, Depends, Form, HTTPException, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.modules.telecom.models import SmsLog
from app.modules.identity.models import User
from app.modules.identity.dependencies import get_current_user, require_role
from app.modules.telecom.schemas import SmsSendRequest, SmsLogResponse
from app.modules.telecom.service import TelecomService

router = APIRouter(prefix="/telecom", tags=["USSD & Telecom Messaging"])


@router.post("/ussd", response_class=PlainTextResponse)
async def ussd_callback(
    sessionId: str = Form(...),
    serviceCode: str = Form("*347*88#"),
    phoneNumber: str = Form(...),
    text: str = Form("")
):
    """
    Standard Africa's Talking / Telco USSD Webhook Callback.
    Accepts Form data and returns plain text starting with 'CON' or 'END'.
    """
    return await TelecomService.handle_ussd_menu(phone_number=phoneNumber, text=text)


@router.post("/sms/send", response_model=SmsLogResponse)
async def send_sms(
    payload: SmsSendRequest,
    current_user: User = Depends(require_role(["CHW", "PHC_ADMIN"]))
):
    """Manually dispatch a health/referral notification SMS (Restricted to CHWs & Admins)."""
    return await TelecomService.log_and_send_sms(
        recipient_phone=payload.recipient_phone,
        message_text=payload.message_text,
        message_type=payload.message_type
    )


@router.get("/sms/history", response_model=List[SmsLogResponse])
async def list_sms_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    View log of automated SMS alerts sent to rural patients.
    Citizens only view alerts sent to their own phone number; CHWs and Admins view all.
    """
    stmt = select(SmsLog).order_by(SmsLog.id.desc())
    if current_user.role == "CITIZEN":
        stmt = stmt.where(SmsLog.recipient_phone == current_user.phone_number)
    
    res = await db.execute(stmt)
    logs = list(res.scalars().all())

    # Redact middle phone digits for citizen security if necessary
    return logs
