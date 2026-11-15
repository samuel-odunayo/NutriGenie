import pytest
import httpx
from app.main import app, init_db


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_root():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "online"
        assert "JWT" in data["security"]


@pytest.mark.anyio
async def test_auth_and_rbac():
    await init_db()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Unauthenticated request to /identity/me should fail with 401
        res_unauth = await client.get("/api/v1/identity/me")
        assert res_unauth.status_code == 401

        # 2. Register citizen
        citizen_payload = {
            "full_name": "Halima Musa",
            "phone_number": "+2348077665544",
            "password": "musaPassword2026",
            "role": "CITIZEN",
            "patient_category": "Nursing Mother",
            "ward_name": "Bwari Central"
        }
        res_reg = await client.post("/api/v1/identity/register", json=citizen_payload)
        if res_reg.status_code == 400:
            res_reg = await client.post("/api/v1/identity/login", json={
                "phone_number": "+2348077665544",
                "password": "musaPassword2026"
            })
        assert res_reg.status_code == 200
        token = res_reg.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Authenticated profile check
        res_me = await client.get("/api/v1/identity/me", headers=headers)
        assert res_me.status_code == 200
        assert res_me.json()["full_name"] == "Halima Musa"


@pytest.mark.anyio
async def test_maternal_nutrition_plan():
    await init_db()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/nutrition/daily-plan?cohort=Pregnant%20Mother")
        assert res.status_code == 200
        data = res.json()
        assert data["summary"]["target_iron_mg"] == 27.0
        assert data["summary"]["target_calories"] == 2350


@pytest.mark.anyio
async def test_ussd_live_database_queries():
    await init_db()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Root menu
        r_root = await client.post(
            "/api/v1/telecom/ussd",
            data={"sessionId": "s-1", "serviceCode": "*347*88#", "phoneNumber": "+2348011112222", "text": ""}
        )
        assert r_root.status_code == 200
        assert "Welcome to NutriGenie" in r_root.text

        # Option 1: Nearest PHC
        r_phc = await client.post(
            "/api/v1/telecom/ussd",
            data={"sessionId": "s-1", "serviceCode": "*347*88#", "phoneNumber": "+2348011112222", "text": "1"}
        )
        assert r_phc.status_code == 200
        assert "Nearest PHC:" in r_phc.text
