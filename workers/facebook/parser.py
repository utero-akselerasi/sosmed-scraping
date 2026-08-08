"""
Parser DOM postingan Facebook.

DOM Facebook sangat volatil (selector berubah dari waktu ke waktu), jadi
setiap field diekstrak dengan beberapa strategi fallback berlapis.
Parser bekerja pada satu elemen artikel Playwright (Locator) dan
mengembalikan RawPost.

Catatan kualitas data:
- Text: strategi utama `[data-ad-preview="message"]`, fallback `div[dir="auto"]`
  dengan filter noise (tombol aksi, counter, komentar, header).
- Timestamp: prefer `time[datetime]` / `abbr[data-utime]` (presisi tinggi,
  timezone-safe), lalu parse label relatif (EN/ID).
- Postingan bersponsor ("Sponsored"/"Bersponsor") DILEWATI - bukan konten
  halaman yang ditarget.
- Postingan tanpa URL (tidak bisa didedupe) DILEWATI.
"""

from __future__ import annotations

import hashlib
import re
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from urllib.parse import parse_qs, urlparse

from .models import RawPost

# Selector teks pesan, diurutkan dari yang paling spesifik
TEXT_SELECTORS = [
    '[data-ad-preview="message"]',
    'div[dir="auto"]',
]

# Teks aksi/noise yang harus dibuang saat fallback div[dir="auto"]
ACTION_NOISE = {
    "like", "comment", "share", "suka", "komentar", "bagikan",
    "see more", "lihat selengkapnya", "see translation", "lihat terjemahan",
    "translate", "terjemahkan", "react", "reaksi", "send", "kirim",
    "like and reply", "suka dan balas", "most relevant", "paling relevan",
}

MONTHS_EN = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11,
    "december": 12,
}
MONTHS_ID = {
    "januari": 1, "februari": 2, "maret": 3, "april": 4, "mei": 5, "juni": 6,
    "juli": 7, "agustus": 8, "september": 9, "oktober": 10, "november": 11,
    "desember": 12,
}

COUNT_RE = re.compile(r"([\d.,]+)\s*([KMRBJTkmrbjt]{0,2})")
COMMENT_RE = re.compile(
    r"^([\d.,]+)\s*(?:comments?|komentar)$", re.IGNORECASE
)
SHARE_RE = re.compile(
    r"^([\d.,]+)\s*(?:shares?|bagikan)$", re.IGNORECASE
)
SPONSORED_WORDS = ("sponsored", "bersponsor")


def _clean_text(raw: Optional[str]) -> str:
    """Bersihkan whitespace berlebih dari teks."""
    if not raw:
        return ""
    return re.sub(r"[ \t]+", " ", raw).replace("\u200b", "").strip()


def parse_count(raw: Optional[str]) -> int:
    """Parse angka yang bisa memuat akhiran K/RB/JT/M/B.

    - "2.1K" -> 2100, "1,5RB" -> 1500 (format Indonesia: RB=ribu, JT=juta)
    - "1.234" (tanpa akhiran) -> 1234 (pemisah ribuan)
    """
    if not raw:
        return 0
    match = COUNT_RE.search(raw.strip())
    if not match:
        return 0
    number_str, suffix = match.group(1), match.group(2).upper()

    # Tentukan pemisah desimal: akhiran menandakan angka desimal
    if suffix:
        if "," in number_str and "." in number_str:
            # "1.234,5RB" -> titik = ribuan, koma = desimal
            number_str = number_str.replace(".", "").replace(",", ".")
        elif "," in number_str:
            number_str = number_str.replace(",", ".")
        elif "." in number_str:
            # "2.1K" -> 2.1 (desimal 1-2 digit); "1.234K" (titik = ribuan)
            parts = number_str.split(".")
            if len(parts) == 2 and len(parts[1]) <= 2:
                number_str = parts[0] + "." + parts[1]
            else:
                number_str = number_str.replace(".", "")
        value = float(number_str or 0)
        if suffix.startswith(("RB", "K")):
            value *= 1_000
        elif suffix.startswith(("JT", "M")):
            value *= 1_000_000
        elif suffix.startswith(("B", "MI")):
            value *= 1_000_000_000
        return int(value)
    return int(number_str.replace(".", "").replace(",", "") or 0)


