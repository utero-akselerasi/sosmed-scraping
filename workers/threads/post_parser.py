"""
Parser halaman detail post Threads (metode A - sumber data utama).

Membuka URL detail /@<username>/post/<id> (dihasilkan search.py) dan
mengekstrak data post berdasarkan selector VERIFIED live (Phase 7,
2026-08-11). Field yang belum terbukti di DOM diisi None - TIDAK ada
tebakan.

Struktur yang sudah terverifikasi:
- Container utama            [aria-label="Column body"] (tanpa article/main)
- Timestamp ISO UTC          <time datetime> PERTAMA di halaman
- Username + post_id         dari URL (pola /@user/post/<id>)
- Content                    span[dir="auto"] pertama setelah header
                             [username, badge, waktu] di column body
                             (badge lokasi/komunitas "Malang"/"poliponi
                             bali" BUKAN content - VERIFIED live)
- Waktu header (ID)          "4 hari" / "2 jam" / "Baru saja" /
                             tanggal "22/07/2026" (VERIFIED live)
- Likes/Reply/Repost/Share  teks tombol "Suka7.3K"/"Like7.3K" dll; grup
                             PERTAMA di column body = post utama.
                             Tombol bisa telat terhydrasi pada post
                             media - parser menunggu (bounded) sebelum
                             membaca count (VERIFIED live 2026-08-11)
- View count                 span pertama berpola "727K views"/
                             "2,6 rb tayangan"
- Avatar                     img[alt="Foto profil {username}"] /
                             's profile picture"
- Gambar media               img[alt^="Photo by"] (bukan avatar;
                             alt tetap EN meski UI id-ID)
- Video                      <video src="..."> (poster kosong; src
                             dibaca segera - bisa di-clear setelah
                             autoplay gagal). Fallback: cover video =
                             img media-slot NON-avatar ber-alt kosong
                             (CDN v51.71878-15) tanpa "Photo by" ->
                             post tetap diklasifikasikan video
                             (VERIFIED live 2026-08-11).
- Display name               og:title "DisplayName (@username) on Threads"
                             (dalam DOM belum ditemukan selector stabil)

Format count: "7.3K" -> 7300, "337" -> 337. posted_at dikembalikan
sebagai string ISO UTC (dikonversi oleh pemanggil bila perlu).
"""

from __future__ import annotations

import asyncio
import re
import time
from typing import Any, Dict, List, Optional

from loguru import logger

from threads import selectors

_JS_TEXT_ALL = "els => els.map(e => (e.textContent || '').trim())"
_JS_IMG_DATA = (
    "els => els.map(e => ({alt: e.getAttribute('alt') || '', "
    "src: e.getAttribute('src') || ''}))"
)
_JS_VIDEO_SRC = "els => els.map(e => e.getAttribute('src') || '')"
# True jika minimal satu tombol aksi sudah terhydrasi (punya teks count).
_JS_BUTTONS_HYDRATED = (
    "els => els.some(e => /^(Suka|Like|Balas|Reply)/"
    ".test((e.textContent || '').trim()))"
)

# Waktu relatif pada detail page: EN "2d"/"4h"/"5m", ID "4 hari"/"2 jam"
# /"Baru saja" (VERIFIED live 2026-08-11), atau tanggal "04/15/25".
_REL_TIME_RE = re.compile(r"^\d+[dhms]$")
_REL_TIME_ID_RE = re.compile(
    r"^(\d+\s*(?:hari|jam|mnt|menit|detik|minggu)|baru saja)$", re.I
)
_DATE_RE = re.compile(r"^\d{1,2}/\d{1,2}/\d{2,4}$")
_VIEWS_RE = re.compile(
    r"^\s*(\d+(?:[.,]\d+)?\s*(?:[KM]|rb|jt)?)\s*(?:views|tayangan)\s*$",
    re.I,
)
_OG_TITLE_RE = re.compile(r"^(.*?)\s*\(@")
# Badge komunitas di header post (UI id-ID "komunitas malang" / EN
# "community ...") - muncul SEBELUM tanggal, bukan content. Heuristik:
# kata pertama "komunitas"/"community" - content asli yang diawali kata
# itu sangat jarang di keyword event/festival.
_BADGE_RE = re.compile(r"^(komunitas|community)\b", re.I)

