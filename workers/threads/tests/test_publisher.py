"""Unit test publisher Threads: text post, image post, timeout, retry,
duplicate protection, expired session, video not implemented."""

import json
import time
from pathlib import Path

import pytest

from threads import selectors
from threads.config import ThreadsConfig
from threads.publisher import ThreadsPublisher
from threads.session import ThreadsSessionManager
from fake_playwright import FakeContext, FakePage

COMPOSER_OPEN = selectors.COMPOSER_OPEN_BUTTONS[0]
TEXTAREA = selectors.COMPOSER_TEXTAREA[0]
POST_BUTTON = selectors.COMPOSER_POST_BUTTONS[0]
DIALOG = selectors.COMPOSER_MODAL_DIALOG
FILE_INPUT = selectors.MEDIA_FILE_INPUT
PROFILE_LINK = selectors.PROFILE_LINK
POST_LINK = selectors.POST_LINK

SESSION_COOKIES = [
    {"name": "sessionid", "value": "abc", "domain": ".threads.net", "path": "/", "expires": int(time.time()) + 3600},
    {"name": "ds_user_id", "value": "123", "domain": ".threads.net", "path": "/", "expires": int(time.time()) + 3600},
    {"name": "csrftoken", "value": "xyz", "domain": ".threads.net", "path": "/", "expires": int(time.time()) + 3600},
]


def _config(tmp_path: Path, timeout_ms: int = 5000, retry_count: int = 1) -> ThreadsConfig:
    session_dir = tmp_path / "sessions"
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
        retry_count=retry_count,
        retry_base_delay=0.01,
        max_posts_per_keyword=50,
        live_test=False,
    )


def _valid_context() -> FakeContext:
    context = FakeContext(cookies=SESSION_COOKIES)
    context._page = FakePage(context, url="https://www.threads.net/")
    return context


def _success_page(context: FakeContext) -> FakeContext:
    """Page simulasi composer lengkap: klik Post menutup modal."""
    def on_post_click(locator):
        locator.page.visible_selectors.discard(TEXTAREA)
        locator.page.visible_selectors.discard(POST_BUTTON)
        locator.page.visible_selectors.discard(DIALOG)

    context._page = FakePage(
        context,
        url="https://www.threads.net/",
        visible_selectors={
            COMPOSER_OPEN, TEXTAREA, POST_BUTTON, DIALOG,
            PROFILE_LINK, POST_LINK,
        },
        attributes={
            PROFILE_LINK: {"href": "/@testuser"},
            POST_LINK: {"href": "/@testuser/post/abc123"},
        },
        click_behaviors={POST_BUTTON: on_post_click},
    )
    return context


# ----------------------------------------------------------------------
# Text post
# ----------------------------------------------------------------------

async def test_text_post_success(tmp_path):
    config = _config(tmp_path)
    context = _success_page(_valid_context())
    publisher = ThreadsPublisher(config, ThreadsSessionManager(config, None))

    result = await publisher.create_text_post(context, "Halo Threads!")
    assert result["success"] is True
    assert result["postId"] is None
    assert result["url"] == f"{selectors.THREADS_HOST}/@testuser/post/abc123"
    assert result["error"] is None


async def test_text_post_empty_text(tmp_path):
    config = _config(tmp_path)
    context = _success_page(_valid_context())
    publisher = ThreadsPublisher(config, ThreadsSessionManager(config, None))

    from threads.errors import ThreadsPublishFailedError

    with pytest.raises(ThreadsPublishFailedError):
        await publisher.create_text_post(context, "   ")


async def test_text_post_session_expired_no_retry(tmp_path):
    config = _config(tmp_path, retry_count=3)
    context = _valid_context()
    context._page = FakePage(
        context,
        url="https://www.threads.net/",
        goto_url="https://www.threads.net/login",
    )
    publisher = ThreadsPublisher(config, ThreadsSessionManager(config, None))

    from threads.errors import ThreadsSessionExpiredError

    with pytest.raises(ThreadsSessionExpiredError):
        await publisher.create_text_post(context, "Halo")


async def test_text_post_timeout_records_maybe(tmp_path):
    config = _config(tmp_path, timeout_ms=300)
    context = _valid_context()
    # Klik Post TIDAK menutup modal -> konfirmasi timeout
    context._page = FakePage(
        context,
        url="https://www.threads.net/",
        visible_selectors={COMPOSER_OPEN, TEXTAREA, POST_BUTTON, DIALOG},
    )
    publisher = ThreadsPublisher(config, ThreadsSessionManager(config, None))

    from threads.errors import ThreadsTimeoutError

    with pytest.raises(ThreadsTimeoutError):
        await publisher.create_text_post(context, "Halo", request_id="req-timeout")

    log = json.loads(config.published_log_file.read_text("utf-8"))
    assert log["req-timeout"]["status"] == "maybe"
    assert log["req-timeout"]["error"] == "THREADS_TIMEOUT"


