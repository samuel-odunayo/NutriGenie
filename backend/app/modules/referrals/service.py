from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.referrals.models import PatientReferral
from app.modules.referrals.schemas import ReferralCreate, ReferralStatusUpdate
from app.modules.identity.models import User
from app.modules.gis.models import HealthFacility
from app.core import events


class ReferralService:
    @staticmethod
    async def create_referral(
        db: AsyncSession,
        data: ReferralCreate,
        current_user: Optional[User] = None
    ) -> PatientReferral:
        ref_dict = data.model_dump()

        # Auto-link patient_id if matching user exists
        if not ref_dict.get("patient_id"):
            stmt_user = select(User).where(User.phone_number == data.patient_phone)
            res_user = await db.execute(stmt_user)
            patient = res_user.scalars().first()
            if patient:
                ref_dict["patient_id"] = patient.id

        # Auto-link chw_id if logged-in user is a health worker
        if current_user and current_user.role in ["CHW", "PHC_ADMIN"]:
            ref_dict["chw_id"] = current_user.id
            if not data.chw_name or data.chw_name == "Fatima Bello (CHEW)":
                ref_dict["chw_name"] = current_user.full_name

        # Auto-link facility_id if matching PHC facility exists
        if not ref_dict.get("facility_id") and data.phc_name:
            stmt_fac = select(HealthFacility).where(HealthFacility.name == data.phc_name)
            res_fac = await db.execute(stmt_fac)
            fac = res_fac.scalars().first()
            if fac:
                ref_dict["facility_id"] = fac.id

        referral = PatientReferral(**ref_dict)
        db.add(referral)
        await db.commit()
        await db.refresh(referral)

        # Publish in-process domain event so Telecom module triggers SMS dispatch
        payload = {
            "id": referral.id,
            "patient_name": referral.patient_name,
            "patient_phone": referral.patient_phone,
            "phc_name": referral.phc_name,
            "scheduled_date": referral.scheduled_date,
        }
        await events.publish("referral.created", payload)

        return referral

    @staticmethod
    async def list_referrals(
        db: AsyncSession,
        current_user: User,
        ward_name: Optional[str] = None
    ) -> List[PatientReferral]:
        stmt = select(PatientReferral).order_by(PatientReferral.id.desc())

        # Enforce patient privacy / NDPR role segregation:
        if current_user.role == "CITIZEN":
            # Citizens can strictly view their own referrals
            stmt = stmt.where(
                (PatientReferral.patient_phone == current_user.phone_number) |
                (PatientReferral.patient_id == current_user.id)
            )
        elif current_user.role == "CHW":
            # Health workers see referrals in their assigned ward or ones they authored
            if ward_name:
                stmt = stmt.where(PatientReferral.ward_name == ward_name)
            elif current_user.ward_name:
                stmt = stmt.where(
                    (PatientReferral.ward_name == current_user.ward_name) |
                    (PatientReferral.chw_id == current_user.id)
                )
        elif current_user.role == "PHC_ADMIN":
            if ward_name:
                stmt = stmt.where(PatientReferral.ward_name == ward_name)

        res = await db.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def update_status(
        db: AsyncSession,
        referral_id: int,
        status_in: ReferralStatusUpdate,
        current_user: User
    ) -> Optional[PatientReferral]:
        stmt = select(PatientReferral).where(PatientReferral.id == referral_id)
        res = await db.execute(stmt)
        ref = res.scalars().first()
        if ref:
            ref.status = status_in.status.upper()
            await db.commit()
            await db.refresh(ref)
        return ref