# Prefix tombol aksi. UI live (locale id-ID) memakai Suka/Balas/Posting
# ulang/Bagikan; EN (Like/Reply/Repost/Share) tetap dipertahankan sebagai
# fallback. "Posting ulang" harus diperiksa sebelum "Posting" apa pun -
# karena tidak ada prefix "Posting" lain, urutan aman.
_ACTION_PREFIXES = (
    ("Like", "likes_count"),
    ("Reply", "comments_count"),
    ("Repost", "reposts_count"),
    ("Share", "shares_count"),
    ("Suka", "likes_count"),
    ("Balas", "comments_count"),
    ("Posting ulang", "reposts_count"),
    ("Bagikan", "shares_count"),
)

# Suffix count Indonesia: "rb" (ribu) / "jt" (juta), EN: K/M.
_COUNT_SUFFIX_MULT = {
    "K": 1_000,
    "M": 1_000_000,
    "rb": 1_000,
    "jt": 1_000_000,
}


def parse_count_value(
    text: str, suffix_mult: Optional[str] = None
) -> Optional[int]:
    """Parse count Threads -> int. '7.3K'->7300, '337'->337,
    '2,6 rb'->2600.

    Tanpa suffix: '.' dan ',' diperlakukan sebagai pemisah ribuan
    (format Indonesia "2.380"). Dengan suffix K/M/rb/jt: desimal.
    """
    if text is None:
        return None
    match = re.match(
        r"^\s*(\d+(?:[.,]\d+)?)\s*([KM]|rb|jt)?\s*$", text
    )
    if not match:
        return None
    num_str, suffix = match.group(1), match.group(2)
    if not suffix:
        suffix = suffix_mult
    if suffix:
        value = float(num_str.replace(",", "."))
        key = suffix.upper() if len(suffix) == 1 else suffix.lower()
        multiplier = _COUNT_SUFFIX_MULT.get(key, 1_000)
        return int(round(value * multiplier))
    return int(num_str.replace(".", "").replace(",", ""))


def _parse_count(text: str) -> Optional[int]:
    return parse_count_value((text or "").strip())


def extract_post_username(url: str) -> Optional[str]:
    """Username dari URL detail post (sumber utama, VERIFIED)."""
    match = selectors.POST_URL_RE.search(url or "")
    return match.group(1) if match else None


# Header post: [username, badge(lokasi/komunitas), waktu, <content>...].
# Waktu (date EN/ID / relatif EN/ID) selalu ada di header; badge ada
# SEBELUM waktu. Heuristik content: span non-empty pertama SETELAH span
# waktu pertama dalam 5 span awal (main post; reply punya header sendiri
# di bawahnya). Fallback: skip span header yang dikenal.
_HEADER_MAX_SPANS = 5


def _is_time_span(value: str) -> bool:
    """True jika span adalah waktu header (date/relatif EN/ID)."""
    return bool(
        _REL_TIME_RE.match(value)
        or _REL_TIME_ID_RE.match(value)
        or _DATE_RE.match(value)
    )


def extract_content_from_spans(
    spans: List[str], username: str
) -> str:
    """Content = span[dir="auto"] pertama setelah header post.

    Header yang di-skip: username, badge (komunitas/lokasi), waktu
    (relatif EN "2d" / ID "4 hari" / tanggal), label "RS thread"/
    "Edited", pola view count.
    """
    # Primary: content = span non-empty pertama SETELAH span waktu header.
    for i, text in enumerate(spans[:_HEADER_MAX_SPANS]):
        if _is_time_span((text or "").strip()):
            for j in range(i + 1, len(spans)):
                value = (spans[j] or "").strip()
                if value:
                    return value
            return ""
    # Fallback: tanpa span waktu di header, skip span header yang dikenal.
    for text in spans:
        value = (text or "").strip()
        if not value:
            continue
        if value == username:
            continue
        if value in ("Edited", "RS thread", "Translate", "Diedit"):
            continue
        if _BADGE_RE.match(value):
            continue
        if _is_time_span(value):
            continue
        if _VIEWS_RE.match(value):
            continue
        return value
    return ""


