from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.telecom.models import SmsLog
from app.modules.identity.models import User
from app.modules.gis.models import HealthFacility
from app.modules.referrals.models import PatientReferral
from app.core.database import AsyncSessionLocal
from app.core import events


class TelecomService:
    @staticmethod
    async def handle_ussd_menu(phone_number: str, text: str) -> str:
        """
        ITU-T USSD State Machine for *347*88# connected to live database entities.
        Returns response string starting with 'CON' (continue) or 'END' (terminate).
        """
        trimmed = text.strip()
        parts = trimmed.split("*") if trimmed else []

        # Root Menu
        if not trimmed:
            return (
                "CON Welcome to NutriGenie (USPF GeoHealth)\n"
                "1. Find Nearest PHC\n"
                "2. Today's Local Nutrition Tip\n"
                "3. Check Referral Status\n"
                "4. Request CHW Home Visit"
            )

        async with AsyncSessionLocal() as session:
            # Level 1 Option 1: Nearest PHC (Live DB Query)
            if parts[0] == "1":
                # Look up user's ward if registered
                user_stmt = select(User).where(User.phone_number == phone_number)
                user_res = await session.execute(user_stmt)
                user = user_res.scalars().first()
                ward = user.ward_name if user and user.ward_name else "Bwari Central"

                fac_stmt = select(HealthFacility).where(
                    (HealthFacility.ward_name == ward) & (HealthFacility.facility_type == "PHC")
                )
                fac_res = await session.execute(fac_stmt)
                phc = fac_res.scalars().first()

                if not phc:
                    # Fallback to any PHC in database
                    all_phc_stmt = select(HealthFacility).where(HealthFacility.facility_type == "PHC")
                    all_phc_res = await session.execute(all_phc_stmt)
                    phc = all_phc_res.scalars().first()

                if phc:
                    return (
                        f"END Nearest PHC: {phc.name} ({ward}).\n"
                        f"Hours: {phc.operating_hours}\n"
                        f"Line: {phc.contact_phone or '08031112233'}"
                    )
                return "END No primary healthcare centre registered in your area yet. Dial 112 for emergency."

            # Level 1 Option 2: Nutrition Tip
            if parts[0] == "2":
                return (
                    "END Local Health Tip:\n"
                    "Cook brown beans with sweet yam and ugwu (pumpkin leaves) to boost iron & combat anemia. "
                    "Red palm oil adds vital Vitamin A for maternal and child health."
                )

            # Level 1 Option 3: Check Referral (Live DB Query)
            if parts[0] == "3":
                if len(parts) == 1:
                    return "CON Enter your Referral ID (e.g., 1):"
                
                ref_id_str = parts[1].strip()
                try:
                    ref_id = int(ref_id_str)
                except ValueError:
                    return f"END Invalid Referral ID '{ref_id_str}'. Please dial *347*88# to try again."

                stmt = select(PatientReferral).where(PatientReferral.id == ref_id)
                res = await session.execute(stmt)
                referral = res.scalars().first()

                if referral:
                    return (
                        f"END Referral #{referral.id} is {referral.status}.\n"
                        f"Patient: {referral.patient_name}\n"
                        f"Facility: {referral.phc_name}\n"
                        f"Appointment: {referral.scheduled_date}"
                    )
                return f"END Referral #{ref_id} was not found. Please contact your community health worker."

            # Level 1 Option 4: Request CHW Home Visit (Live DB Insert)
            if parts[0] == "4":
                # Find if caller is registered
                user_stmt = select(User).where(User.phone_number == phone_number)
                user_res = await session.execute(user_stmt)
                user = user_res.scalars().first()

                patient_name = user.full_name if user else f"Citizen ({phone_number})"
                ward = user.ward_name if user and user.ward_name else "Bwari Central"

                new_referral = PatientReferral(
                    patient_id=user.id if user else None,
                    patient_name=patient_name,
                    patient_phone=phone_number,
                    patient_category=user.patient_category if user else "Home Visit Request",
                    ward_name=ward,
                    chw_name="Community Health Post",
                    phc_name="Bwari Model Primary Health Care",
                    diagnosis_reason="Urgent CHW Home Visit requested via USSD *347*88#",
                    scheduled_date="Immediate Follow-up",
                    status="PENDING"
                )
                session.add(new_referral)
                await session.commit()
                await session.refresh(new_referral)

                # Broadcast domain event
                await events.publish("referral.created", {
                    "id": new_referral.id,
                    "patient_name": new_referral.patient_name,
                    "patient_phone": new_referral.patient_phone,
                    "phc_name": new_referral.phc_name,
                    "scheduled_date": new_referral.scheduled_date,
                })

                return (
                    f"END Visit request #{new_referral.id} logged for {ward}.\n"
                    "A Community Health Worker has been alerted and will reach out to you shortly."
                )

        return "END Invalid option selected. Dial *347*88# to try again."

    @staticmethod
    async def log_and_send_sms(
        recipient_phone: str,
        message_text: str,
        message_type: str = "DIRECT_ALERT"
    ) -> SmsLog:
        """Simulate telco SMS gateway dispatch and log to database."""
        async with AsyncSessionLocal() as session:
            log_entry = SmsLog(
                recipient_phone=recipient_phone,
                message_text=message_text,
                message_type=message_type,
                status="DELIVERED"
            )
            session.add(log_entry)
            await session.commit()
            await session.refresh(log_entry)
            print(f"[SMS DISPATCH to {recipient_phone}]: {message_text}")
            return log_entry


# Register domain event listener:
# When a referral is created anywhere in the monolith, trigger an SMS notification automatically!
async def on_referral_created(payload: dict):
    phone = payload.get("patient_phone", "+2348000000000")
    name = payload.get("patient_name", "Patient")
    phc_name = payload.get("phc_name", "Local Primary Health Care")
    date_str = payload.get("scheduled_date", "Tuesday 9:00 AM")
    ref_id = payload.get("id", "804")

    msg = f"NutriGenie Alert: Hello {name}, your referral #{ref_id} at {phc_name} is set for {date_str}. Dial *347*88# for directions."
    await TelecomService.log_and_send_sms(
        recipient_phone=phone,
        message_text=msg,
        message_type="REFERRAL_CONFIRMATION"
    )


# Hook listener to in-process event bus
events.subscribe("referral.created", on_referral_created)
