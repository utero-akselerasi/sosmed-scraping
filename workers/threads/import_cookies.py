"""
Import cookie Threads (format Netscape) -> storage state Playwright.

Usage:
    cd workers
    venv\\Scripts\\python threads\\import_cookies.py

Membaca cookie dari THREADS_COOKIES_FILE (default:
data/sessions/threads/cookies.txt, format Netscape), memvalidasi penanda
sesi login (sessionid, ds_user_id), membuka browser, memasukkan cookie,
menjalankan health check (deteksi redirect login), lalu menyimpan
storage state ke THREADS_SESSION_DIR/storage.json.

TANPA login username/password. Nilai cookie TIDAK pernah ditampilkan.
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
from shared.cookies import parse_netscape_cookies
from threads.config import ThreadsConfig
from threads.cookies import ThreadsCookieManager
from threads.errors import ThreadsError
from threads.profile import get_threads_profile
from threads.session import ThreadsSessionManager


async def main() -> None:
    config = ThreadsConfig.from_env()
    cookie_manager = ThreadsCookieManager(config.cookies_file)
    session = ThreadsSessionManager(config, cookie_manager)

    if not config.cookies_file.exists():
        print(f"ERROR: file cookie tidak ditemukan: {config.cookies_file}")
        sys.exit(1)

    playwright_cookies = cookie_manager.load_playwright_cookies()
    parsed = parse_netscape_cookies(config.cookies_file)
    cookie_manager.validate_parsed(parsed)
    print(
        f"Parsed {len(parsed)} cookies dari {config.cookies_file} "
        "(nilai cookie tidak ditampilkan)"
    )

    browser = PlaywrightManager(
        headless=config.headless,
        timeout_ms=config.timeout_ms,
        slow_mo=config.slow_mo_ms,
        locale="id-ID",
    )
    await browser.start()
    context = await browser.new_context(
        viewport={
            "width": config.viewport[0],
            "height": config.viewport[1],
        }
    )
    await context.add_cookies(playwright_cookies)

    result = await session.check_session(context)
    if result["status"] != "valid":
        await context.close()
        await browser.close()
        print(
            "\nERROR: sesi cookie TIDAK valid - halaman mengarahkan ke "
            "login.\n"
            "Ekspor ulang cookie dalam keadaan SUDAH LOGIN ke "
            "threads.net, ganti isi file, lalu jalankan ulang. "
            "Atau gunakan threads/login.py untuk login manual."
        )
        sys.exit(1)

    await session.save_state(context)
    print(
        f"SUKSES: storage state tersimpan di {config.storage_state_file}"
    )

    try:
        profile = await get_threads_profile(context, config)
        print(
            f"Login valid: @{profile.get('username') or '(unknown)'} "
            f"({profile.get('displayName') or '-'})"
        )
    except Exception as e:
        print(f"(profil tidak bisa dibaca: {str(e)[:120]})")

    await context.close()
    await browser.close()
    print("Browser ditutup. Sesi siap dipakai worker / publish.")


if __name__ == "__main__":
    logger.remove()
    try:
        asyncio.run(main())
    except ThreadsError as e:
        print(f"ERROR: {e}")
        sys.exit(1)
