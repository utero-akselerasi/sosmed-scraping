"""Live integration test Threads - HANYA jalan dengan THREADS_LIVE_TEST=true.

Menjalankan publish asli ke akun Threads. Default false:
- Jika false: test di-skip dengan pesan jelas (bukan fake result).
- Jika true : test memakai sesi tersimpan (storage state / cookie) dan
  benar-benar publish. Jalankan manual dengan:
      THREADS_LIVE_TEST=true venv\\Scripts\\python -m pytest threads/tests/test_live.py -v
"""

import os

import pytest

LIVE = os.getenv("THREADS_LIVE_TEST", "false").lower() == "true"

pytestmark = pytest.mark.skipif(
    not LIVE,
    reason=(
        "LIVE THREADS TEST NOT RUN - authenticated browser session "
        "required. Set THREADS_LIVE_TEST=true untuk menjalankan live "
        "integration test secara manual (benar-benar publish ke Threads)."
    ),
)


@pytest.fixture
async def live_setup():
    """Siapkan browser + context terautentikasi (sesi tersimpan)."""
    import sys

    from dotenv import load_dotenv

    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    load_dotenv()

    from shared.browser import PlaywrightManager
    from threads.config import ThreadsConfig
    from threads.cookies import ThreadsCookieManager
    from threads.session import ThreadsSessionManager

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
    context = await session.get_context(browser)
    result = await session.check_session(context)
    assert result["status"] == "valid", (
        "Sesi Threads tidak valid - jalankan threads/login.py atau "
        "threads/import_cookies.py dulu."
    )
    yield {"config": config, "session": session, "context": context}
    await session.save_state()
    await session.close_context()
    await browser.close()


@pytest.mark.asyncio
async def test_live_session_and_profile(live_setup):
    """Health check + profil akun yang sedang login."""
    from threads.profile import get_threads_profile

    profile = await get_threads_profile(
        live_setup["context"], live_setup["config"]
    )
    assert profile["username"], "Username tidak ditemukan via UI"
    assert profile["authenticated"] is True
    print(f"Live session valid: @{profile['username']}")


@pytest.mark.asyncio
async def test_live_text_post(live_setup):
    """Publish thread teks asli (post test kecil)."""
    import uuid

    from threads.publisher import ThreadsPublisher

    request_id = f"pytest-{uuid.uuid4().hex[:8]}"
    publisher = ThreadsPublisher(
        live_setup["config"], live_setup["session"]
    )
    result = await publisher.create_text_post(
        live_setup["context"],
        "Test publish otomatis (pytest live) - tolong abaikan.",
        request_id=request_id,
    )
    assert result["success"] is True
    print(f"Live text post: {result.get('url')}")
