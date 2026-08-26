import asyncio
from app.services.groq_service import filter_record

async def main():
    print("Testing filter_record...")
    try:
        res = await filter_record(
            record_text="Patient has a history of high blood pressure and diabetes for 10 years. Currently taking Metformin.", 
            symptoms="chest pain and shortness of breath"
        )
        print("✅ SUCCESS! The filter model returned:")
        print("-" * 40)
        print(res)
        print("-" * 40)
    except Exception as e:
        print("❌ FAILED with error:", e)

if __name__ == "__main__":
    asyncio.run(main())
