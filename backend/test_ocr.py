import asyncio
import os
import base64
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()

async def test_ocr():
    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    
    # create a dummy tiny 1x1 pixel image in base64
    dummy_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    
    print("Testing OCR with model 'llama-3.2-11b-vision-preview'...")
    try:
        response = await client.chat.completions.create(
            model="qwen/qwen3.6-27b",
            max_tokens=800,
            messages=[{"role": "user", "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{dummy_image_b64}"}},
                {"type": "text", "text": "Extract all medical info."}
            ]}]
        )
        print("✅ SUCCESS! OCR model returned:")
        print(response.choices[0].message.content)
    except Exception as e:
        print("❌ FAILED with error:")
        print(e)

if __name__ == "__main__":
    asyncio.run(test_ocr())
