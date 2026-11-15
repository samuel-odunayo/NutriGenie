from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.core.database import Base


class SmsLog(Base):
    __tablename__ = "sms_logs"

    id = Column(Integer, primary_key=True, index=True)
    recipient_phone = Column(String(30), nullable=False)
    message_text = Column(Text, nullable=False)
    message_type = Column(String(50), default="APPOINTMENT_REMINDER")  # NUTRITION_TIP, REFERRAL_ALERT
    status = Column(String(20), default="DELIVERED")                   # PENDING, DELIVERED, FAILED
    sent_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