def _parse_time_part(raw: str) -> Optional[Tuple[int, int]]:
    """Parse bagian jam dari label ("at 10:30 AM", "pukul 20.00")."""
    m = re.search(
        r"(?:at|pukul|jam)\s+(\d{1,2})(?:[:.](\d{2}))?\s*"
        r"(am|pm|wib|pagi|siang|sore|malam)?",
        raw.lower(),
    )
    if not m:
        return None
    hour, minute = int(m.group(1)), int(m.group(2) or 0)
    suffix = m.group(3)
    if suffix == "pm" and hour < 12:
        hour += 12
    elif suffix == "am" and hour == 12:
        hour = 0
    elif not suffix and hour > 23:
        return None
    return hour, minute


def parse_timestamp(raw: Optional[str], now: Optional[datetime] = None) -> Optional[datetime]:
    """Parse label waktu Facebook (EN/ID) menjadi datetime naif lokal.

    Urutan strategi:
    1. ISO 8601 (time[datetime]) - timezone-aware langsung dipakai.
    2. Epoch detik (abbr[data-utime]).
    3. Label bulan penuh: "August 5 at 10:30 AM" / "5 Agustus 2026 pukul 10.30"
    4. Relatif: "2 hrs ago", "3 jam yang lalu", "Yesterday", "Kemarin",
       "Just now", "Baru saja".
    """
    if not raw:
        return None
    raw = raw.strip()
    now = now or datetime.now()

    # 1. ISO 8601
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if dt.tzinfo is not None:
            return dt.astimezone().replace(tzinfo=None)
        return dt
    except ValueError:
        pass

    # 2. Epoch detik
    if raw.isdigit():
        try:
            return datetime.fromtimestamp(int(raw))
        except (OSError, ValueError, OverflowError):
            pass

    lower = raw.lower()

    # 4. Relatif - EN (detik/menit/jam/hari/minggu + singkatan hrs/min/d/w)
    m = re.search(
        r"(\d+)\s*(seconds?|minutes?|mins?|hours?|hrs?|days?|d\b|weeks?|w\b)",
        lower,
    )
    if m:
        unit = m.group(2).lower()
        units = {
            "second": 1, "seconds": 1,
            "min": 60, "mins": 60, "minute": 60, "minutes": 60,
            "hr": 3600, "hrs": 3600, "hour": 3600, "hours": 3600,
            "day": 86400, "days": 86400, "d": 86400,
            "week": 604800, "weeks": 604800, "w": 604800,
        }
        return now - timedelta(seconds=int(m.group(1)) * units[unit])

    # Relatif - bahasa Indonesia (detik/menit/jam/hari/minggu/bulan/tahun)
    id_units = {
        "detik": 1, "menit": 60, "jam": 3600, "hari": 86400,
        "minggu": 604800, "bulan": 2_629_800, "tahun": 31_557_600,
    }
    m = re.search(r"(\d+)\s*(detik|menit|jam|hari|minggu|bulan|tahun)", lower)
    if m:
        return now - timedelta(seconds=int(m.group(1)) * id_units[m.group(2)])

    # "Just now" / "Baru saja"
    if "just now" in lower or "baru saja" in lower:
        return now

    # "Yesterday at 8:00 PM" / "Kemarin pukul 20.00"
    if "yesterday" in lower or "kemarin" in lower:
        base = now - timedelta(days=1)
        t = _parse_time_part(raw)
        if t:
            return base.replace(hour=t[0], minute=t[1], second=0, microsecond=0)
        return base

    # 3. Bulan penuh - EN: "August 5 at 10:30 AM" / "August 5, 2026 at ..."
    m = re.search(
        r"(january|february|march|april|may|june|july|august|september|"
        r"october|november|december)\s+(\d{1,2})(?:,?\s+(\d{4}))?",
        lower,
    )
    if m:
        month = MONTHS_EN[m.group(1)]
        day = int(m.group(2))
        year = int(m.group(3)) if m.group(3) else now.year
        t = _parse_time_part(raw)
        dt = (
            datetime(year, month, day, t[0], t[1])
            if t else datetime(year, month, day)
        )
        # Tahun tidak tercantum: jika hasil di masa depan, mundurkan 1 tahun
        if dt > now + timedelta(days=1):
            dt = dt.replace(year=year - 1)
        return dt

    # Bulan penuh - ID: "5 Agustus 2026 pukul 10.30"
    m = re.search(
        r"(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|"
        r"september|oktober|november|desember)(?:,?\s+(\d{4}))?",
        lower,
    )
    if m:
        day = int(m.group(1))
        month = MONTHS_ID[m.group(2)]
        year = int(m.group(3)) if m.group(3) else now.year
        t = _parse_time_part(raw)
        dt = (
            datetime(year, month, day, t[0], t[1])
            if t else datetime(year, month, day)
        )
        if dt > now + timedelta(days=1):
            dt = dt.replace(year=year - 1)
        return dt

    return None


