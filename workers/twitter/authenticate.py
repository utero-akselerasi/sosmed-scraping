"""
Tes alur autentikasi X (Twitter) - utilitas development.

Muat twitter_cookies.txt (atau twitter_state.json bila sudah ada),
verifikasi sesi login di x.com, lalu simpan twitter_state.json agar run
worker berikutnya lebih cepat. Tidak pernah mencetak nilai cookie.

Cara pakai (dari direktori workers):
    venv\\Scripts\\python.exe twitter\\authenticate.py

Exit code 0 = sesi valid; 1 = gagal (cookie kedaluwarsa/hilang).
"""

import asyncio
import os
import sys
from pathlib import Path

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

from loguru import logger  # noqa: E402

from shared.browser import PlaywrightManager  # noqa: E402
from twitter.playwright_provider import TwitterSession  # noqa: E402


def _resolve(value: str) -> Path:
    return Path(value).expanduser()


async def main() -> None:
    logger.info("=" * 60)
    logger.info("X (Twitter) Auth Test - verifikasi sesi cookie")
    logger.info("=" * 60)

    cookies_file = _resolve(os.getenv(
        'TWITTER_COOKIES_FILE', './twitter/twitter_cookies.txt'
    ))
    state_file = _resolve(os.getenv(
        'TWITTER_STORAGE_STATE_FILE', './twitter/twitter_state.json'
    ))
    headless = os.getenv('TWITTER_HEADLESS', 'true').lower() == 'true'
    timeout_ms = max(10000, int(os.getenv('TWITTER_TIMEOUT_SECONDS', 30)) * 1000)

    session = TwitterSession(
        storage_state_file=state_file,
        cookies_file=cookies_file,
        timeout_ms=timeout_ms,
    )
    browser = PlaywrightManager(
        headless=headless,
        timeout_ms=timeout_ms,
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
    )

    try:
        await browser.start()
        context = await session.get_context(browser)
        await session.save_state(context)
        logger.info("✓ Autentikasi X berhasil - sesi valid dan state tersimpan.")
        await session.close_context()
    except Exception as e:
        logger.error(f"Autentikasi X GAGAL: {e}")
        sys.exit(1)
    finally:
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
