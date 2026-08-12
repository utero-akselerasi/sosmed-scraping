"""Unit test session manager Threads: health check (valid/expired/
no-session), storage state validity, get_context dari storage.json
(NO_SESSION / EXPIRED / AUTH_UNVERIFIED), tanpa fallback cookies.txt."""

import json
import time
from pathlib import Path

import pytest

from threads.config import ThreadsConfig
from threads.cookies import ThreadsCookieManager
from threads.session import (
    SESSION_EXPIRED,
    SESSION_NO_SESSION,
    SESSION_VALID,
    ThreadsSessionManager,
)
from fake_playwright import FakeBrowser, FakeContext, FakePage


def _config(tmp_path: Path, timeout_ms: int = 5000) -> ThreadsConfig:
    session_dir = tmp_path / "sessions" / "threads"
    return ThreadsConfig(
        enabled=True,
        headless=True,
        session_dir=session_dir,
        cookies_file=session_dir / "cookies.txt",
        storage_state_file=session_dir / "storage.json",
        published_log_file=session_dir / "published.json",
        timeout_ms=timeout_ms,
        slow_mo_ms=0,
        viewport=(1280, 800),
        retry_count=1,
        retry_base_delay=0.01,
        max_posts_per_keyword=50,
        live_test=False,
    )


def _session_cookies() -> list:
    return [
        {"name": "sessionid", "value": "abc", "domain": ".threads.net", "path": "/", "expires": int(time.time()) + 3600},
        {"name": "ds_user_id", "value": "123", "domain": ".threads.net", "path": "/", "expires": int(time.time()) + 3600},
        {"name": "csrftoken", "value": "xyz", "domain": ".threads.net", "path": "/", "expires": int(time.time()) + 3600},
    ]


async def test_check_session_valid_with_ui_indicator(tmp_path):
    context = FakeContext(cookies=_session_cookies())
    page = FakePage(
        context,
        url="https://www.threads.com/",
        visible_selectors={'a[href="/compose"]'},
    )
    context._page = page
    manager = ThreadsSessionManager(_config(tmp_path), None)
    result = await manager.check_session(context)
    assert result["status"] == SESSION_VALID
    assert result["ui_confirmed"] is True


async def test_check_session_valid_without_ui_indicator(tmp_path):
    """Indikator UI hanya penguat - absen TIDAK membuat session invalid."""
    context = FakeContext(cookies=_session_cookies())
    page = FakePage(context, url="https://www.threads.com/")
    context._page = page
    manager = ThreadsSessionManager(_config(tmp_path), None)
    result = await manager.check_session(context)
    assert result["status"] == SESSION_VALID
    assert result["ui_confirmed"] is False


async def test_check_session_expired_redirect(tmp_path):
    context = FakeContext(cookies=_session_cookies())
    page = FakePage(
        context,
        url="https://www.threads.net/",
        goto_url="https://www.threads.net/login",
    )
    context._page = page
    manager = ThreadsSessionManager(_config(tmp_path), None)
    result = await manager.check_session(context)
    assert result["status"] == SESSION_EXPIRED


async def test_check_session_expired_login_wall(tmp_path):
    context = FakeContext(cookies=_session_cookies())
    page = FakePage(
        context,
        url="https://www.threads.net/",
        visible_selectors={'input[name="username"]'},
    )
    context._page = page
    manager = ThreadsSessionManager(_config(tmp_path), None)
    result = await manager.check_session(context)
    assert result["status"] == SESSION_EXPIRED


async def test_check_session_no_session_cookies(tmp_path):
    context = FakeContext(cookies=[])
    manager = ThreadsSessionManager(_config(tmp_path), None)
    result = await manager.check_session(context)
    assert result["status"] == SESSION_NO_SESSION


def test_state_has_valid_session(tmp_path):
    manager = ThreadsSessionManager(_config(tmp_path), None)
    state = {"cookies": _session_cookies(), "origins": []}
    assert manager._state_has_valid_session(state) is True


def test_state_has_expired_session(tmp_path):
    manager = ThreadsSessionManager(_config(tmp_path), None)
    cookies = _session_cookies()
    cookies[0]["expires"] = int(time.time()) - 100
    assert manager._state_has_valid_session({"cookies": cookies}) is False


def test_state_missing_sessionid(tmp_path):
    manager = ThreadsSessionManager(_config(tmp_path), None)
    cookies = [c for c in _session_cookies() if c["name"] != "sessionid"]
    assert manager._state_has_valid_session({"cookies": cookies}) is False