def extract_hashtags(text: str) -> List[str]:
    """Ekstrak hashtag dari teks (regex sama dengan Instagram worker)."""
    if not text:
        return []
    return [f"#{tag.lower()}" for tag in re.findall(r"#(\w+)", text)]


def extract_mentions(text: str) -> List[str]:
    """Ekstrak mentions dari teks (regex sama dengan Instagram worker)."""
    if not text:
        return []
    return [f"@{mention}" for mention in re.findall(r"@(\w+)", text)]


class FacebookPostParser:
    """Parser satu elemen artikel postingan Facebook (Playwright Locator)."""

    async def parse_article(self, article, page_username: str, page_name: str):
        """Parse satu artikel menjadi RawPost; None jika tidak valid."""
        url, post_id = await self._extract_url_and_id(article, page_username)
        if not url:
            return None

        text = await self._extract_text(article)
        timestamp = await self._extract_timestamp(article)
        likes = await self._extract_reactions(article)
        comments = await self._extract_count_by_regex(article, COMMENT_RE)
        shares = await self._extract_count_by_regex(article, SHARE_RE)
        images = await self._extract_images(article)
        videos = await self._extract_videos(article)
        links = await self._extract_links(article)

        author = (await self._extract_author(article)) or page_name or page_username

        if not post_id:
            post_id = hashlib.sha1(url.encode("utf-8")).hexdigest()

        return RawPost(
            url=url,
            post_id=post_id,
            author=author,
            text=text,
            posted_at=timestamp,
            likes=likes,
            comments=comments,
            shares=shares,
            images=images,
            videos=videos,
            links=links,
            page_username=page_username,
            page_name=page_name,
        )

    async def is_sponsored(self, article) -> bool:
        """True jika artikel adalah postingan bersponsor/iklan (dilewati)."""
        try:
            if await article.locator(
                '[aria-label="Sponsored"], [aria-label="Bersponsor"]'
            ).count() > 0:
                return True
        except Exception:
            pass
        try:
            text = (await article.text_content()) or ""
            return any(w in text.lower() for w in SPONSORED_WORDS)
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Field extraction
    # ------------------------------------------------------------------

    async def _extract_url_and_id(self, article, page_username: str) -> Tuple[str, str]:
        """Cari URL permalink dan ID postingan dari link di dalam artikel."""
        hrefs: List[str] = []
        for selector in (
            'a[href*="/posts/"]',
            'a[href*="story_fbid="]',
            'a[href*="permalink"]',
            'a[href*="photo.php"]',
            'a[href*="/photo/"]',
            'a[href*="fbid="]',
        ):
            try:
                for el in await article.locator(selector).all():
                    href = await el.get_attribute("href")
                    if href:
                        hrefs.append(href)
            except Exception:
                continue

        for href in hrefs:
            if "facebook.com" not in href and href.startswith("/"):
                href = "https://www.facebook.com" + href
            elif not href.startswith("http"):
                continue

            if "/posts/" in href:
                # https://www.facebook.com/Page/posts/123456789
                match = re.search(r"/posts/([0-9A-Za-z]+)", href)
                if match:
                    post_id = match.group(1)
                    return href.split("?")[0], post_id

            if "story_fbid" in href:
                parsed = urlparse(href)
                params = parse_qs(parsed.query)
                if params.get("story_fbid"):
                    post_id = params["story_fbid"][0]
                    return href.split("?")[0], post_id

            if "/permalink/" in href:
                match = re.search(r"/permalink/([0-9A-Za-z]+)", href)
                if match:
                    post_id = match.group(1)
                    return href.split("?")[0], post_id

            if "photo.php" in href or "/photo/" in href or "fbid=" in href:
                # Layout baru: /photo/?fbid=X&set=pcb.Y - set=pcb.<post_id>
                # Layout lama: /photo.php?fbid=X&set=a.123&type=3
                params = parse_qs(urlparse(href).query)
                set_param = params.get("set")
                if set_param:
                    for s in set_param:
                        if s.startswith("pcb."):
                            post_id = s.split(".", 1)[1]
                            if post_id:
                                return self._canonical_post_url(post_id, page_username), post_id
                fbid = params.get("fbid") or params.get("photo_id")
                if fbid:
                    # Pertahankan query (fbid=...) agar URL benar-benar valid
                    base = href.split("?")[0]
                    return f"{base}?fbid={fbid[0]}", fbid[0]

        # Fallback: URL foto/album halaman - bisa jadi post link
        for href in hrefs:
            if "/photos/" in href or "/photo/" in href:
                return href.split("?")[0], ""
        return "", ""

    @staticmethod
    def _canonical_post_url(post_id: str, page_username: str) -> str:
        """URL permalink kanonik: https://www.facebook.com/{page}/posts/{id}"""
        username = page_username.strip().lstrip("@")
        return f"https://www.facebook.com/{username}/posts/{post_id}"

    async def _extract_text(self, article) -> str:
        """Teks pesan: [data-ad-preview="message"] lalu fallback dir=auto."""
        try:
            msg = article.locator('[data-ad-preview="message"]').first
            if await msg.count() > 0:
                return _clean_text(await msg.text_content())
        except Exception:
            pass

        try:
            blocks = await article.locator('div[dir="auto"]').all_text_contents()
        except Exception:
            return ""

        meaningful: List[str] = []
        for block in blocks:
            text = _clean_text(block)
            if not text or len(text) < 2:
                continue
            if text.lower() in ACTION_NOISE:
                continue
            if COUNT_RE.fullmatch(text):
                continue
            meaningful.append(text)

        # Buang blok yang hanya angka (reaction counters) - urutkan dari yang
        # terpanjang: blok pesan biasanya yang terbesar di artikel.
        meaningful.sort(key=len, reverse=True)
        text = "\n".join(meaningful)
        return text.strip()

    async def _extract_timestamp(self, article) -> Optional[datetime]:
        """Waktu posting: time[datetime], abbr[data-utime], lalu label relatif."""
        try:
            time_el = article.locator('time[datetime]').first
            if await time_el.count() > 0:
                dt_raw = await time_el.get_attribute("datetime")
                if dt_raw:
                    parsed = parse_timestamp(dt_raw)
                    if parsed:
                        return parsed
        except Exception:
            pass

        try:
            abbr_el = article.locator('abbr[data-utime]').first
            if await abbr_el.count() > 0:
                utime = await abbr_el.get_attribute("data-utime")
                if utime and utime.isdigit():
                    parsed = parse_timestamp(utime)
                    if parsed:
                        return parsed
        except Exception:
            pass

        # Label relatif pada link timestamp
        try:
            for selector in (
                'a[href*="/posts/"]',
                'a[href*="story_fbid="]',
                'a[href*="permalink"]',
                'a[href*="/watch/"]',
            ):
                link = article.locator(selector).first
                if await link.count() == 0:
                    continue
                label = await link.get_attribute("aria-label")
                if label:
                    parsed = parse_timestamp(label)
                    if parsed:
                        return parsed
                time_text = await link.locator("time, span[dir='auto']").first.text_content()
                if time_text:
                    parsed = parse_timestamp(time_text)
                    if parsed:
                        return parsed
        except Exception:
            pass

        return None

    async def _extract_author(self, article) -> str:
        try:
            h2 = article.locator("h2").first
            if await h2.count() > 0:
                return _clean_text(await h2.text_content())
        except Exception:
            pass
        return ""

    async def _extract_reactions(self, article) -> int:
        """Jumlah reaksi dari pill ringkasan (aria-label mengandung 'reaction')."""
        for selector in (
            'div[aria-label*="reaction" i]',
            'span[aria-label*="reaction" i]',
            'div[aria-label*="reaksi" i]',
        ):
            try:
                el = article.locator(selector).first
                if await el.count() == 0:
                    continue
                label = await el.get_attribute("aria-label")
                count = parse_count(label) if label else 0
                if count > 0:
                    return count
                count = parse_count(await el.text_content())
                if count > 0:
                    return count
            except Exception:
                continue
        return 0

    async def _extract_count_by_regex(self, article, pattern) -> int:
        """Cari angka di elemen yang teksnya cocok ("12 comments", "5 bagikan")."""
        try:
            texts = await article.locator("span, div").all_text_contents()
        except Exception:
            return 0
        for text in texts:
            text = _clean_text(text)
            match = pattern.match(text)
            if match:
                count = parse_count(match.group(1))
                if count > 0:
                    return count
        return 0

    async def _extract_images(self, article) -> List[str]:
        """URL gambar postingan (bukan avatar/emoji/ikon)."""
        images: List[str] = []
        seen: set = set()
        try:
            imgs = await article.locator("img[referrerpolicy]").all()
            for img in imgs:
                src = await img.get_attribute("src")
                if not src or src.startswith("data:"):
                    continue
                if "static.xx.fbcdn.net" in src and "rsrc.php" in src:
                    continue  # emoji/ikon UI
                alt = (await img.get_attribute("alt")) or ""
                if "profile picture" in alt.lower() or "foto profil" in alt.lower():
                    continue
                if src not in seen:
                    seen.add(src)
                    images.append(src)
        except Exception:
            pass
        return images

    async def _extract_videos(self, article) -> List[str]:
        videos: List[str] = []
        seen: set = set()

        def add(url: str) -> None:
            if url and url not in seen and url.startswith("http"):
                seen.add(url)
                videos.append(url)

        try:
            for video in await article.locator("video").all():
                src = await video.get_attribute("src")
                if src:
                    add(src)
                    continue
                source = video.locator("source").first
                if await source.count() > 0:
                    add(await source.get_attribute("src"))
        except Exception:
            pass

        try:
            for vid_el in await article.locator("[data-video-id]").all():
                vid = await vid_el.get_attribute("data-video-id")
                if vid:
                    add(f"https://www.facebook.com/watch/?v={vid}")
        except Exception:
            pass

        try:
            for link in await article.locator('a[href*="/watch/"]').all():
                href = await link.get_attribute("href")
                if href and href.startswith("/"):
                    href = "https://www.facebook.com" + href
                add(href or "")
        except Exception:
            pass
        return videos

    async def _extract_links(self, article) -> List[str]:
        """Link eksternal (domain selain facebook.com)."""
        links: List[str] = []
        seen: set = set()
        try:
            for link in await article.locator("a").all():
                href = await link.get_attribute("href")
                if not href or not href.startswith("http"):
                    continue
                host = urlparse(href).netloc
                if "facebook.com" in host or "fb.com" in host:
                    continue
                if href not in seen:
                    seen.add(href)
                    links.append(href)
        except Exception:
            pass
        return links
