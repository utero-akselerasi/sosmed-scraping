"""
Cek status sesi Threads (READ-ONLY).

Usage:
    cd workers
    venv\\Scripts\\python threads\\check_session.py

Membuka session dari storage state (storage.json), menjalankan health
check, dan menampilkan status. TIDAK ada side effect:
- TIDAK save_state() / mengubah storage.json
- TIDAK mengubah cookies.txt
- TIDAK publish
- TIDAK menampilkan cookie / sessionid / nilai sensitif

Output contoh (valid):
    Status      : VALID
    URL         : https://www.threads.com/
    Authenticated: True
    Username    : USERNAME_NOT_VERIFIED   (jika selector identitas belum
                                           terbukti - TIDAK dipalsukan)

Status tidak valid:
    NO_SESSION / EXPIRED / AUTH_UNVERIFIED
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
from threads.errors import (
    ThreadsAuthRequiredError,
    ThreadsAuthUnverifiedError,
    ThreadsSessionExpiredError,
)
from threads.profile import (
    USERNAME_NOT_VERIFIED,
    get_threads_profile,
)
from threads.session import SESSION_VALID, ThreadsSessionManager


def _exit_with_status(status: str, detail: str = "") -> None:
    print(f"\nStatus      : {status}")
    if detail:
        print(f"Detail      : {detail}")
    print(
        "\nRe-authentication dibutuhkan:"
        "\n  - threads/login.py  (login manual via browser)"
        "\n  - threads/import_cookies.py (cookie Netscape baru)"
    )
    sys.exit(1)


async def main() -> None:
    config = ThreadsConfig.from_env()
    cookie_manager = ThreadsCookieManager(config.cookies_file)
    session = ThreadsSessionManager(config, cookie_manager)

    browser = PlaywrightManager(
        headless=config.headless,
        timeout_ms=config.timeout_ms,
        slow_mo=config.slow_mo_ms,
        locale="id-ID",
    )
    await browser.start()

    try:
        try:
            context = await session.get_context(browser)
        except ThreadsAuthRequiredError as e:
            _exit_with_status("NO_SESSION", str(e))
        except ThreadsSessionExpiredError as e:
            _exit_with_status("EXPIRED", str(e))
        except ThreadsAuthUnverifiedError as e:
            _exit_with_status("AUTH_UNVERIFIED", str(e))

        result = await session.check_session(context)
        if result["status"] != SESSION_VALID:
            _exit_with_status(result["status"].upper())

        print("\nStatus      : VALID")
        print(f"URL         : {result.get('url') or ''}")
        print("Authenticated: True")

        profile = await get_threads_profile(context, config)
        if profile.get("username"):
            print(f"Username    : @{profile['username']}")
            print(f"Display name: {profile.get('displayName') or '-'}")
            print(f"Profile URL : {profile.get('profileUrl') or '-'}")
        else:
            print(f"Username    : {USERNAME_NOT_VERIFIED}")

        print(f"Storage state: {config.storage_state_file}")
        print("\nSesi valid - siap dipakai worker / publish.")
    finally:
        # READ-ONLY: jangan save_state di sini.
        await session.close_context()
        await browser.close()


if __name__ == "__main__":
    logger.remove()
    asyncio.run(main())