def extract_action_counts(
    buttons: List[str],
) -> Dict[str, Optional[int]]:
    """Count Like/Reply/Repost/Share dari teks tombol aksi.

    Grup PERTAMA di column body = post utama (DOM order terverifikasi).
    'Like7.3K' -> likes_count 7300.
    """
    counts: Dict[str, Optional[int]] = {
        "likes_count": None,
        "comments_count": None,
        "reposts_count": None,
        "shares_count": None,
    }
    for text in buttons:
        value = (text or "").strip()
        for prefix, key in _ACTION_PREFIXES:
            if counts[key] is not None:
                continue
            if value.startswith(prefix):
                counts[key] = _parse_count(value[len(prefix):])
    return counts


def extract_views(spans: List[str]) -> Optional[int]:
    """View count = span pertama berpola '727K views'."""
    for text in spans:
        value = (text or "").strip()
        match = _VIEWS_RE.match(value)
        if match:
            return parse_count_value(match.group(1))
    return None


def display_name_from_og_title(
    og_title: Optional[str],
) -> Optional[str]:
    """Display name dari og:title 'DisplayName (@user) on Threads'."""
    if not og_title:
        return None
    match = _OG_TITLE_RE.match(og_title.strip())
    if not match:
        return None
    name = match.group(1).strip()
    if not name or name.startswith("@"):
        return None
    return name


async def _first_attr_any(
    page: Any, selectors_list, attr: str
) -> Optional[str]:
    """Ambil attribute pertama yang tersedia dari daftar selector
    (ID primary, EN fallback)."""
    for selector in selectors_list:
        try:
            value = await page.locator(selector).first.get_attribute(attr)
            if value:
                return value
        except Exception:
            continue
    return None


async def _evaluate_all_any(page: Any, selectors_list, js: str) -> List[Any]:
    """evaluate_all dari selector pertama yang menghasilkan data
    (ID primary, EN fallback)."""
    for selector in selectors_list:
        try:
            results = await page.locator(selector).evaluate_all(js)
            if results:
                return results
        except Exception:
            continue
    return []


async def _wait_action_counts_hydrated(
    page: Any, timeout_ms: int = 5000
) -> None:
    """Tunggu (bounded) hingga tombol aksi punya teks count (hydrasi React).

    VERIFIED live 2026-08-11: pada post dengan media/carousel, tombol
    aksi ("Suka71", "Balas22", ...) masih kosong tepat setelah
    domcontentloaded dan terisi ~1-1.5s kemudian. Tanpa tunggu ini,
    likes/comments/shares bisa ter-baca None -> disimpan 0 di DB.

    Jika tidak ada tombol aksi sama sekali, langsung kembali (tidak ada
    yang ditunggu). Maksimal timeout_ms - tidak pernah loop tanpa batas.
    """
    deadline = time.monotonic() + timeout_ms / 1000
    has_buttons = False
    while True:
        ready = False
        for selector in selectors.DETAIL_ACTION_BUTTONS_ALL:
            try:
                if await page.locator(selector).count() == 0:
                    continue
                has_buttons = True
                if await page.locator(selector).evaluate_all(
                    _JS_BUTTONS_HYDRATED
                ):
                    ready = True
            except Exception:
                continue
        if ready or not has_buttons:
            return
        if time.monotonic() >= deadline:
            return
        await asyncio.sleep(0.25)


