import asyncio
import os
import httpx

async def verify_stripe(api_key):
    # Do not log any part of the key to satisfy security scans
    print("Verifying Stripe API key...")
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
                print("❌ Stripe verification FAILED")
                return False
        except Exception:
            print("❌ Stripe verification ERROR")
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
                print("❌ M-PESA verification FAILED")
                return False
        except Exception:
            print("❌ M-PESA verification ERROR")
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
