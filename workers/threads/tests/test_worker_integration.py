"""Unit test integrasi Threads worker (Phase 9: worker + database).

Menguji pola Instagram yang ditiru oleh threads/worker.py:
- Mapping parser output -> struktur database (tanpa DB live)
- posted_at ISO UTC -> naive datetime UTC
- post_type -> enum database
- process_post: upsert influencer + sentiment + insert post + hashtag
- dedup di level database (simulasi constraint ON CONFLICT DO NOTHING)
- _scrape_keywords: per-keyword / per-post error containment
- run(): job lifecycle + WorkerLock + save_state + counter

Semua test read-only (fake page + fake db, tanpa browser/DB asli).
"""

import json
from datetime import datetime
from pathlib import Path

import pytest

from threads import selectors
from threads.config import ThreadsConfig
from threads.session import SESSION_EXPIRED
from threads.worker import (
    ThreadsWorker,
    map_parsed_post,
    map_post_type,
    parse_posted_at,
)
from fake_playwright import FakeBrowser, FakeContext, FakePage

PLATFORM_ID = "11111111-1111-1111-1111-111111111111"

POST_LINK = selectors.POST_LINK
TIME = selectors.DETAIL_TIME
CONTENT_SPANS = selectors.DETAIL_CONTENT_SPANS
ACTION_BUTTONS = selectors.DETAIL_ACTION_BUTTONS
MEDIA_IMAGES = selectors.DETAIL_MEDIA_IMAGES
VIDEOS = selectors.DETAIL_VIDEOS
VIEWS_SPAN = selectors.DETAIL_VIEWS_SPAN
OG_TITLE = selectors.META_OG_TITLE
OG_IMAGE = selectors.META_OG_IMAGE
PROFILE_PIC = selectors.DETAIL_PROFILE_PIC_ALT.format(username="uteroindonesia")


# ----------------------------------------------------------------------
# Fake database (mensimulasikan shared/database.py + constraint DB)
# ----------------------------------------------------------------------

class FakeDB:
    """Fake DatabaseManager - mencatat call dan mensimulasikan dedup
    constraint (platform_id, platform_post_id, posted_at) -> DO NOTHING."""

    def __init__(self):
        self.influencer_calls = []
        self.post_inserts = []
        self.hashtag_updates = []
        self.job_updates = []
        self.seen_posts = set()
        self.raise_on_insert = False

    async def upsert_influencer(self, data):
        self.influencer_calls.append(data)
        return "inf-1"

    async def insert_post(self, data):
        if self.raise_on_insert:
            raise RuntimeError("db connection lost (simulasi)")
        key = (data["platform_post_id"], data["posted_at"])
        if key in self.seen_posts:
            return None
        self.seen_posts.add(key)
        self.post_inserts.append(data)
        return f"post-{len(self.post_inserts)}"

    async def update_hashtag_usage(self, hashtag):
        self.hashtag_updates.append(hashtag)

    async def create_scraping_job(self, platform_id):
        return "job-1"

    async def update_scraping_job(
        self, job_id, status, posts_collected=0, errors_count=0,
        error_message=None,
    ):
        self.job_updates.append(
            (job_id, status, posts_collected, errors_count, error_message)
        )


# ----------------------------------------------------------------------
# Helpers test
# ----------------------------------------------------------------------

def _config(tmp_path: Path = None) -> ThreadsConfig:
    if tmp_path is None:
        import tempfile

        tmp_path = Path(tempfile.mkdtemp())
    session_dir = tmp_path / "sessions" / "threads"
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
        max_posts_per_keyword=2,
        live_test=False,
    )


def _make_worker(db, keywords, config, **overrides):
    """Buat instance ThreadsWorker TANPA __init__ (tanpa DB live)."""
    worker = ThreadsWorker.__new__(ThreadsWorker)
    worker.db = db
    worker.platform_id = PLATFORM_ID
    worker.keywords = keywords
    worker.config = config
    worker.cookie_manager = None
    worker.metrics = {
        "candidates": 0,
        "parsed": 0,
        "relevant": 0,
        "filtered": 0,
        "inserted": 0,
        "duplicates": 0,
        "errors": 0,
    }
    for key, value in overrides.items():
        setattr(worker, key, value)
    return worker


