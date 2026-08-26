import os
import asyncio
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()

async def main():
    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    models = await client.models.list()
    print([m.id for m in models.data])

if __name__ == "__main__":
    asyncio.run(main())