async def test_text_post_maybe_never_republishes(tmp_path):
    config = _config(tmp_path)
    config.published_log_file.parent.mkdir(parents=True, exist_ok=True)
    config.published_log_file.write_text(
        json.dumps({
            "req-1": {
                "status": "maybe",
                "url": None,
                "error": "THREADS_TIMEOUT",
                "at": "2026-01-01T00:00:00Z",
            }
        }),
        encoding="utf-8",
    )
    context = _valid_context()
    context._page = FakePage(
        context,
        url="https://www.threads.net/",
        visible_selectors={COMPOSER_OPEN, TEXTAREA, POST_BUTTON, DIALOG},
    )
    publisher = ThreadsPublisher(config, ThreadsSessionManager(config, None))

    from threads.errors import ThreadsTimeoutError

    with pytest.raises(ThreadsTimeoutError):
        await publisher.create_text_post(context, "Halo", request_id="req-1")
    # Tidak ada publish baru: log tetap 1 entri
    log = json.loads(config.published_log_file.read_text("utf-8"))
    assert len(log) == 1


async def test_text_post_idempotent_success_cached(tmp_path):
    config = _config(tmp_path)
    config.published_log_file.parent.mkdir(parents=True, exist_ok=True)
    config.published_log_file.write_text(
        json.dumps({
            "req-1": {
                "status": "success",
                "url": f"{selectors.THREADS_HOST}/@testuser/post/xyz",
                "error": None,
                "at": "2026-01-01T00:00:00Z",
            }
        }),
        encoding="utf-8",
    )
    context = _valid_context()
    context._page = FakePage(context, url="https://www.threads.net/")
    publisher = ThreadsPublisher(config, ThreadsSessionManager(config, None))

    result = await publisher.create_text_post(context, "Halo", request_id="req-1")
    assert result["cached"] is True
    assert result["url"] == f"{selectors.THREADS_HOST}/@testuser/post/xyz"


async def test_text_post_retry_on_browser_error(tmp_path):
    config = _config(tmp_path, retry_count=1)
    context = _valid_context()
    context.goto_fail_times = 1  # goto pertama gagal, kedua sukses
    _success_page(context)
    publisher = ThreadsPublisher(config, ThreadsSessionManager(config, None))

    result = await publisher.create_text_post(context, "Halo")
    assert result["success"] is True


async def test_text_post_selector_changed(tmp_path):
    config = _config(tmp_path)
    context = _valid_context()
    # Composer button TIDAK ada di halaman
    context._page = FakePage(context, url="https://www.threads.net/")
    publisher = ThreadsPublisher(config, ThreadsSessionManager(config, None))

    from threads.errors import ThreadsSelectorChangedError

    with pytest.raises(ThreadsSelectorChangedError):
        await publisher.create_text_post(context, "Halo")


# ----------------------------------------------------------------------
# Image post
# ----------------------------------------------------------------------

async def _make_image(tmp_path: Path) -> Path:
    img = tmp_path / "test.jpg"
    img.write_bytes(b"\xff\xd8\xff\xe0 fake jpeg bytes")
    return img


async def test_image_post_success(tmp_path):
    config = _config(tmp_path)
    img = await _make_image(tmp_path)
    context = _success_page(_valid_context())
    context._page.visible_selectors.add(FILE_INPUT)
    publisher = ThreadsPublisher(config, ThreadsSessionManager(config, None))

    result = await publisher.create_image_post(context, str(img), "Caption")
    assert result["success"] is True
    assert context.files_uploaded.get(FILE_INPUT) == str(img)


async def test_image_post_missing_file(tmp_path):
    config = _config(tmp_path)
    context = _success_page(_valid_context())
    publisher = ThreadsPublisher(config, ThreadsSessionManager(config, None))

    from threads.errors import ThreadsMediaUploadFailedError

    with pytest.raises(ThreadsMediaUploadFailedError):
        await publisher.create_image_post(
            context, str(tmp_path / "nope.jpg"), "Caption"
        )


async def test_image_post_unsupported_format(tmp_path):
    config = _config(tmp_path)
    img = tmp_path / "test.gif"
    img.write_bytes(b"GIF89a")
    context = _success_page(_valid_context())
    publisher = ThreadsPublisher(config, ThreadsSessionManager(config, None))

    from threads.errors import ThreadsMediaUploadFailedError

    with pytest.raises(ThreadsMediaUploadFailedError):
        await publisher.create_image_post(context, str(img), "Caption")


async def test_image_post_upload_failure(tmp_path):
    config = _config(tmp_path)
    img = await _make_image(tmp_path)
    context = _success_page(_valid_context())
    context._page.visible_selectors.add(FILE_INPUT)
    context._page.set_input_files_error = True
    publisher = ThreadsPublisher(config, ThreadsSessionManager(config, None))

    from threads.errors import ThreadsMediaUploadFailedError

    with pytest.raises(ThreadsMediaUploadFailedError):
        await publisher.create_image_post(context, str(img), "Caption")


# ----------------------------------------------------------------------
# Video post (belum diimplementasikan)
# ----------------------------------------------------------------------

async def test_video_post_not_implemented(tmp_path):
    config = _config(tmp_path)
    context = _valid_context()
    publisher = ThreadsPublisher(config, ThreadsSessionManager(config, None))

    from threads.errors import ThreadsNotImplementedError

    with pytest.raises(ThreadsNotImplementedError):
        await publisher.create_video_post(context, "video.mp4")