def _parsed(
    post_id="DbSiiYZne76",
    username="uteroindonesia",
    posted_at="2026-08-08T20:14:52.000Z",
    content="Kok bisa ya #mbois @festmbois",
    post_type="image",
    likes=7300,
    comments=1100,
    shares=961,
    reposts=337,
    views=727000,
):
    return {
        "platform_post_id": post_id,
        "post_type": post_type,
        "content": content,
        "media_urls": ["https://cdn.example.com/photo.webp"],
        "post_url": f"https://www.threads.com/@{username}/post/{post_id}",
        "username": username,
        "full_name": "hariyani",
        "profile_picture_url": "https://cdn.example.com/avatar.jpg",
        "likes_count": likes,
        "comments_count": comments,
        "shares_count": shares,
        "reposts_count": reposts,
        "views_count": views,
        "posted_at": posted_at,
        "metadata": {
            "keyword_source": "mbois",
            "reposts_count": reposts,
            "is_edited": False,
            "og_image": None,
        },
    }


async def _noop_delay():
    pass


# ----------------------------------------------------------------------
# parse_posted_at (ISO UTC -> naive datetime)
# ----------------------------------------------------------------------

def test_parse_posted_at_iso_utc():
    assert parse_posted_at("2026-08-08T20:14:52.000Z") == \
        datetime(2026, 8, 8, 20, 14, 52)
    assert parse_posted_at("2026-08-08T20:14:52+00:00") == \
        datetime(2026, 8, 8, 20, 14, 52)


def test_parse_posted_at_invalid_or_missing():
    assert parse_posted_at(None) is None
    assert parse_posted_at("") is None
    assert parse_posted_at("garbage") is None


# ----------------------------------------------------------------------
# map_post_type (enum database)
# ----------------------------------------------------------------------

def test_map_post_type_to_db_enum():
    assert map_post_type("video") == "video"
    assert map_post_type("image") == "post"
    assert map_post_type("text") == "post"
    assert map_post_type(None) == "post"


# ----------------------------------------------------------------------
# map_parsed_post (parser -> struktur database)
# ----------------------------------------------------------------------

def test_map_parsed_post_full():
    mapped = map_parsed_post(_parsed())
    assert mapped is not None
    assert mapped["platform_user_id"] == "uteroindonesia"  # keputusan Phase 8
    assert mapped["username"] == "uteroindonesia"
    assert mapped["followers_count"] == 0
    assert mapped["is_verified"] is False
    assert mapped["post_type"] == "post"  # image -> post
    assert mapped["posted_at"] == datetime(2026, 8, 8, 20, 14, 52)
    assert mapped["likes_count"] == 7300
    assert mapped["shares_count"] == 961
    assert mapped["metadata"]["reposts_count"] == 337


def test_map_parsed_post_video():
    mapped = map_parsed_post(_parsed(post_type="video"))
    assert mapped["post_type"] == "video"


def test_map_parsed_post_none_counts_to_zero():
    mapped = map_parsed_post(_parsed(likes=None, comments=None, views=None))
    assert mapped["likes_count"] == 0
    assert mapped["comments_count"] == 0
    assert mapped["views_count"] == 0


def test_map_parsed_post_missing_posted_at_returns_none():
    assert map_parsed_post(_parsed(posted_at=None)) is None
    assert map_parsed_post(_parsed(posted_at="not-a-date")) is None


def test_map_parsed_post_missing_username_returns_none():
    assert map_parsed_post(_parsed(username="")) is None


# ----------------------------------------------------------------------
# process_post (upsert influencer + sentiment + insert + hashtag)
# ----------------------------------------------------------------------

