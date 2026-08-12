"""Unit test profil Threads (getThreadsProfile) dengan fake page.

Username HANYA dari sidebar navigasi (PROFILE_LINK nav-scoped). Fallback
page-wide a[href^="/@"] (author feed) TIDAK dipakai - status
USERNAME_NOT_VERIFIED jika tidak terverifikasi.
"""

from pathlib import Path

import pytest

from threads.config import ThreadsConfig
from threads.profile import (
    USERNAME_NOT_VERIFIED,
    USERNAME_VERIFIED,
    _find_username,
    get_threads_profile,
)
from fake_playwright import FakeContext, FakePage

NAV_LINK = 'div[role="navigation"] a[href^="/@"]'
FEED_LINK = 'a[href^="/@"]'


def _config(tmp_path: Path) -> ThreadsConfig:
    session_dir = tmp_path / "sessions"
    return ThreadsConfig(
        enabled=True,
        headless=True,
        session_dir=session_dir,
        cookies_file=session_dir / "cookies.txt",
        storage_state_file=session_dir / "storage.json",
        published_log_file=session_dir / "published.json",
        timeout_ms=5000,
        slow_mo_ms=0,
        viewport=(1280, 800),
        retry_count=1,
        retry_base_delay=0.01,
        max_posts_per_keyword=50,
        live_test=False,
    )


async def test_profile_username_from_nav_href(tmp_path):
    context = FakeContext()
    page = FakePage(
        context,
        url="https://www.threads.com/",
        visible_selectors={NAV_LINK},
        attributes={NAV_LINK: {"href": "/@testuser"}},
    )
    username = await _find_username(page)
    assert username == "testuser"


async def test_profile_username_href_with_query(tmp_path):
    context = FakeContext()
    page = FakePage(
        context,
        url="https://www.threads.com/",
        visible_selectors={NAV_LINK},
        attributes={NAV_LINK: {"href": "/@testuser?utm_source=web"}},
    )
    username = await _find_username(page)
    assert username == "testuser"


async def test_profile_username_not_from_feed_link(tmp_path):
    """Link /@ di feed (page-wide) = author akun LAIN - TIDAK dipakai
    sebagai identitas akun login."""
    context = FakeContext()
    page = FakePage(
        context,
        url="https://www.threads.com/",
        visible_selectors={FEED_LINK},
        attributes={FEED_LINK: {"href": "/@randomauthor"}},
    )
    username = await _find_username(page)
    assert username is None


async def test_profile_username_missing(tmp_path):
    context = FakeContext()
    page = FakePage(context, url="https://www.threads.com/")
    username = await _find_username(page)
    assert username is None


async def test_get_profile_with_display_name(tmp_path):
    context = FakeContext()
    page = FakePage(
        context,
        url="https://www.threads.com/",
        visible_selectors={NAV_LINK, 'h1[dir="auto"]'},
        attributes={NAV_LINK: {"href": "/@testuser"}},
        texts={'h1[dir="auto"]': "Test User"},
    )
    context._page = page
    profile = await get_threads_profile(context, _config(tmp_path))
    assert profile["username"] == "testuser"
    assert profile["displayName"] == "Test User"
    assert profile["authenticated"] is True
    assert profile["profileUrl"] == "https://www.threads.com/@testuser"
    assert profile["status"] == USERNAME_VERIFIED


async def test_get_profile_no_username(tmp_path):
    context = FakeContext()
    page = FakePage(context, url="https://www.threads.com/")
    context._page = page
    profile = await get_threads_profile(context, _config(tmp_path))
    assert profile["username"] is None
    assert profile["authenticated"] is True
    assert profile["status"] == USERNAME_NOT_VERIFIED


async def test_get_profile_feed_link_only_is_not_verified(tmp_path):
    """Hanya ada link /@ dari feed (page-wide) -> USERNAME_NOT_VERIFIED."""
    context = FakeContext()
    page = FakePage(
        context,
        url="https://www.threads.com/",
        visible_selectors={FEED_LINK},
        attributes={FEED_LINK: {"href": "/@randomauthor"}},
    )
    context._page = page
    profile = await get_threads_profile(context, _config(tmp_path))
    assert profile["username"] is None
    assert profile["status"] == USERNAME_NOT_VERIFIED