async def parse_post_data(
    page: Any,
    url: str,
    keyword: str,
    timeout_ms: int = 30000,
) -> Optional[Dict[str, Any]]:
    """Buka halaman detail post dan ekstrak data post.

    Returns:
        dict dengan kunci (pola instagram worker post_to_data):
            platform_post_id, post_type ('video'|'image'|'text'),
            content, media_urls, post_url, username, full_name,
            profile_picture_url, likes_count, comments_count,
            shares_count, reposts_count, views_count, posted_at (ISO),
            metadata
        None jika URL bukan pola detail post yang dikenal.
    """
    match = selectors.POST_URL_RE.search(url or "")
    if not match:
        return None
    username, post_id = match.group(1), match.group(2)

    await page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)

    # Media dibaca SEGERA - VERIFIED live 2026-08-11: src video CDN bisa
    # di-clear React setelah autoplay gagal ("kesulitan memutar video"),
    # dan alt gambar media baru muncul saat render selesai.
    images: List[Dict[str, str]] = await _evaluate_all_any(
        page, selectors.DETAIL_MEDIA_IMAGES_ALL, _JS_IMG_DATA
    )
    media_images = [
        img["src"]
        for img in images
        if img.get("alt", "").startswith("Photo by") and img.get("src")
    ]
    # Cover video = img media-slot NON-avatar dengan alt kosong (VERIFIED
    # live 2026-08-11): post video merender cover (CDN v51.71878-15) +
    # placeholder <video> yang jarang ter-mount, sedangkan post gambar
    # selalu punya minimal satu img ber-alt "Photo by". Jika hanya ada
    # cover tanpa video src, post tetap diklasifikasikan video.
    video_cover = next(
        (
            img["src"]
            for img in images
            if not img.get("alt") and img.get("src")
        ),
        None,
    )
    video_srcs = [
        src
        for src in await _evaluate_all_any(
            page, selectors.DETAIL_VIDEOS_ALL, _JS_VIDEO_SRC
        )
        if src
    ]

    # Tunggu hydrasi tombol aksi (bounded) agar count terbaca & sesuai.
    await _wait_action_counts_hydrated(page, min(timeout_ms, 5000))

    posted_at = await _first_attr_any(page, (selectors.DETAIL_TIME,), "datetime")

    content_spans: List[str] = await _evaluate_all_any(
        page, selectors.DETAIL_CONTENT_SPANS_ALL, _JS_TEXT_ALL
    )
    content = extract_content_from_spans(content_spans, username)

    all_spans: List[str] = await _evaluate_all_any(
        page, (selectors.DETAIL_VIEWS_SPAN,), _JS_TEXT_ALL
    )
    views_count = extract_views(all_spans)

    buttons: List[str] = await _evaluate_all_any(
        page, selectors.DETAIL_ACTION_BUTTONS_ALL, _JS_TEXT_ALL
    )
    counts = extract_action_counts(buttons)

    profile_picture_url = await _first_attr_any(
        page,
        [
            sel.format(username=username)
            for sel in selectors.DETAIL_PROFILE_PIC_ALT_ALL
        ],
        "src",
    )

    og_title = await _first_attr_any(
        page, (selectors.META_OG_TITLE,), "content"
    )
    og_image = await _first_attr_any(
        page, (selectors.META_OG_IMAGE,), "content"
    )
    full_name = display_name_from_og_title(og_title)

    edited_count = 0
    for selector in selectors.DETAIL_EDITED_BUTTON_ALL:
        try:
            edited_count += await page.locator(selector).count()
        except Exception:
            continue
    is_edited = edited_count > 0

    if video_srcs:
        post_type = "video"
        media_urls = video_srcs
    elif media_images:
        post_type = "image"
        media_urls = media_images
    elif video_cover:
        # Cover video tanpa <video> ter-mount: tetap video, media_urls
        # dikosongkan (src video tidak tersedia - jangan mengarang).
        post_type = "video"
        media_urls = []
    else:
        post_type = "text"
        media_urls = []

    metadata = {
        "keyword_source": keyword,
        "reposts_count": counts.get("reposts_count"),
        "is_edited": is_edited,
        "og_image": og_image,
    }

    data = {
        "platform_post_id": post_id,
        "post_type": post_type,
        "content": content,
        "media_urls": media_urls,
        "post_url": url.split("?")[0],
        "username": username,
        "full_name": full_name,
        "profile_picture_url": profile_picture_url,
        "likes_count": counts.get("likes_count"),
        "comments_count": counts.get("comments_count"),
        "shares_count": counts.get("shares_count"),
        "reposts_count": counts.get("reposts_count"),
        "views_count": views_count,
        "posted_at": posted_at,
        "metadata": metadata,
    }
    logger.debug(
        f"[Threads] Parsed {post_id} (@{username}) type={post_type} "
        f"likes={data['likes_count']} posted_at={posted_at}"
    )
    return data