async def test_process_post_success():
    db = FakeDB()
    worker = _make_worker(db, ["mbois"], _config())
    ok = await worker.process_post(_parsed())
    assert ok == "inserted"

    inf = db.influencer_calls[0]
    assert inf["platform_id"] == PLATFORM_ID
    assert inf["platform_user_id"] == "uteroindonesia"
    assert inf["followers_count"] == 0
    assert inf["is_verified"] is False

    post = db.post_inserts[0]
    assert post["platform_id"] == PLATFORM_ID
    assert post["influencer_id"] == "inf-1"
    assert post["platform_post_id"] == "DbSiiYZne76"
    assert post["post_type"] == "post"
    assert post["posted_at"] == datetime(2026, 8, 8, 20, 14, 52)
    assert post["shares_count"] == 961
    assert post["sentiment"] in ("positive", "neutral", "negative")
    assert post["hashtags"] == ["#mbois"]
    assert post["mentions"] == ["@festmbois"]
    assert post["location"] is None
    assert post["metadata"]["reposts_count"] == 337
    # Phase 12: keyword_source menjadi LIST keyword aktif yang match
    assert post["metadata"]["keyword_source"] == ["mbois"]

    assert db.hashtag_updates == ["#mbois"]


async def test_process_post_duplicate_skipped_at_db():
    """Post sama (platform_post_id + posted_at) -> insert DO NOTHING."""
    db = FakeDB()
    worker = _make_worker(db, ["mbois"], _config())
    parsed = _parsed()
    assert await worker.process_post(parsed) == "inserted"
    assert await worker.process_post(parsed) == "duplicate"
    assert len(db.post_inserts) == 1
    assert db.hashtag_updates == ["#mbois"]  # hanya sekali (post baru)


async def test_process_post_missing_posted_at_no_insert():
    db = FakeDB()
    worker = _make_worker(db, ["mbois"], _config())
    parsed = _parsed()
    parsed["posted_at"] = None
    assert await worker.process_post(parsed) == "skipped"
    assert db.post_inserts == []
    assert db.influencer_calls == []


async def test_process_post_db_error_contained():
    db = FakeDB()
    db.raise_on_insert = True
    worker = _make_worker(db, ["mbois"], _config())
    assert await worker.process_post(_parsed()) == "error"
    assert db.hashtag_updates == []


# ----------------------------------------------------------------------
# _scrape_keywords (pipeline penuh + error containment)
# ----------------------------------------------------------------------

async def test_scrape_keywords_full_pipeline():
    """Search -> dedup post_id -> max_posts -> parse -> insert DB."""
    db = FakeDB()
    config = _config()
    worker = _make_worker(db, ["mbois"], config)
    worker._delay_between_keywords = _noop_delay

    context = FakeContext()
    page = FakePage(
        context,
        url="about:blank",
        visible_selectors={
            POST_LINK, TIME, OG_TITLE, OG_IMAGE, PROFILE_PIC,
        },
        attributes={
            TIME: {"datetime": "2026-08-08T20:14:52.000Z"},
            OG_TITLE: {"content": "hariyani (@uteroindonesia) on Threads"},
            OG_IMAGE: {"content": "https://cdn.example.com/og.webp"},
            PROFILE_PIC: {"src": "https://cdn.example.com/avatar.jpg"},
        },
        eval_all={
            POST_LINK: [
                "/@uteroindonesia/post/DbSiiYZne76",
                "/@uteroindonesia/post/DbSiiYZne76/media",  # variant -> skip
                "/@b/post/2",
                "/@c/post/3",  # melebihi max_posts=2 -> tidak diproses
            ],
            CONTENT_SPANS: [
                "uteroindonesia", "RS thread", "2d",
                "Kok bisa ya #mbois",
            ],
            ACTION_BUTTONS: [
                "More", "Follow", "Translate",
                "Like7.3K", "Reply1.1K", "Repost337", "Share961",
            ],
            MEDIA_IMAGES: [
                {"alt": "uteroindonesia's profile picture",
                 "src": "https://cdn.example.com/avatar.jpg"},
                {"alt": "Photo by hariyani on August 08, 2026.",
                 "src": "https://cdn.example.com/photo.webp"},
            ],
            VIDEOS: [],
            VIEWS_SPAN: ["For you", "Feeds", "727K views"],
        },
    )

    posts, errors = await worker._scrape_keywords(page)
    assert posts == 2
    assert errors == 0

    inserted = {p["platform_post_id"] for p in db.post_inserts}
    assert inserted == {"DbSiiYZne76", "2"}  # /media variant di-skip, cap 2

    post = next(p for p in db.post_inserts
                if p["platform_post_id"] == "DbSiiYZne76")
    assert post["post_type"] == "post"
    assert post["posted_at"] == datetime(2026, 8, 8, 20, 14, 52)
    assert post["likes_count"] == 7300
    assert post["shares_count"] == 961
    assert post["views_count"] == 727000
    assert "#mbois" in post["hashtags"]
    # Kedua post (@uteroindonesia dan @b) berisi "#mbois" - masing-masing
    # update hashtag sekali (sebelumnya post @b salah ter-capture sebagai
    # span header 'uteroindonesia' - diperbaiki extract_content_from_spans).
    assert db.hashtag_updates == ["#mbois", "#mbois"]

    assert page.url == "https://www.threads.com/@b/post/2"


