"""Unit test search Threads (metode A: keyword -> URL detail post).

Menguji dedup post_id, canonicalize href, batas max_posts, dan
perilaku keyword tanpa hasil (read-only, fake page).
"""

from threads import selectors
from threads.search import collect_post_links, collect_post_links_sync
from fake_playwright import FakeContext, FakePage

POST_LINK = selectors.POST_LINK

RELATIVE = "/@testuser/post/abc123"
MEDIA = "/@testuser/post/abc123/media"


# ----------------------------------------------------------------------
# collect_post_links_sync (murni, tanpa page)
# ----------------------------------------------------------------------

def test_empty_hrefs():
    assert collect_post_links_sync([], 50) == []


def test_max_posts_zero():
    hrefs = ["/@a/post/1", "/@b/post/2"]
    assert collect_post_links_sync(hrefs, 0) == []


def test_relative_and_absolute_canonicalized():
    hrefs = [
        RELATIVE,
        "https://www.threads.com/@other/post/def456",
    ]
    links = collect_post_links_sync(hrefs, 50)
    assert links == [
        "https://www.threads.com/@testuser/post/abc123",
        "https://www.threads.com/@other/post/def456",
    ]


def test_dedup_by_post_id_media_variant_skipped():
    """Link /media dari post yang sama diabaikan (URL detail = /post id)."""
    hrefs = ["/@a/post/1", "/@a/post/1/media", "/@b/post/2"]
    assert collect_post_links_sync(hrefs, 50) == [
        "https://www.threads.com/@a/post/1",
        "https://www.threads.com/@b/post/2",
    ]


def test_media_only_post_kept():
    """Post yang hanya muncul sebagai /media tetap dipakai."""
    hrefs = ["/@a/post/1/media", "/@a/post/1/media", "/@b/post/2"]
    assert collect_post_links_sync(hrefs, 50)[0] == \
        "https://www.threads.com/@a/post/1/media"


def test_media_then_normal_upgraded():
    """Jika URL non-media muncul belakangan, ganti variant /media."""
    hrefs = ["/@a/post/1/media", "/@a/post/1", "/@b/post/2"]
    assert collect_post_links_sync(hrefs, 50)[0] == \
        "https://www.threads.com/@a/post/1"


def test_max_posts_limit():
    hrefs = ["/@a/post/1", "/@b/post/2", "/@c/post/3", "/@d/post/4"]
    assert len(collect_post_links_sync(hrefs, 2)) == 2


def test_non_post_links_ignored():
    hrefs = ["/@profile", "https://example.com/x", "/@a/post/5"]
    assert collect_post_links_sync(hrefs, 50) == [
        "https://www.threads.com/@a/post/5"
    ]


# ----------------------------------------------------------------------
# collect_post_links (async, fake page)
# ----------------------------------------------------------------------

async def test_collect_via_page():
    context = FakeContext()
    page = FakePage(
        context,
        url="about:blank",
        visible_selectors={POST_LINK},
        eval_all={POST_LINK: [RELATIVE, MEDIA, "/@b/post/2"]},
    )
    links = await collect_post_links(page, "festival", max_posts=50)
    assert links == [
        "https://www.threads.com/@testuser/post/abc123",
        "https://www.threads.com/@b/post/2",
    ]
    assert page.url == "https://www.threads.com/search?q=festival"


async def test_collect_keyword_no_results():
    """Keyword tanpa hasil: wait_for timeout -> [] (bukan error)."""
    context = FakeContext()
    page = FakePage(context, url="about:blank")
    links = await collect_post_links(page, "tidakada hasil", max_posts=50)
    assert links == []
    assert page.url == \
        "https://www.threads.com/search?q=tidakada+hasil"


async def test_collect_respects_max_posts():
    context = FakeContext()
    page = FakePage(
        context,
        url="about:blank",
        visible_selectors={POST_LINK},
        eval_all={POST_LINK: ["/@a/post/1", "/@b/post/2", "/@c/post/3"]},
    )
    links = await collect_post_links(page, "mbois", max_posts=2)
    assert len(links) == 2
    assert links[-1] == "https://www.threads.com/@b/post/2"