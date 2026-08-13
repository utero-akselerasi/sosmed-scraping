"""
Search Threads (keyword -> URL detail post).

Metode A (disetujui): search keyword di threads.com/search?q=<keyword>,
kumpulkan semua link post (a[href*="/post/"]), lalu buka halaman detail
satu per satu (lihat post_parser.py) untuk mendapatkan timestamp ISO
exact - search card hanya menampilkan waktu relatif ("2d", "04/15/25").

Dedup WAJIB memakai post_id (bukan URL): search page mengeluarkan link
/@{user}/post/<id> DAN /@{user}/post/<id>/media untuk post yang sama.
Variant /media tidak dipakai untuk detail - prefer URL post biasa.

Batas: max_posts (THREADS_MAX_POSTS) per keyword.
"""

from __future__ import annotations

from typing import Any, List, Optional

from loguru import logger

from threads import selectors

# JS untuk Playwright locator.evaluate_all (di-fake di unit test).
_JS_HREF_ALL = "els => els.map(e => e.getAttribute('href'))"


def _canonicalize(href: str) -> str:
    """Ubah href relatif ('/@user/post/abc') menjadi URL absolut."""
    if href.startswith("/"):
        return selectors.THREADS_HOST + href
    return href


def collect_post_links_sync(
    hrefs: List[str], max_posts: int
) -> List[str]:
    """Dedup + canonicalize daftar href hasil search (testable murni).

    - Hanya link yang cocok pola /@user/post/<id>.
    - Satu entry per post_id (dedup order-preserving).
    - Variant /media di-skip jika URL post biasa sudah ada; jika post
      hanya muncul sebagai /media, URL /media tetap dipakai.
    - Dibatasi max_posts.
    """
    if max_posts <= 0:
        return []
    seen: dict = {}
    order: List[str] = []
    for raw in hrefs:
        href = _canonicalize(raw or "")
        match = selectors.POST_URL_RE.search(href)
        if not match:
            continue
        post_id = match.group(2)
        is_media = href.rstrip("/").endswith("/media")
        if post_id in seen:
            if not is_media:
                seen[post_id] = href
            continue
        seen[post_id] = href
        order.append(post_id)
    return [seen[pid] for pid in order[:max_posts]]


async def collect_post_links(
    page: Any,
    keyword: str,
    max_posts: int = 50,
    timeout_ms: int = 30000,
) -> List[str]:
    """Kumpulkan URL detail post dari halaman search (metode A).

    Navigasi ke threads.com/search?q=<keyword>, tunggu hasil (link
    post), lalu dedup + cap max_posts. Hasil kosong (keyword tanpa
    hasil / tanpa link post) -> [] (bukan error).
    """
    search_url = selectors.threads_search_url(keyword)
    logger.info(f"[Threads] Search: {search_url}")
    await page.goto(
        search_url,
        wait_until="domcontentloaded",
        timeout=timeout_ms,
    )
    try:
        await page.locator(selectors.POST_LINK).first.wait_for(
            state="attached", timeout=timeout_ms
        )
    except Exception:
        logger.warning(
            f"[Threads] Search '{keyword}' tidak menghasilkan link post"
        )
        return []
    hrefs: List[str] = await page.locator(selectors.POST_LINK).evaluate_all(
        _JS_HREF_ALL
    )
    links = collect_post_links_sync(hrefs, max_posts)
    logger.info(
        f"[Threads] Search '{keyword}': {len(hrefs)} link mentah -> "
        f"{len(links)} post unik (max={max_posts})"
    )
    return links
