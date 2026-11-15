import asyncio
import httpx
from app.main import app, init_db

async def run_tests():
    await init_db()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Test Root
        r1 = await client.get("/")
        print("GET / ->", r1.status_code, r1.json().get("security"))
        assert r1.status_code == 200

        # 2. Test User Registration with JWT
        reg_payload = {
            "full_name": "Amina Mohammed",
            "phone_number": "+2348011223344",
            "password": "pass1234Secure",
            "role": "CITIZEN",
            "patient_category": "Pregnant Mother",
            "ward_name": "Bwari Central",
            "state": "FCT"
        }
        r2 = await client.post("/api/v1/identity/register", json=reg_payload)
        if r2.status_code == 400:
            # Already registered, log in instead
            r2 = await client.post("/api/v1/identity/login", json={
                "phone_number": "+2348011223344",
                "password": "pass1234Secure"
            })
        print("Auth Response ->", r2.status_code)
        assert r2.status_code == 200
        auth_data = r2.json()
        token = auth_data["access_token"]
        assert token and token.startswith("ey")  # Valid JWT format
        auth_headers = {"Authorization": f"Bearer {token}"}

        # 3. Test /identity/me protected endpoint
        r3 = await client.get("/api/v1/identity/me", headers=auth_headers)
        print("GET /api/v1/identity/me ->", r3.status_code, r3.json().get("full_name"))
        assert r3.status_code == 200

        # 4. Test unauthorized request rejection (Zero-trust check)
        r4 = await client.get("/api/v1/identity/me")
        print("GET /api/v1/identity/me (No token) ->", r4.status_code)
        assert r4.status_code == 401

        # 5. Test Nutrition Dishes
        r5 = await client.get("/api/v1/nutrition/dishes")
        dishes = r5.json()
        print(f"GET /api/v1/nutrition/dishes -> {r5.status_code}, {len(dishes)} dishes")
        assert len(dishes) >= 4

        # 6. Test Daily Plan with Maternal Cohort
        r6 = await client.get("/api/v1/nutrition/daily-plan?cohort=Pregnant%20Mother", headers=auth_headers)
        plan = r6.json()
        print(f"GET /api/v1/nutrition/daily-plan (Pregnant) -> Target Iron: {plan['summary']['target_iron_mg']} mg, Label: {plan['cohort']}")
        assert plan["summary"]["target_iron_mg"] == 27.0

        # 7. Test Logging Meal Intake to Cloud DB
        r7 = await client.post(
            "/api/v1/nutrition/intake",
            headers=auth_headers,
            json={"dish_id": dishes[0]["id"], "log_date": "2026-11-15", "meal_type": "Breakfast"}
        )
        print("POST /api/v1/nutrition/intake ->", r7.status_code, r7.json().get("dish", {}).get("name"))
        assert r7.status_code == 200
        intake_id = r7.json()["id"]

        # 8. Query User Intake History
        r8 = await client.get("/api/v1/nutrition/intake?date=2026-11-15", headers=auth_headers)
        history = r8.json()
        print(f"GET /api/v1/nutrition/intake -> {len(history)} meals logged")
        assert len(history) >= 1

        # 9. Register a CHW with admin secret
        chw_reg = {
            "full_name": "Fatima Bello (CHEW)",
            "phone_number": "+2348147778899",
            "password": "chewPassword2026",
            "role": "CHW",
            "ward_name": "Bwari Central",
            "state": "FCT"
        }
        r9 = await client.post("/api/v1/identity/register", json=chw_reg)
        if r9.status_code == 400:
            r9 = await client.post("/api/v1/identity/login", json={
                "phone_number": "+2348147778899",
                "password": "chewPassword2026"
            })
        chw_token = r9.json()["access_token"]
        chw_headers = {"Authorization": f"Bearer {chw_token}"}

        # 10. Create Referral
        r10 = await client.post(
            "/api/v1/referrals/",
            headers=chw_headers,
            json={
                "patient_name": "Amina Mohammed",
                "patient_phone": "+2348011223344",
                "patient_category": "Pregnant Mother",
                "ward_name": "Bwari Central",
                "chw_name": "Fatima Bello (CHEW)",
                "phc_name": "Bwari Model Primary Health Care",
                "diagnosis_reason": "High stunting risk / maternal iron supplement check",
                "scheduled_date": "Thursday 10:00 AM"
            }
        )
        ref_data = r10.json()
        print("POST /api/v1/referrals/ ->", r10.status_code, "Referral ID:", ref_data["id"])
        assert r10.status_code == 200
        referral_id = ref_data["id"]

        # 11. Test List Referrals as Authenticated User
        r11 = await client.get("/api/v1/referrals/", headers=auth_headers)
        print("GET /api/v1/referrals/ (Citizen) -> Found:", len(r11.json()))
        assert len(r11.json()) >= 1

        # 12. Test USSD Option 1: Live DB query for nearest PHC
        r12 = await client.post(
            "/api/v1/telecom/ussd",
            data={"sessionId": "ussd-99", "serviceCode": "*347*88#", "phoneNumber": "+2348011223344", "text": "1"}
        )
        print("POST /api/v1/telecom/ussd (Option 1 - Live DB) ->\n" + r12.text)
        assert "Nearest PHC: Bwari Model Primary Health Care" in r12.text

        # 13. Test USSD Option 3: Live DB query for Referral Status
        r13 = await client.post(
            "/api/v1/telecom/ussd",
            data={"sessionId": "ussd-99", "serviceCode": "*347*88#", "phoneNumber": "+2348011223344", "text": f"3*{referral_id}"}
        )
        print(f"POST /api/v1/telecom/ussd (Option 3 - Live DB Ref #{referral_id}) ->\n" + r13.text)
        assert f"Referral #{referral_id} is PENDING" in r13.text
        assert "Amina Mohammed" in r13.text

        # 14. Test USSD Option 4: Live DB request creation for CHW home visit
        r14 = await client.post(
            "/api/v1/telecom/ussd",
            data={"sessionId": "ussd-100", "serviceCode": "*347*88#", "phoneNumber": "+2348011223344", "text": "4"}
        )
        print("POST /api/v1/telecom/ussd (Option 4 - Live DB Home Visit) ->\n" + r14.text)
        assert "Visit request #" in r14.text

        # 15. Check SMS History as CHW
        r15 = await client.get("/api/v1/telecom/sms/history", headers=chw_headers)
        print(f"GET /api/v1/telecom/sms/history (CHW) -> {len(r15.json())} SMS records found")
        assert len(r15.json()) >= 1

    print("\n✅ ALL HARDENED BACKEND & DOMAIN INTEGRATION TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    asyncio.run(run_tests())
