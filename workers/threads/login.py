"""
Login manual Threads -> simpan storage state (session reusable).

Usage:
    cd workers
    venv\\Scripts\\python threads\\login.py

Alur:
1. Buka browser (SELALU terlihat / headful, terlepas THREADS_HEADLESS).
2. Navigasi ke canonical Threads (threads.com) dan ikuti redirect
   normal browser - tidak ada host yang dihardcode sebagai asumsi final.
3. User login ke Threads secara manual di browser (QR / akun / email).
   Script TIDAK meminta username/password lewat terminal dan TIDAK
   membaca credential dari env.
4. Script memantau halaman sampai sesi terdeteksi terautentikasi
   (cek: cookie sesi pada domain aktual + URL bukan /login + tidak ada
   login wall; indikator UI hanya penguat).
5. Storage state disimpan KE storage.json SEKALI, HANYA setelah
   autentikasi terbukti valid - storage lama TIDAK di-overwrite
   sebelumnya.
6. Run berikutnya (worker / publish / check) memakai state itu.

Nilai cookie TIDAK pernah di-log / ditampilkan. TIDAK ada publish.
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
from threads import selectors
from threads.config import ThreadsConfig
from threads.errors import ThreadsBrowserError
from threads.session import SESSION_VALID, ThreadsSessionManager

LOGIN_WAIT_SECONDS = 600  # maksimal waktu user login manual (2FA/challenge)
POLL_INTERVAL_SECONDS = 3


async def main() -> None:
    config = ThreadsConfig.from_env()
    session = ThreadsSessionManager(config, cookie_manager=None)

    if config.storage_state_file.exists():
        print(
            f"Storage state sudah ada: {config.storage_state_file}\n"
            "Storage lama TIDAK akan di-overwrite sebelum login baru "
            "terbukti valid.\n"
        )

    # Login SELALU dengan browser terlihat (manual login / 2FA/challenge)
    browser = PlaywrightManager(
        headless=False,
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

    page = await context.new_page()
    await page.goto(
        selectors.THREADS_HOME,
        wait_until="domcontentloaded",
        timeout=config.timeout_ms,
    )
    print(
        "\n=== LOGIN MANUAL THREADS ==="
        "\nSilakan login manual di browser yang terbuka."
        "\nSelesaikan 2FA/challenge sendiri."
        "\nScript menunggu sampai session terautentikasi..."
    )

    deadline = asyncio.get_event_loop().time() + LOGIN_WAIT_SECONDS
    while True:
        await asyncio.sleep(POLL_INTERVAL_SECONDS)
        try:
            result = await session.check_session(context)
        except ThreadsBrowserError as e:
            # Navigasi health check sementara gagal (redirect/halaman
            # belum siap) - jangan crash, lanjut menunggu.
            logger.warning(
                f"Health check sementara gagal ({e}) - lanjut menunggu..."
            )
            continue
        if result["status"] == SESSION_VALID:
            break
        if asyncio.get_event_loop().time() >= deadline:
            await page.close()
            await context.close()
            await browser.close()
            print(
                f"\nWaktu tunggu {LOGIN_WAIT_SECONDS}s habis - login belum "
                "selesai. Jalankan ulang threads/login.py."
            )
            sys.exit(1)

    # HANYA di sini: simpan storage state SEKALI, sudah terbukti valid.
    await session.save_state(context)
    print(f"SUKSES: storage state disimpan di {config.storage_state_file}")

    await page.close()
    await context.close()
    await browser.close()
    print("Browser ditutup. Sesi siap dipakai worker / publish.")


if __name__ == "__main__":
    logger.remove()
    asyncio.run(main())