async def test_get_context_no_storage_raises_auth_required(tmp_path):
    """Tanpa storage.json -> NO_SESSION (ThreadsAuthRequiredError), dan
    TIDAK ada fallback otomatis ke cookies.txt."""
    config = _config(tmp_path)
    manager = ThreadsSessionManager(
        config, ThreadsCookieManager(config.cookies_file)
    )
    browser = FakeBrowser()

    from threads.errors import ThreadsAuthRequiredError

    with pytest.raises(ThreadsAuthRequiredError) as exc_info:
        await manager.get_context(browser)
    assert "NO_SESSION" in str(exc_info.value)
    assert not config.storage_state_file.exists()


async def test_get_context_storage_malformed_raises_auth_unverified(tmp_path):
    config = _config(tmp_path)
    config.session_dir.mkdir(parents=True, exist_ok=True)
    config.storage_state_file.write_text("{not-valid-json", encoding="utf-8")
    manager = ThreadsSessionManager(
        config, ThreadsCookieManager(config.cookies_file)
    )

    from threads.errors import ThreadsAuthUnverifiedError

    with pytest.raises(ThreadsAuthUnverifiedError) as exc_info:
        await manager.get_context(FakeBrowser())
    assert "AUTH_UNVERIFIED" in str(exc_info.value)


async def test_get_context_storage_expired_timestamp_raises(tmp_path):
    config = _config(tmp_path)
    config.session_dir.mkdir(parents=True, exist_ok=True)
    cookies = _session_cookies()
    cookies[0]["expires"] = int(time.time()) - 100
    config.storage_state_file.write_text(
        json.dumps({"cookies": cookies, "origins": []}), encoding="utf-8"
    )
    manager = ThreadsSessionManager(
        config, ThreadsCookieManager(config.cookies_file)
    )

    from threads.errors import ThreadsSessionExpiredError

    with pytest.raises(ThreadsSessionExpiredError) as exc_info:
        await manager.get_context(FakeBrowser())
    assert "EXPIRED" in str(exc_info.value)


async def test_get_context_storage_live_redirect_login_raises_expired(tmp_path):
    """Storage ada tapi health check live menemukan redirect ke /login."""
    config = _config(tmp_path)
    config.session_dir.mkdir(parents=True, exist_ok=True)
    config.storage_state_file.write_text(
        json.dumps({"cookies": _session_cookies(), "origins": []}),
        encoding="utf-8",
    )
    manager = ThreadsSessionManager(
        config, ThreadsCookieManager(config.cookies_file)
    )

    from threads.errors import ThreadsSessionExpiredError

    browser = FakeBrowser(goto_url="https://www.threads.com/login")
    with pytest.raises(ThreadsSessionExpiredError):
        await manager.get_context(browser)


async def test_get_context_restores_from_storage_state(tmp_path):
    config = _config(tmp_path)
    config.session_dir.mkdir(parents=True, exist_ok=True)
    state = {"cookies": _session_cookies(), "origins": []}
    config.storage_state_file.write_text(json.dumps(state), encoding="utf-8")

    cookie_manager = ThreadsCookieManager(config.cookies_file)
    manager = ThreadsSessionManager(config, cookie_manager)

    browser = FakeBrowser()

    ctx = await manager.get_context(browser)
    # FakeBrowser menciptakan context baru berisi cookie dari storage state
    assert ctx is not None
    assert {c["name"] for c in await ctx.cookies()} >= {
        "sessionid",
        "ds_user_id",
    }


async def test_ensure_valid_session_expired_raises(tmp_path):
    config = _config(tmp_path)
    manager = ThreadsSessionManager(config, None)
    context = FakeContext(cookies=_session_cookies())
    context._page = FakePage(
        context,
        url="https://www.threads.net/",
        goto_url="https://www.threads.net/login",
    )
    from threads.errors import ThreadsSessionExpiredError

    with pytest.raises(ThreadsSessionExpiredError):
        await manager.ensure_valid_session(context)


async def test_ensure_valid_session_ok(tmp_path):
    config = _config(tmp_path)
    manager = ThreadsSessionManager(config, None)
    context = FakeContext(cookies=_session_cookies())
    context._page = FakePage(context, url="https://www.threads.net/")
    await manager.ensure_valid_session(context)
