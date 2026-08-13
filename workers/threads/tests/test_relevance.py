"""Unit test Phase 12 - Strict Keyword Relevance untuk Threads.

Menguji shared/relevance.py (matcher) dan integrasinya di
threads/worker.py:
- 12 kasus matcher langsung (spesifikasi Phase 12)
- post tidak relevan TIDAK memanggil insert_post/upsert_influencer
- post relevan TIDAK menghasilkan duplicate DB row
- active keyword dari DB benar-benar dipakai (bukan hardcoded)

Tanpa browser/DB live (FakeDB + fake page).
"""

from pathlib import Path

import pytest

from shared.relevance import (
    is_relevant,
    match_keywords,
    normalize_text,
)
from threads.worker import ThreadsWorker
from test_worker_integration import FakeDB, _config, _make_worker, _parsed


# ----------------------------------------------------------------------
# Matcher: kasus spesifikasi (1-12)
# ----------------------------------------------------------------------

@pytest.mark.parametrize(
    "keyword,content,expected",
    [
        # 1. phrase utama
        ("festival mbois", "Festival Mbois 2026", True),
        # 2. phrase + token tambahan
        ("festival mbois", "festival mbois malang", True),
        # 3. punctuation
        ("festival mbois", "Festival Mbois!", True),
        # 4. substring tanpa token boundary (multi-token keyword)
        ("festival mbois", "festivalvibe", False),
        # 5. substring tanpa token boundary (single-token keyword)
        ("festival", "festivalvibe", False),
        # 6. single-token keyword + konteks
        ("festival", "Festival di Malang", True),
        # 7. case insensitive
        ("festival mbois", "FESTIVAL MBOIS", True),
        ("FESTIVAL MBOIS", "festival mbois", True),
        # 8. multiple spaces / newline / tab
        ("festival mbois", "Festival    Mbois", True),
        ("festival mbois", "festival\nmbois", True),
        ("festival mbois", "Festival\tMbois 2026", True),
        # 9. punctuation lain (koma, titik, emoji, @, #)
        ("festival mbois", "festival, mbois", True),
        ("festival mbois", "Halo. Festival Mbois. Mantap.", True),
        ("festival mbois", "Festival Mbois 🎉🔥", True),
        ("festival mbois", "Ikut #festivalmbois ya", False),  # satu token
        ("festival", "#festivalmbois", False),  # satu token, bukan festival
        # 10. empty content
        ("festival mbois", "", False),
        ("festival mbois", None, False),
        ("festival mbois", "   ", False),
        # 11. empty keyword
        ("", "Festival Mbois", False),
        (None, "Festival Mbois", False),
        ("   ", "Festival Mbois", False),
        # 12. keyword dengan karakter khusus
        ("festival-mbois", "Festival Mbois", True),
        ("festival.mbois", "Festival Mbois 2026", True),
        ("!!!", "Festival Mbois", False),
        ("fest mbois!", "Festival Mbois", False),
        # token urutan terbalik tidak match (strict phrase)
        ("festival mbois", "mbois banget festivalnya", False),
        ("festival mbois", "mbois festival", False),
        # keyword lebih panjang dari content
        ("festival mbois malang", "Festival Mbois", False),
    ],
)
def test_is_relevant(keyword, content, expected):
    assert is_relevant(keyword, content) is expected


# ----------------------------------------------------------------------
# normalize_text / match_keywords
# ----------------------------------------------------------------------

def test_normalize_text_basic():
    assert normalize_text("  Festival,   Mbois!  ") == "festival mbois"
    assert normalize_text("Festival Mbois 🎉") == "festival mbois"
    assert normalize_text("") == ""
    assert normalize_text(None) == ""


def test_match_keywords_multiple_and_dedup():
    matched = match_keywords(
        ["festival", "mbois", "festival mbois", "festival mbois"],
        "Festival Mbois 2026",
    )
    assert matched == ["festival", "mbois", "festival mbois"]


def test_match_keywords_none_match():
    assert match_keywords(
        ["festival mbois", "mbois malang"], "festivalvibe"
    ) == []
    assert match_keywords([], "Festival Mbois") == []


def test_match_keywords_case_and_punct():
    # Keyword dengan case berbeda dianggap sama; "festival, mbois"
    # dinormalisasi jadi "festival mbois" (punctuation normalization).
    matched = match_keywords(
        ["FESTIVAL MBOIS", "festival, mbois"], "festival mbois malang"
    )
    assert matched == ["FESTIVAL MBOIS"]  # duplikat dinormalisasi dibuang


# ----------------------------------------------------------------------
# Integrasi worker (13-16)
# ----------------------------------------------------------------------

async def test_irrelevant_post_never_reaches_db():
    """13. Post tidak relevan -> filtered: insert_post & upsert_influencer
    TIDAK pernah dipanggil."""
    db = FakeDB()
    worker = _make_worker(db, ["festival mbois"], _config())
    parsed = _parsed(content="festivalvibe, mbois banget, festival lain")

    status = await worker.process_post(parsed)

    assert status == "filtered"
    assert db.post_inserts == []
    assert db.influencer_calls == []
    assert db.hashtag_updates == []


async def test_relevant_post_reaches_db():
    """14. Post relevan -> inserted: insert_post & influencer dipanggil."""
    db = FakeDB()
    worker = _make_worker(db, ["festival mbois"], _config())
    parsed = _parsed(content="Festival Mbois 2026 akan segera hadir!")

    status = await worker.process_post(parsed)

    assert status == "inserted"
    assert len(db.post_inserts) == 1
    assert len(db.influencer_calls) == 1
    assert db.post_inserts[0]["metadata"]["keyword_source"] == [
        "festival mbois"
    ]


async def test_two_keywords_found_no_duplicate_row():
    """15. Satu post ditemukan oleh dua keyword aktif -> satu row saja
    (dedup existing via constraint DB)."""
    db = FakeDB()
    worker = _make_worker(db, ["festival mbois", "mbois"], _config())

    first = _parsed(content="Festival Mbois 2026, mbois terbaik")
    second = _parsed(content="Festival Mbois 2026, mbois terbaik")
    first["metadata"] = dict(first.get("metadata") or {})
    second["metadata"] = dict(second.get("metadata") or {})

    assert await worker.process_post(first) == "inserted"
    assert await worker.process_post(second) == "duplicate"

    assert len(db.post_inserts) == 1
    # keyword_source = semua keyword yang match (list)
    assert db.post_inserts[0]["metadata"]["keyword_source"] == [
        "festival mbois",
        "mbois",
    ]


async def test_keywords_come_from_database_not_hardcoded(monkeypatch):
    """16. Active keyword diambil dari DB (get_active_keywords), bukan
    hardcoded di worker."""
    db = FakeDB()
    db.active_keywords = ["festival mbois malang"]

    async def fake_get_active_keywords():
        return list(db.active_keywords)

    async def fake_get_platform_by_type(platform_type):
        return {"id": PLATFORM_ID_VAL, "name": "Threads"}

    async def fake_connect():
        return None

    db.get_active_keywords = fake_get_active_keywords
    db.get_platform_by_type = fake_get_platform_by_type
    db.connect = fake_connect

    worker = ThreadsWorker.__new__(ThreadsWorker)
    worker.config = _config()
    worker.db = db
    worker.cookie_manager = None
    worker.session = None
    worker.browser = None

    await worker.initialize()

    assert worker.keywords == ["festival mbois malang"]
    assert worker.platform_id == PLATFORM_ID_VAL


PLATFORM_ID_VAL = "22222222-2222-2222-2222-222222222222"