async def test_scrape_keywords_error_containment(monkeypatch):
    """Error per keyword / per post TIDAK menghentikan keyword lain."""
    db = FakeDB()
    worker = _make_worker(db, ["boom", "ok"], _config())
    worker._delay_between_keywords = _noop_delay

    calls = []

    async def fake_collect(page, keyword, max_posts, timeout_ms):
        calls.append(("collect", keyword))
        if keyword == "boom":
            raise RuntimeError("search exploded (simulasi)")
        return [
            "https://www.threads.com/@a/post/1",
            "https://www.threads.com/@a/post/2",
        ]

    async def fake_parse(page, url, keyword, timeout_ms):
        calls.append(("parse", url))
        if url.endswith("/2"):
            raise RuntimeError("parse exploded (simulasi)")
        return _parsed(post_id="1", username="a",
                       posted_at="2026-08-01T00:00:00.000Z")

    async def fake_process(parsed):
        calls.append(("process", parsed["platform_post_id"]))
        return "inserted"

    monkeypatch.setattr("threads.worker.collect_post_links", fake_collect)
    monkeypatch.setattr("threads.worker.parse_post_data", fake_parse)
    worker.process_post = fake_process

    posts, errors = await worker._scrape_keywords(None)
    assert posts == 1
    assert errors == 2  # 1 keyword error + 1 post error

    # Semua keyword tetap diproses, tidak berhenti di error pertama
    assert ("collect", "boom") in calls
    assert ("collect", "ok") in calls
    assert ("process", "1") in calls
    assert ("parse", "https://www.threads.com/@a/post/2") in calls


async def test_scrape_keywords_no_results_not_error():
    db = FakeDB()
    worker = _make_worker(db, ["tidakada"], _config())
    worker._delay_between_keywords = _noop_delay

    context = FakeContext()
    page = FakePage(context, url="about:blank")

    posts, errors = await worker._scrape_keywords(page)
    assert posts == 0
    assert errors == 0
    assert db.post_inserts == []


# ----------------------------------------------------------------------
# run() (lifecycle lengkap: lock, job, session, save_state)
# ----------------------------------------------------------------------

def _write_storage(config: ThreadsConfig) -> None:
    config.session_dir.mkdir(parents=True, exist_ok=True)
    config.storage_state_file.write_text(
        json.dumps({"cookies": [], "origins": []}), encoding="utf-8"
    )


class FakeSession:
    """Fake ThreadsSessionManager untuk run() test."""

    def __init__(self, context, status=SESSION_EXPIRED):
        self._context = context
        self.status = status
        self.saved_state_calls = 0
        self.closed = False

    async def get_context(self, browser):
        return self._context

    async def check_session(self, context):
        return {"status": self.status, "url": "https://www.threads.com/"}

    async def save_state(self, context=None):
        self.saved_state_calls += 1

    async def close_context(self):
        self.closed = True


async def _fake_profile(context, config):
    return {
        "username": "festmbois",
        "displayName": "Fest Mbois",
        "authenticated": True,
        "profileUrl": "https://www.threads.com/@festmbois",
        "status": "USERNAME_VERIFIED",
    }


