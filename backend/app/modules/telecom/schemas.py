from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class UssdCallbackRequest(BaseModel):
    sessionId: str
    serviceCode: str = "*347*88#"
    phoneNumber: str
    text: str = ""  # The user navigation input e.g. "1" or "3*804"


class SmsSendRequest(BaseModel):
    recipient_phone: str
    message_text: str
    message_type: str = "DIRECT_ALERT"


class SmsLogResponse(BaseModel):
    id: int
    recipient_phone: str
    message_text: str
    message_type: str
    status: str
    sent_at: datetime

    model_config = ConfigDict(from_attributes=True)
