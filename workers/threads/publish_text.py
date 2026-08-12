"""
Publish thread teks via browser (development/testing).

Usage:
    cd workers
    venv\\Scripts\\python threads\\publish_text.py "Isi post..."
    venv\\Scripts\\python threads\\publish_text.py "Isi post..." request-123

Argumen kedua opsional: request_id untuk idempotency (anti duplicate
post saat retry).

Hasil publish dicetak (success, url) - TIDAK pernah mencetak cookie.
"""

import asyncio
import os
import sys

from dotenv import load_dotenv
from loguru import logger

WORKERS_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if WORKERS_DIR not in sys.path:
    sys.path.append(WORKERS_DIR)

load_dotenv()

from shared.browser import PlaywrightManager
from threads.config import ThreadsConfig
from threads.cookies import ThreadsCookieManager
from threads.errors import ThreadsError
from threads.publisher import ThreadsPublisher
from threads.session import ThreadsSessionManager


async def main() -> None:
    if len(sys.argv) < 2 or not (sys.argv[1] or "").strip():
        print(
            'Usage: python threads/publish_text.py "Isi post..." '
            "[request_id]"
        )
        sys.exit(2)

    text = sys.argv[1].strip()
    request_id = sys.argv[2] if len(sys.argv) > 2 else None

    config = ThreadsConfig.from_env()
    cookie_manager = ThreadsCookieManager(config.cookies_file)
    session = ThreadsSessionManager(config, cookie_manager)
    publisher = ThreadsPublisher(config, session)

    browser = PlaywrightManager(
        headless=config.headless,
        timeout_ms=config.timeout_ms,
        slow_mo=config.slow_mo_ms,
        locale="id-ID",
    )
    await browser.start()

    try:
        context = await session.get_context(browser)
        result = await publisher.create_text_post(
            context, text, request_id=request_id
        )
        print(f"\nSUKSES publish thread teks!")
        print(f"  URL: {result.get('url') or '(tidak tersedia)'}")
        if request_id:
            print(f"  request_id: {request_id}")
    except ThreadsError as e:
        print(f"\nGAGAL: [{e.code}] {e}")
        sys.exit(1)
    finally:
        await session.save_state()
        await session.close_context()
        await browser.close()


if __name__ == "__main__":
    logger.remove()
    asyncio.run(main())