def _search_page() -> FakePage:
    context = FakeContext()
    page = FakePage(
        context,
        url="about:blank",
        visible_selectors={POST_LINK, TIME},
        attributes={TIME: {"datetime": "2026-08-08T20:14:52.000Z"}},
        eval_all={
            POST_LINK: ["/@a/post/1"],
            CONTENT_SPANS: ["a", "1d", "Bisa #mbois"],
            ACTION_BUTTONS: ["Like7.3K", "Reply1.1K", "Repost337", "Share961"],
            MEDIA_IMAGES: [],
            VIDEOS: [],
            VIEWS_SPAN: ["For you", "727K views"],
        },
    )
    context._page = page  # FakeContext.new_page() menyalin context._page
    return page


async def test_run_completes_job_with_counters(tmp_path, monkeypatch):
    """run() valid: lock -> job created -> scrape -> job completed."""
    config = _config(tmp_path)
    _write_storage(config)

    db = FakeDB()
    page = _search_page()
    worker = _make_worker(db, ["mbois"], config)
    worker._delay_between_keywords = _noop_delay
    worker.browser = FakeBrowser()
    worker.session = FakeSession(page.context, status="valid")

    lock_events = []

    class FakeLock:
        def __init__(self, name):
            self.name = name

        async def acquire(self, db):
            lock_events.append(("acquire", self.name))
            return True

        async def release(self):
            lock_events.append(("release", self.name))

    monkeypatch.setattr("threads.worker.WorkerLock", FakeLock)
    monkeypatch.setattr("threads.worker.get_threads_profile", _fake_profile)

    await worker.run()

    assert lock_events == [("acquire", "threads"), ("release", "threads")]
    assert db.job_updates[-1][0] == "job-1"
    assert db.job_updates[-1][1] == "completed"
    assert db.job_updates[-1][2] == 1  # posts_collected
    assert db.job_updates[-1][3] == 0  # errors
    assert len(db.post_inserts) == 1
    assert worker.session.saved_state_calls >= 1
    assert db.post_inserts[0]["posted_at"] == datetime(2026, 8, 8, 20, 14, 52)


async def test_run_session_expired_fails_job(tmp_path, monkeypatch):
    """Session expired -> job failed + TIDAK ada scraping (pola existing)."""
    config = _config(tmp_path)
    _write_storage(config)

    db = FakeDB()
    page = _search_page()
    worker = _make_worker(db, ["mbois"], config)
    worker.browser = FakeBrowser()
    worker.session = FakeSession(page.context, status="expired")

    lock_events = []

    class FakeLock:
        def __init__(self, name):
            self.name = name

        async def acquire(self, db):
            lock_events.append(("acquire", self.name))
            return True

        async def release(self):
            lock_events.append(("release", self.name))

    monkeypatch.setattr("threads.worker.WorkerLock", FakeLock)

    await worker.run()

    assert lock_events == [("acquire", "threads"), ("release", "threads")]
    assert db.job_updates[-1][0] == "job-1"
    assert db.job_updates[-1][1] == "failed"
    assert db.post_inserts == []
    assert db.influencer_calls == []


async def test_run_disabled_no_browser_no_job(tmp_path, monkeypatch):
    """THREADS_ENABLED=false -> worker SKIP (tanpa lock/job/browser)."""
    config = _config(tmp_path)
    config = ThreadsConfig(
        enabled=False,
        headless=True,
        session_dir=config.session_dir,
        cookies_file=config.cookies_file,
        storage_state_file=config.storage_state_file,
        published_log_file=config.published_log_file,
        timeout_ms=5000,
        slow_mo_ms=0,
        viewport=(1280, 800),
        retry_count=1,
        retry_base_delay=0.01,
        max_posts_per_keyword=2,
        live_test=False,
    )
    db = FakeDB()
    worker = _make_worker(db, ["mbois"], config)

    lock_events = []

    class FakeLock:
        def __init__(self, name):
            self.name = name

        async def acquire(self, db):
            lock_events.append(("acquire", self.name))
            return True

        async def release(self):
            lock_events.append(("release", self.name))

    monkeypatch.setattr("threads.worker.WorkerLock", FakeLock)

    await worker.run()

    assert lock_events == []  # lock TIDAK diambil
    assert db.job_updates == []  # job TIDAK dibuat
