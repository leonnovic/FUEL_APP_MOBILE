import asyncio
import os
import httpx
import hmac
import hashlib
from datetime import datetime

async def verify_stripe(api_key):
    print(f"Verifying Stripe with key prefix: {api_key[:4]}...")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://api.stripe.com/v1/accounts",
                headers={"Authorization": f"Bearer {api_key}"}
            )
            if resp.status_code == 200:
                print("✅ Stripe API Key is VALID")
                return True
            else:
                print(f"❌ Stripe verification FAILED with status {resp.status_code}")
                return False
        except Exception as e:
            print(f"❌ Stripe verification ERROR: {e}")
            return False

async def verify_mpesa(consumer_key, consumer_secret):
    print("Verifying M-PESA credentials...")
    from base64 import b64encode
    auth = b64encode(f"{consumer_key}:{consumer_secret}".encode()).decode()
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
                headers={"Authorization": f"Basic {auth}"}
            )
            if resp.status_code == 200:
                print("✅ M-PESA credentials are VALID (Sandbox)")
                return True
            else:
                print(f"❌ M-PESA verification FAILED with status {resp.status_code}")
                return False
        except Exception as e:
            print(f"❌ M-PESA verification ERROR: {e}")
            return False

async def main():
    stripe_key = os.environ.get("STRIPE_API_KEY")
    if stripe_key:
        await verify_stripe(stripe_key)

    m_key = os.environ.get("MPESA_CONSUMER_KEY")
    m_secret = os.environ.get("MPESA_CONSUMER_SECRET")
    if m_key and m_secret:
        await verify_mpesa(m_key, m_secret)

if __name__ == "__main__":
    asyncio.run(main())
