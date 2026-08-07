"""
Website Scraper - Real Implementation (RSS News Feeds + Bing News + Google News)
Festival Mbois Intelligence Platform

Mengambil artikel/berita ASLI dari:
1. RSS feed situs berita Indonesia (nasional + Jawa Timur + Malang)
2. Bing News RSS search per query
3. Google News RSS search per query (link interstitial di-resolve ke URL
   artikel asli lewat headless Chromium/Playwright)

Semua kandidat dipadukan dengan dedupe berbasis URL asli (canonical),
difilter berdasarkan keyword aktif dari tabel keywords (is_active = true),
lalu disimpan ke tabel posts menggunakan flow yang sudah ada.

Alur:
1. Ambil keyword aktif dari database.
2. Fetch RSS feed situs berita (daftar default atau WEBSITE_RSS_FEEDS).
3. Bangun daftar query unik (keyword ternormalisasi + query kanonik event).
4. Per query: Bing News RSS search (count=50) + Google News RSS search.
5. Resolve link interstitial Google News ke URL artikel asli (Playwright).
6. Merge + dedupe canonical URL + pre-filter keyword (judul/deskripsi),
   lewati artikel yang lebih tua dari WEBSITE_MAX_AGE_DAYS.
7. Per keyword: fetch halaman artikel asli, ekstrak judul + isi,
   verifikasi relevansi ulang pada konten asli, lalu simpan.
8. Simpan ke tabel posts:
   - create_scraping_job() / update_scraping_job()
   - insert_post() dengan dedupe ON CONFLICT DO NOTHING
   - platform_post_id = SHA1(url) (stabil antar run)

TIDAK ada dummy data, TIDAK ada example.com, TIDAK ada sample article.
Semua artikel yang disimpan adalah berita nyata yang memuat keyword aktif.
"""

import os
import asyncio
import hashlib
import re
import socket
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple
from urllib.parse import urlparse, unquote

import aiohttp
from bs4 import BeautifulSoup
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

# Import shared utilities
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.database import DatabaseManager
from shared.sentiment import sentiment_analyzer
from shared.worker_lock import WorkerLock

# Daftar default RSS feed situs berita Indonesia (nasional + Jatim + Malang)
DEFAULT_RSS_FEEDS = [
    'https://www.tribunnews.com/rss',
    'https://suryamalang.tribunnews.com/rss',
    'https://jatim.tribunnews.com/rss',
    'https://www.cnnindonesia.com/rss',
    'https://www.antaranews.com/rss/terkini',
    'https://www.republika.co.id/rss',
    'https://beritajatim.com/feed',
    'https://satukanal.com/feed',
    'https://malangvoice.com/feed',
    'https://bacamalang.com/feed',
    'https://kanal24.co.id/feed',
    'https://www.tugumalang.id/feed',
    'https://www.memontum.com/feed',
    'https://sabdanews.com/feed',
]

# Bing News RSS search (sumber utama pencarian artikel per keyword)
BING_NEWS_RSS_URL = "https://www.bing.com/news/search"

# Google News RSS search (sumber pencarian dengan cakupan media lokal
# Malang yang jauh lebih luas daripada Bing News RSS)
GOOGLE_NEWS_RSS_URL = "https://news.google.com/rss/search"

# All search queries now come from the database keywords table.
# No hardcoded queries - the Keywords page is the single source of truth.

# Error jaringan yang bersifat SEMENTARA - layak di-retry dengan backoff:
# DNS/getaddrinfo, timeout, connection reset/aborted, payload terputus,
# dll. HTTP 4xx (404/403) dan URL invalid TIDAK termasuk - langsung reject.
RETRYABLE_DOWNLOAD_ERRORS = (
    aiohttp.ClientConnectionError,
    aiohttp.ClientPayloadError,
    aiohttp.ServerTimeoutError,
    asyncio.TimeoutError,
    TimeoutError,
    socket.gaierror,
    ConnectionResetError,
    ConnectionAbortedError,
    ConnectionError,
)

# Selector konten artikel, diurutkan dari yang paling umum
CONTENT_SELECTORS = [
    'article',
    '.article-content',
    '.post-content',
    '.entry-content',
    '.content-detail',
    '.detail-content',
    '.read-content',
    '.txt-article',
    '.detail-text',
    '.wrap__article-detail-content',
    '#content',
    'main',
]


class PipelineAudit:
    """Audit pipeline: mencatat angka di SETIAP tahap + alasan penolakan
    setiap artikel. Murni observasi - TIDAK mengubah alur pipeline.

    Setiap artikel yang ditolak dicatat via reject() dengan alasan spesifik.
    Artikel yang dilanjutkan tapi punya anomali (mis. content kosong)
    dicatat via flag(). Di akhir run, report() mencetak tabel lengkap
    per tahap + bottleneck terbesar.
    """

    def __init__(self):
        self.counters: Dict[str, int] = {}
        self.rejections: Dict[str, int] = {}
        self.flags: Dict[str, int] = {}
        self.samples: Dict[str, List[Dict[str, str]]] = {}

    def inc(self, key: str, n: int = 1) -> None:
        self.counters[key] = self.counters.get(key, 0) + n

    def _record(
        self,
        bucket: Dict[str, int],
        reason: str,
        title: str = '',
        url: str = '',
        detail: str = '',
    ) -> None:
        bucket[reason] = bucket.get(reason, 0) + 1
        samples = self.samples.setdefault(reason, [])
        if len(samples) < 10:
            samples.append({
                'title': (title or '')[:90],
                'url': (url or '')[:140],
                'detail': (detail or '')[:180],
            })

    def reject(self, reason: str, title: str = '', url: str = '', detail: str = '') -> None:
        """Artikel DIBUANG di tahap ini - log satu baris per artikel."""
        self._record(self.rejections, reason, title, url, detail)
        logger.info(
            f"[AUDIT][REJECT] reason={reason} | title={title[:80]!r} | "
            f"url={url[:120]!r} | detail={detail}"
        )

    def flag(self, reason: str, title: str = '', url: str = '', detail: str = '') -> None:
        """Artikel DILANJUTKAN tapi ada anomali (mis. content kosong)."""
        self._record(self.flags, reason, title, url, detail)
        logger.info(
            f"[AUDIT][FLAG] reason={reason} | title={title[:80]!r} | "
            f"url={url[:120]!r} | detail={detail}"
        )

    def report(self) -> None:
        """Cetak laporan angka per tahap pipeline + bottleneck terbesar."""
        g = self.counters.get
        resolve_attempt = g('resolve_attempt', 0)
        resolve_success = g('resolve_success', 0)
        resolve_fail = resolve_attempt - resolve_success
        download_attempt = g('download_attempt', 0)
        download_ok = g('download_ok', 0)
        download_fail = download_attempt - download_ok

        L: List[str] = []
        L.append("=" * 72)
        L.append("AUDIT PIPELINE WEBSITE SCRAPER - angka dari run ini")
        L.append("=" * 72)

        rows = [
            ("[1] SUMBER KANDIDAT", ''),
            ("    Total kandidat unik (semua sumber)", g('candidates_total', 0)),
            ("      - dari RSS feed situs berita", g('cand_feed', 0)),
            ("      - dari Bing News RSS", g('cand_bing', 0)),
            ("      - dari Google News (setelah resolve)", g('cand_google', 0)),
            ("", 0),
            ("[2] GOOGLE NEWS RSS", ''),
            ("    Artikel mentah dari Google News RSS", g('google_raw', 0)),
            ("    Lolos pre-filter keyword (judul/deskripsi RSS)", g('google_prefilter_pass', 0)),
            ("    Ditolak pre-filter keyword", g('google_prefilter_reject', 0)),
            ("    Duplikat judul lintas query", g('google_title_dup', 0)),
            ("", 0),
            ("[3] RESOLVE URL GOOGLE NEWS (Playwright)", ''),
            ("    Link interstitial dicoba resolve", resolve_attempt),
            ("    Berhasil resolve ke URL asli", resolve_success),
            ("    Gagal resolve / timeout", resolve_fail),
            ("", 0),
            ("[4] DOWNLOAD HTML ARTIKEL", ''),
            ("    Percobaan download (termasuk retry)", download_attempt),
            ("    Retry karena error jaringan sementara", g('download_retry', 0)),
            ("    Download sukses (HTTP 200)", download_ok),
            ("    Download gagal (HTTP error / network)", download_fail),
            ("", 0),
            ("[5] EXTRACT CONTENT", ''),
            ("    Artikel masuk tahap extract", g('extract_total', 0)),
            ("    Extract sukses (content terisi)", g('extract_ok', 0)),
            ("    Content kosong (halaman JS/anti-bot?)", g('content_empty', 0)),
            ("    Content < 200 karakter (ditolak)", g('content_short', 0)),
            ("    Title kosong (setelah fallback ke RSS)", g('title_empty', 0)),
            ("", 0),
            ("[6] KEYWORD MATCHING + FILTER", ''),
            ("    Lolos keyword matching (konten asli)", g('keyword_pass', 0)),
            ("    Gagal keyword matching", g('keyword_not_found', 0)),
            ("    Ditolak - tanggal terlalu lama", g('too_old', 0)),
            ("    Ditolak - duplicate dalam run ini", g('dedupe_in_run', 0)),
            ("    Tersisa tak diproses (quota max/keyword)", g('quota_skip', 0)),
            ("", 0),
            ("[7] INSERT DATABASE", ''),
            ("    Percobaan insert", g('db_insert_attempt', 0)),
            ("    SAVED ke tabel posts", g('db_saved', 0)),
            ("    Duplicate (sudah ada di DB)", g('db_duplicate', 0)),
            ("    Error saat insert", g('db_error', 0)),
        ]
        for label, value in rows:
            if label == '':
                L.append('')
            elif value == '':
                L.append(label)
            else:
                L.append(f"{label:<55}{value:>7}")

        L.append("")
        L.append("-" * 72)
        L.append("ALASAN PENOLAKAN / ANOMALI PER ARTIKEL (log [AUDIT]):")
        L.append("-" * 72)
        if not self.rejections and not self.flags:
            L.append("  (tidak ada penolakan di tahap mana pun)")
        for reason, count in sorted(self.rejections.items(), key=lambda x: -x[1]):
            L.append(f"  [REJECT] {reason:<32} {count:>5}")
            for s in self.samples.get(reason, [])[:3]:
                L.append(f"      contoh: {s['title'] or s['url']}")
                if s['detail']:
                    L.append(f"      detail: {s['detail']}")
        for reason, count in sorted(self.flags.items(), key=lambda x: -x[1]):
            L.append(f"  [FLAG]   {reason:<32} {count:>5}  (artikel tetap dilanjutkan)")
            for s in self.samples.get(reason, [])[:3]:
                L.append(f"      contoh: {s['title'] or s['url']}")

        drops = {
            'Google News: ditolak pre-filter keyword': g('google_prefilter_reject', 0),
            'Google News: resolve URL gagal': resolve_fail,
            'Download HTML gagal': download_fail,
            'Content/title kosong saat extract': g('content_empty', 0) + g('title_empty', 0),
            'Content < 200 karakter saat extract': g('content_short', 0),
            'Keyword tidak ditemukan di konten asli': g('keyword_not_found', 0),
            'Duplicate di database': g('db_duplicate', 0),
            'Error saat insert database': g('db_error', 0),
        }
        L.append("")
        L.append("-" * 72)
        L.append("BOTTLENECK TERBESAR (tahap kehilangan artikel tertinggi):")
        L.append("-" * 72)
        ranked = sorted(drops.items(), key=lambda x: -x[1])
        shown = 0
        for label, count in ranked:
            if count == 0:
                continue
            L.append(f"  {label:<52} {count:>5} artikel hilang")
            shown += 1
        if shown == 0:
            L.append("  (tidak ada kehilangan artikel di tahap mana pun)")

        L.append("=" * 72)
        for line in L:
            logger.info(line)


class WebsiteScraper:
    """Website scraper worker - real news scraping for Festival Mbois"""

    def __init__(self):
        self.db = DatabaseManager()
        self.platform_id: Optional[str] = None
        self.keywords: List[str] = []
        self.session: Optional[aiohttp.ClientSession] = None
        self.browser = None
        self.playwright = None

        # Configuration
        self.max_articles_per_keyword = int(os.getenv('WEBSITE_MAX_ARTICLES_PER_KEYWORD', 10))
        self.max_age_days = int(os.getenv('WEBSITE_MAX_AGE_DAYS', 30))
        self.request_timeout = int(os.getenv('WEBSITE_TIMEOUT_SECONDS', 20))
        self.fetch_delay = float(os.getenv('WEBSITE_FETCH_DELAY_SECONDS', 1.5))
        self.google_news_enabled = os.getenv('WEBSITE_GOOGLE_NEWS_ENABLED', 'true').lower() == 'true'
        self.use_playwright = os.getenv('WEBSITE_USE_PLAYWRIGHT', 'true').lower() == 'true'
        self.playwright_timeout = int(os.getenv('WEBSITE_PLAYWRIGHT_TIMEOUT_MS', 20000))
        self.bing_max_results = int(os.getenv('WEBSITE_BING_MAX_RESULTS', 50))
        self.google_max_per_query = int(os.getenv('WEBSITE_GOOGLE_NEWS_MAX_PER_QUERY', 15))
        self.google_resolve_concurrency = int(os.getenv('WEBSITE_GOOGLE_RESOLVE_CONCURRENCY', 4))
        # Retry download untuk error jaringan sementara (max 2 retry,
        # exponential backoff: 2s, 4s). Tidak retry HTTP 4xx / URL invalid.
        self.download_retries = int(os.getenv('WEBSITE_DOWNLOAD_RETRIES', 2))
        self.retry_base_delay = float(os.getenv('WEBSITE_RETRY_BASE_DELAY_SECONDS', 2.0))
        # Filter waktu query Google News RSS (when:30d -> artikel lebih fresh).
        # Kosongkan env untuk menonaktifkan filter.
        _time_filter = os.getenv('WEBSITE_GOOGLE_NEWS_TIME_FILTER', '30d').strip()
        if _time_filter.lower().startswith('when:'):
            _time_filter = _time_filter[5:]
        self.google_news_time_filter = _time_filter

        # State global dalam satu run (dedupe lintas keyword)
        self._seen_canonical: set = set()
        self._processed_urls: set = set()

        # Audit pipeline: angka per tahap + alasan penolakan per artikel
        self.audit = PipelineAudit()

        # RSS feeds: WEBSITE_RSS_FEEDS (env) atau daftar default
        env_feeds = [
            f.strip()
            for f in os.getenv('WEBSITE_RSS_FEEDS', '').split(',')
            if f.strip()
        ]
        self.rss_feeds = env_feeds or DEFAULT_RSS_FEEDS

        self.headers = {
            'User-Agent': (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
            ),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
        }

    async def initialize(self):
        """Initialize worker"""
        logger.info("Initializing Website scraper...")

        await self.db.connect()

        platform = await self.db.get_platform_by_type('website')
        if not platform:
            raise Exception("Website platform not found in database")
        self.platform_id = platform['id']

        self.keywords = await self.db.get_active_keywords()
        logger.info(f"Loaded {len(self.keywords)} keywords: {self.keywords}")

        self.session = aiohttp.ClientSession(
            headers=self.headers,
            timeout=aiohttp.ClientTimeout(total=self.request_timeout),
        )

        if self.google_news_enabled and self.use_playwright:
            try:
                from playwright.async_api import async_playwright
                self.playwright = await async_playwright().start()
                self.browser = await self.playwright.chromium.launch(
                    headless=True,
                    args=['--no-sandbox'],
                )
                logger.info("Playwright Chromium launched (Google News resolver siap)")
            except Exception as e:
                logger.warning(
                    f"Playwright tidak tersedia ({e}) - Google News RSS dilewati, "
                    f"lanjut pakai Bing News RSS + RSS feed"
                )
                self.browser = None
                self.playwright = None
                self.google_news_enabled = False

        logger.info(f"RSS feeds ({len(self.rss_feeds)}): {self.rss_feeds}")
        logger.info("Website scraper initialized successfully")

    async def close(self):
        """Close connections"""
        if self.browser:
            try:
                await self.browser.close()
            except Exception:
                pass
            self.browser = None
        if self.playwright:
            try:
                await self.playwright.stop()
            except Exception:
                pass
            self.playwright = None
        if self.session:
            await self.session.close()
        await self.db.close()
        logger.info("Website scraper closed")

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _keyword_keys(self, keyword: str) -> List[str]:
        """Bentuk-bentuk keyword untuk pencocokan (tahan terhadap # dan spasi)."""
        lowered = keyword.lower().strip().lstrip('#')
        keys = [lowered]
        compact = lowered.replace(' ', '')
        if compact != lowered:
            keys.append(compact)
        return keys

    def _matches_keywords(self, text: str) -> bool:
        """Cek apakah teks mengandung salah satu keyword aktif."""
        if not text:
            return False
        text_lower = text.lower()
        for keyword in self.keywords:
            for key in self._keyword_keys(keyword):
                if key and key in text_lower:
                    return True
        return False

    def _normalize_published_at(self, dt: Optional[datetime]) -> datetime:
        """Normalize tanggal publikasi ke rentang partisi posts yang aman.

        posts dipartisi per bulan (schema.sql), jadi tanggal di-klamp ke
        rentang [now - max_age_days, now].
        """
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        if dt is None:
            return now

        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)

        cutoff = now - timedelta(days=self.max_age_days)

        if dt < cutoff:
            return cutoff
        if dt > now:
            return now
        return dt

    def _parse_published_at(self, raw: str) -> Optional[datetime]:
        """Parse pubDate RSS (RFC 2822)."""
        try:
            return parsedate_to_datetime(raw.strip())
        except (TypeError, ValueError):
            logger.warning(f"Tidak bisa parse tanggal artikel: {raw}")
            return None

    def _is_too_old(self, dt: Optional[datetime]) -> bool:
        """Cek apakah artikel lebih tua dari WEBSITE_MAX_AGE_DAYS.

        Artikel terlalu lama dilewati (bing news search bisa mengembalikan
        artikel bertahun-tahun lalu).
        """
        if dt is None:
            return False
        if dt.tzinfo is not None:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        cutoff = (
            datetime.now(timezone.utc).replace(tzinfo=None)
            - timedelta(days=self.max_age_days)
        )
        return dt < cutoff

    def _strip_html(self, text: str) -> str:
        """Hapus tag HTML dari deskripsi RSS."""
        if not text:
            return ''
        return re.sub(r'<[^>]+>', ' ', text).strip()

    def _normalize_keyword(self, keyword: str) -> str:
        """Normalisasi keyword untuk query pencarian (bukan untuk matching).

        Hashtag (#festivalmbois) dan bentuk rapat kata (mboisfestival) tidak
        bisa di-query ke Bing/Google News - keduanya selalu mengembalikan 0.
        Keyword itu tetap dipakai untuk matching relevansi, tapi query
        pencarian memakai bentuk dengan spasi bila memungkinkan.
        """
        lowered = keyword.lower().strip().lstrip('#').strip()
        # Bentuk rapat kata yang jelas gabungan dua kata event
        compact_split = {
            'festivalmbois': 'festival mbois',
            'mboisfestival': 'mbois festival',
            'festivalmbois2026': 'festival mbois 2026',
            'mbois2026': 'mbois 2026',
        }
        return compact_split.get(lowered, lowered)

    def _extract_canonical_url(self, link: str) -> str:
        """Ekstrak URL artikel asli dari link agregator (Bing apiclick).

        Bing News RSS mengembalikan link apiclick dengan parameter `tid`
        acak per query - artikel yang SAMA muncul sebagai link berbeda.
        URL di parameter `url=` adalah identitas artikel yang stabil.
        """
        if 'url=' in link:
            raw = link.split('url=', 1)[1].split('&', 1)[0]
            try:
                decoded = unquote(raw)
                if decoded.startswith('http'):
                    return decoded
            except Exception:
                pass
        return link

    def _build_search_queries(self) -> List[str]:
        """Bangun daftar query pencarian unik.

        Kombinasi: keyword DB yang ternormalisasi (hanya yang berbentuk
        frasa) dari database keywords. Query tanpa spasi dan hashtag murni
        tidak dipakai sebagai query (mengembalikan 0 hasil di mesin
        pencarian), tapi tetap aktif untuk matching relevansi.
        """
        queries = []
        for keyword in self.keywords:
            norm = self._normalize_keyword(keyword)
            if ' ' in norm and norm not in queries:
                queries.append(norm)
        return queries

    # ------------------------------------------------------------------
    # Feed collection
    # ------------------------------------------------------------------

    async def _fetch_feed_items(self, feed_url: str) -> List[Dict[str, Any]]:
        """Fetch dan parse satu RSS feed."""
        try:
            async with self.session.get(feed_url) as response:
                if response.status != 200:
                    logger.error(
                        f"RSS {feed_url} mengembalikan HTTP {response.status}"
                    )
                    return []
                xml_text = await response.text(errors='ignore')
        except Exception as e:
            logger.error(f"Gagal fetch RSS {feed_url}: {e}")
            return []

        items = []
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError as e:
            logger.error(f"Gagal parse XML RSS {feed_url}: {e}")
            return []

        feed_domain = urlparse(feed_url).netloc

        for item in root.iter('item'):
            title = (item.findtext('title') or '').strip()
            link = (item.findtext('link') or '').strip()
            pub_date = (item.findtext('pubDate') or '').strip()
            description = self._strip_html(item.findtext('description') or '')

            if not title or not link:
                continue

            items.append({
                'title': title,
                'link': link,
                'published_at': self._parse_published_at(pub_date),
                'description': description,
                'source': feed_domain,
            })

        logger.info(f"RSS {feed_url}: {len(items)} item")
        return items

    async def _fetch_bing_items(self, keyword: str) -> List[Dict[str, Any]]:
        """Query Bing News RSS search untuk satu keyword.

        Menghasilkan artikel berita nyata yang memuat keyword, dengan link
        langsung ke situs sumber (apiclick.aspx di-follow oleh aiohttp).
        `count` diperbesar agar hasil per query tidak terbatas ~9 item.
        """
        params = {
            'q': keyword,
            'format': 'rss',
            'setlang': 'id',
            'cc': 'ID',
            'count': str(self.bing_max_results),
        }

        try:
            async with self.session.get(
                BING_NEWS_RSS_URL, params=params
            ) as response:
                if response.status != 200:
                    logger.error(
                        f"Bing News RSS untuk '{keyword}' mengembalikan HTTP {response.status}"
                    )
                    return []
                xml_text = await response.text(errors='ignore')
        except Exception as e:
            logger.error(f"Gagal fetch Bing News RSS untuk '{keyword}': {e}")
            return []

        items = []
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError as e:
            logger.error(f"Gagal parse XML Bing News RSS '{keyword}': {e}")
            return []

        for item in root.iter('item'):
            title = (item.findtext('title') or '').strip()
            link = (item.findtext('link') or '').strip()
            pub_date = (item.findtext('pubDate') or '').strip()
            description = self._strip_html(item.findtext('description') or '')

            if not title or not link:
                continue

            canonical = self._extract_canonical_url(link)

            # Ekstrak domain sumber dari parameter url= pada link apiclick
            source = ''
            if 'url=' in link:
                raw = link.split('url=', 1)[1].split('&', 1)[0]
                source = urlparse(unquote(raw)).netloc or source

            items.append({
                'title': title,
                'link': link,
                'canonical': canonical,
                'published_at': self._parse_published_at(pub_date),
                'description': description,
                'source': source,
            })

        logger.info(
            f"Bing News RSS untuk '{keyword}': {len(items)} artikel ditemukan"
        )
        return items

    async def _fetch_google_news_items(self, keyword: str) -> List[Dict[str, Any]]:
        """Query Google News RSS search untuk satu keyword.

        Link item adalah halaman interstitial news.google.com yang
        di-resolve ke URL artikel asli lewat Playwright di tahap berikutnya.
        Query memakai filter waktu when:{self.google_news_time_filter} agar
        hasil lebih fresh (audit: tanpa filter banyak artikel lama).
        """
        query = keyword
        if self.google_news_time_filter:
            query = f"{keyword} when:{self.google_news_time_filter}"

        params = {
            'q': query,
            'hl': 'id',
            'gl': 'ID',
            'ceid': 'ID:id',
        }

        try:
            async with self.session.get(
                GOOGLE_NEWS_RSS_URL, params=params
            ) as response:
                if response.status != 200:
                    logger.error(
                        f"Google News RSS untuk '{keyword}' mengembalikan HTTP {response.status}"
                    )
                    return []
                xml_text = await response.text(errors='ignore')
        except Exception as e:
            logger.error(f"Gagal fetch Google News RSS untuk '{keyword}': {e}")
            return []

        items = []
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError as e:
            logger.error(f"Gagal parse XML Google News RSS '{keyword}': {e}")
            return []

        for item in root.iter('item'):
            title = (item.findtext('title') or '').strip()
            link = (item.findtext('link') or '').strip()
            pub_date = (item.findtext('pubDate') or '').strip()
            description = self._strip_html(item.findtext('description') or '')
            source = (item.findtext('source') or '').strip()

            if not title or not link:
                continue

            items.append({
                'title': title,
                'link': link,
                'canonical': link,
                'published_at': self._parse_published_at(pub_date),
                'description': description,
                'source': source,
            })

        logger.info(
            f"Google News RSS untuk '{keyword}': {len(items)} artikel ditemukan"
        )
        self.audit.inc('google_raw', len(items))
        return items

    async def _resolve_single_link(self, page, link: str) -> Optional[str]:
        """Resolve satu link interstitial ke URL asli (polling singkat).

        Tanpa blokir resource: halaman interstitial Google News mengeksekusi
        redirect JS hanya jika resource pentingnya dimuat normal (terverifikasi:
        route blocking menyebabkan net::ERR_ABORTED dan redirect tidak jalan).
        """
        try:
            await page.goto(
                link,
                wait_until='domcontentloaded',
                timeout=15000,
            )
            # Polling: URL asli muncul setelah JS redirect, biasanya < 2 detik
            for _ in range(12):
                url = page.url
                if url and 'news.google.com' not in url:
                    return url
                await asyncio.sleep(0.5)
            return None
        except Exception as e:
            logger.debug(f"Gagal resolve Google News: {str(e)[:80]}")
            return None

    async def _resolve_google_news_links(
        self, items: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Resolve link interstitial Google News ke URL artikel asli.

        Halaman interstitial news.google.com dirender JavaScript; tanpa
        browser, URL asli tidak tersedia (sudah diverifikasi: meta refresh,
        noscript, canonical, base64 - semuanya kosong). Playwright Chromium
        dipakai hanya untuk mengikuti redirect, lalu browser ditutup.
        Artikel yang gagal di-resolve (tetap di news.google.com) dibuang.

        Resource berat (gambar/font/css/gstatic) diblokir dan beberapa
        halaman diproses bersamaan untuk mempercepat resolve.

        Fallback: jika browser tidak tersedia, artikel Google News dilewati.
        """
        pending = [
            item for item in items if 'news.google.com' in (item.get('link') or '')
        ]
        if not pending:
            return items

        if not self.browser:
            logger.warning(
                f"Browser tidak tersedia - {len(pending)} artikel Google News dilewati"
            )
            for item in pending:
                self.audit.reject(
                    'resolve_skipped_no_browser',
                    title=item.get('title', ''),
                    url=item.get('link', ''),
                    detail='browser/Playwright tidak tersedia di run ini',
                )
            return []

        self.audit.inc('resolve_attempt', len(pending))
        logger.info(
            f"Meresolve {len(pending)} link Google News ke artikel asli (Playwright)..."
        )

        resolved_urls = {}
        item_by_link = {item.get('link'): item for item in pending}
        pages = []
        context = None
        try:
            context = await self.browser.new_context(
                user_agent=self.headers['User-Agent'],
                locale='id-ID',
            )

            worker_count = max(1, min(
                self.google_resolve_concurrency, len(pending)
            ))
            for _ in range(worker_count):
                pages.append(await context.new_page())

            async def worker(page, links) -> List[Tuple[str, Optional[str]]]:
                """Satu page = satu worker; goto berurutan (menghindari
                navigasi konkuren pada page yang sama yang memicu
                net::ERR_ABORTED)."""
                results: List[Tuple[str, Optional[str]]] = []
                for link in links:
                    final_url = await self._resolve_single_link(page, link)
                    results.append((link, final_url))
                return results

            chunks = [
                [item['link'] for item in pending[i::worker_count]]
                for i in range(worker_count)
            ]
            worker_results = await asyncio.gather(*[
                worker(pages[i], chunks[i]) for i in range(worker_count)
            ])

            for idx, chunk in enumerate(worker_results, 1):
                for link, final_url in chunk:
                    if (
                        final_url
                        and 'news.google.com' not in final_url
                        and final_url.startswith('http')
                    ):
                        resolved_urls[link] = final_url
                    else:
                        item = item_by_link.get(link, {})
                        self.audit.reject(
                            'resolve_failed',
                            title=item.get('title', ''),
                            url=link,
                            detail='redirect JS tidak selesai / tetap di news.google.com / timeout 15s',
                        )
                if idx % 20 == 0:
                    logger.info(
                        f"Resolve Google News: {idx * worker_count}/{len(pending)} "
                        f"({len(resolved_urls)} sukses)"
                    )
            await context.close()
        except Exception as e:
            logger.error(f"Gagal resolve Google News links: {e}")
            if context:
                await context.close()

        resolved = []
        for item in items:
            final_url = resolved_urls.get(item.get('link'))
            if not final_url:
                continue
            item['link'] = final_url
            item['canonical'] = final_url
            if not item.get('source'):
                item['source'] = urlparse(final_url).netloc
            resolved.append(item)

        self.audit.inc('resolve_success', len(resolved))
        logger.info(
            f"Google News resolved: {len(resolved)}/{len(pending)} artikel ke URL asli"
        )
        return resolved

    async def _load_all_feed_items(self) -> List[Dict[str, Any]]:
        """Load semua item dari semua RSS feed (dedupe per URL)."""
        all_items: List[Dict[str, Any]] = []
        seen: set = set()

        for feed_url in self.rss_feeds:
            items = await self._fetch_feed_items(feed_url)
            for item in items:
                if item['link'] in seen:
                    continue
                seen.add(item['link'])
                item['canonical'] = item['link']
                all_items.append(item)
            await asyncio.sleep(1)

        logger.info(f"Total {len(all_items)} artikel unik dari {len(self.rss_feeds)} feed")
        return all_items

    async def _load_all_candidates(self) -> List[Dict[str, Any]]:
        """Load semua kandidat artikel dari semua sumber.

        Sumber:
        1. RSS feed situs berita (item terbaru).
        2. Bing News RSS search per query (count diperbesar).
        3. Google News RSS search per query (di-resolve via Playwright).

        Dedupe global berbasis canonical URL (URL artikel asli), sehingga
        artikel yang sama dari sumber/query berbeda hanya diproses sekali.
        Kandidat yang tidak memuat keyword aktif di judul/deskripsi dibuang
        di sini untuk menghemat fetch halaman artikel.
        """
        candidates: List[Dict[str, Any]] = []
        seen: set = set()

        feed_items = await self._load_all_feed_items()
        for item in feed_items:
            if self._matches_keywords(f"{item['title']} {item['description']}"):
                if item['canonical'] in seen:
                    continue
                seen.add(item['canonical'])
                self.audit.inc('cand_feed')
                candidates.append(item)

        queries = self._build_search_queries()
        logger.info(f"Query pencarian ({len(queries)}): {queries}")

        for query in queries:
            bing_items = await self._fetch_bing_items(query)
            for item in bing_items:
                if not self._matches_keywords(
                    f"{item['title']} {item['description']}"
                ):
                    continue
                if item['canonical'] in seen:
                    continue
                seen.add(item['canonical'])
                self.audit.inc('cand_bing')
                candidates.append(item)
            await asyncio.sleep(1)

        if self.google_news_enabled:
            google_items: List[Dict[str, Any]] = []
            seen_titles: set = set()
            for query in queries:
                q_items = await self._fetch_google_news_items(query)

                # Pre-filter keyword sebelum resolve (hemat waktu browser)
                prefiltered = [
                    item for item in q_items
                    if self._matches_keywords(
                        f"{item['title']} {item['description']}"
                    )
                ]
                self.audit.inc('google_prefilter_pass', len(prefiltered))
                self.audit.inc(
                    'google_prefilter_reject', len(q_items) - len(prefiltered)
                )
                q_items = prefiltered

                # Ambil artikel terbaru saja per query, dan buang judul
                # duplikat lintas query (artikel sama dari banyak query)
                q_items.sort(
                    key=lambda item: item.get('published_at') or datetime.min,
                    reverse=True,
                )
                kept = 0
                for item in q_items:
                    title_key = re.sub(r'[^a-z0-9]+', ' ', item['title'].lower()).strip()
                    if title_key in seen_titles:
                        self.audit.inc('google_title_dup')
                        continue
                    if kept >= self.google_max_per_query:
                        break
                    seen_titles.add(title_key)
                    google_items.append(item)
                    kept += 1
                await asyncio.sleep(0.5)

            logger.info(
                f"Google News pre-filter: {len(google_items)} artikel unik "
                f"(max {self.google_max_per_query}/query) untuk di-resolve"
            )
            google_resolved = await self._resolve_google_news_links(google_items)
            for item in google_resolved:
                if item['canonical'] in seen:
                    continue
                seen.add(item['canonical'])
                self.audit.inc('cand_google')
                candidates.append(item)

        self.audit.inc('candidates_total', len(candidates))
        logger.info(
            f"Total {len(candidates)} kandidat unik dari feed situs + "
            f"Bing News + Google News"
        )
        return candidates

    # ------------------------------------------------------------------
    # Article extraction
    # ------------------------------------------------------------------

    def _find_content_block(self, soup: BeautifulSoup) -> Optional[Any]:
        """Temukan blok konten artikel (selector eksplisit, lalu fallback)."""
        best = None
        for selector in CONTENT_SELECTORS:
            block = soup.select_one(selector)
            if block is None:
                continue
            count = len(block.find_all('p'))
            if best is None or count > best[1]:
                best = (block, count)

        if best and best[1] >= 2:
            return best[0]

        # Fallback: blok div dengan paragraf terbanyak
        best = None
        for div in soup.find_all('div'):
            count = len(div.find_all('p'))
            if best is None or count > best[1]:
                best = (div, count)

        if best and best[1] > 0:
            return best[0]
        return None

    def extract_article_content(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract article content from HTML"""
        article = {}

        try:
            # Title
            title_tag = (
                soup.find('h1')
                or soup.find('meta', {'property': 'og:title'})
                or soup.find('meta', {'name': 'twitter:title'})
                or soup.find('title')
            )

            if title_tag:
                if title_tag.name == 'meta':
                    article['title'] = title_tag.get('content', '').strip()
                else:
                    article['title'] = title_tag.get_text(strip=True)

            # Content
            block = self._find_content_block(soup)
            if block is not None:
                paragraphs = [
                    p.get_text(strip=True) for p in block.find_all('p')
                ]
                text = ' '.join(paragraphs)

                # Jika paragraf sedikit, ambil teks langsung dari blok
                # (beberapa situs menaruh isi di div tanpa <p>)
                if len(text) < 200:
                    block_text = block.get_text(' ', strip=True)
                    if len(block_text) > len(text):
                        text = block_text

                article['content'] = text
            else:
                # Fallback terakhir: semua paragraf di halaman
                paragraphs = soup.find_all('p')
                article['content'] = ' '.join(
                    p.get_text(strip=True) for p in paragraphs[:40]
                )

            # Images
            images = []
            for img in soup.find_all('img')[:5]:
                src = (
                    img.get('src')
                    or img.get('data-src')
                    or img.get('data-lazy-src')
                )
                if src and src.startswith('http'):
                    images.append(src)
            article['images'] = images

        except Exception as e:
            logger.error(f"Error extracting article content: {e}")

        return article

    # ------------------------------------------------------------------
    # Scraping
    # ------------------------------------------------------------------

    async def _fetch_article(
        self, url: str, title: str = ''
    ) -> Optional[Tuple[str, BeautifulSoup]]:
        """Fetch halaman artikel dengan retry untuk error jaringan sementara.

        Retry maksimal WEBSITE_DOWNLOAD_RETRIES (default 2) dengan
        exponential backoff (2s, 4s) HANYA untuk error jaringan sementara:
        DNS/getaddrinfo, timeout, connection reset/aborted, payload terputus.
        HTTP 4xx (404/403) dan URL invalid langsung ditolak - tidak retry.
        Jika setelah retry tetap gagal, artikel di-reject.
        """
        self.audit.inc('download_attempt')
        max_attempts = self.download_retries + 1
        last_error: Optional[BaseException] = None

        for attempt in range(max_attempts):
            if attempt > 0:
                self.audit.inc('download_retry')
                delay = self.retry_base_delay * (2 ** (attempt - 1))
                logger.warning(
                    f"Retry download {attempt}/{self.download_retries} "
                    f"(backoff {delay:.1f}s): {url[:120]}"
                )
                await asyncio.sleep(delay)

            try:
                async with self.session.get(url, allow_redirects=True) as response:
                    if response.status != 200:
                        self.audit.reject(
                            'http_error',
                            title=title,
                            url=url,
                            detail=f'HTTP {response.status}',
                        )
                        return None
                    html = await response.text(errors='ignore')
                    self.audit.inc('download_ok')
                    return str(response.url), BeautifulSoup(html, 'html.parser')
            except aiohttp.InvalidURL as e:
                self.audit.reject(
                    'url_invalid', title=title, url=url, detail=str(e)[:120]
                )
                return None
            except RETRYABLE_DOWNLOAD_ERRORS as e:
                last_error = e
                logger.warning(
                    f"Download gagal (retryable): {type(e).__name__}: "
                    f"{str(e)[:100]} | {url[:120]}"
                )
                continue
            except Exception as e:
                # Error non-retryable di luar jaringan sementara - reject langsung
                self.audit.reject(
                    'download_error',
                    title=title,
                    url=url,
                    detail=f'{type(e).__name__}: {str(e)[:120]}',
                )
                return None

        # Semua percobaan gagal karena error jaringan sementara
        self.audit.reject(
            'download_error',
            title=title,
            url=url,
            detail=(
                f'{type(last_error).__name__}: {str(last_error)[:120]} - '
                f'gagal setelah {max_attempts} percobaan (retry habis)'
            ),
        )
        return None

    async def scrape_keyword(
        self,
        keyword: str,
        candidates: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Cari artikel relevan untuk satu keyword dari pool kandidat global.

        Kandidat sudah dikumpulkan sekali (feed situs + Bing + Google News)
        dan didedupe via canonical URL. Artikel yang sudah diproses oleh
        keyword sebelumnya tidak diproses ulang (self._processed_urls).

        Artikel yang lebih tua dari WEBSITE_MAX_AGE_DAYS dilewati.
        """
        logger.info(f"Mencari artikel untuk keyword: '{keyword}'")

        articles: List[Dict[str, Any]] = []

        for idx, item in enumerate(candidates):
            if len(articles) >= self.max_articles_per_keyword:
                self.audit.inc('quota_skip', len(candidates) - idx)
                logger.info(
                    f"Mencapai batas WEBSITE_MAX_ARTICLES_PER_KEYWORD "
                    f"({self.max_articles_per_keyword}) untuk '{keyword}' - "
                    f"{len(candidates) - idx} kandidat tersisa tidak diproses"
                )
                break

            canonical = item.get('canonical') or item['link']
            title = item.get('title', '')
            url = item.get('link', '')

            if canonical in self._processed_urls or item['link'] in self._processed_urls:
                self.audit.inc('dedupe_in_run')
                self.audit.reject(
                    'dedupe_in_run',
                    title=title,
                    url=url,
                    detail='URL sudah diproses keyword lain di run ini',
                )
                continue

            # Lewati artikel yang sudah terlalu lama
            if self._is_too_old(item['published_at']):
                self.audit.inc('too_old')
                self.audit.reject(
                    'tanggal_terlalu_lama',
                    title=title,
                    url=url,
                    detail=(
                        f'> {self.max_age_days} hari (published_at='
                        f"{item.get('published_at')})"
                    ),
                )
                continue

            # Tandai sebagai diproses (dedupe lintas keyword dalam 1 run)
            self._processed_urls.add(canonical)
            self._processed_urls.add(item['link'])

            # Rate limiting antar request
            await asyncio.sleep(self.fetch_delay)

            fetched = await self._fetch_article(item['link'], title=title)
            if not fetched:
                continue

            final_url, soup = fetched
            if (
                final_url in self._processed_urls
                and final_url != canonical
                and final_url != item['link']
            ):
                # Redirect artikel ini bertabrakan dengan URL yang sudah
                # diproses sebagai artikel LAIN (bukan dirinya sendiri).
                self.audit.inc('dedupe_in_run')
                self.audit.reject(
                    'dedupe_in_run',
                    title=title,
                    url=final_url,
                    detail='URL akhir (setelah redirect) sudah diproses sebelumnya',
                )
                continue
            self._processed_urls.add(final_url)

            article_data = self.extract_article_content(soup)
            article_data['url'] = final_url
            article_data['title'] = article_data.get('title') or item['title']
            article_data['source'] = item['source']
            article_data['published_at'] = self._normalize_published_at(
                item['published_at']
            )

            # Audit tahap extract: apakah title & content berhasil didapat.
            # Konten kosong atau < 200 karakter HARUS ditolak (P4).
            self.audit.inc('extract_total')
            content = (article_data.get('content') or '').strip()
            if not content:
                self.audit.inc('content_empty')
                self.audit.reject(
                    'content_empty',
                    title=article_data.get('title', '') or title,
                    url=final_url,
                    detail='extract tidak menemukan konten (halaman JS/anti-bot?) - minimal 200 karakter',
                )
                continue
            if len(content) < 200:
                self.audit.inc('content_short')
                self.audit.reject(
                    'content_too_short',
                    title=article_data.get('title', '') or title,
                    url=final_url,
                    detail=f'konten hanya {len(content)} karakter, minimal 200',
                )
                continue
            self.audit.inc('extract_ok')
            if not article_data.get('title'):
                self.audit.inc('title_empty')
                self.audit.flag(
                    'title_empty',
                    title=title,
                    url=final_url,
                    detail='judul tidak ditemukan (h1/og:title/title kosong)',
                )

            # Verifikasi relevansi pada konten asli artikel
            full_text = (
                f"{article_data.get('title', '')} {article_data.get('content', '')}"
            )
            if not self._matches_keywords(full_text):
                self.audit.inc('keyword_not_found')
                self.audit.reject(
                    'keyword_not_found',
                    title=article_data.get('title', ''),
                    url=final_url,
                    detail=(
                        f'keyword aktif tidak ada di judul+konten asli '
                        f'({len(full_text)} char)'
                    ),
                )
                continue

            self.audit.inc('keyword_pass')
            articles.append(article_data)
            logger.info(
                f"✓ Artikel relevan: {article_data.get('title', '')[:80]} "
                f"(sumber: {article_data['source']})"
            )

        logger.info(f"Ditemukan {len(articles)} artikel relevan untuk '{keyword}'")
        return articles

    async def process_article(self, article_data: Dict[str, Any]) -> str:
        """Process and save a single article (flow yang sudah ada).

        Returns: 'saved' | 'duplicate' | 'error'
        """
        self.audit.inc('db_insert_attempt')
        title = article_data.get('title', '')
        url = article_data.get('url', '')

        try:
            url = article_data['url']
            domain = urlparse(url).netloc

            # Upsert influencer (domain sebagai identitas sumber)
            influencer_data = {
                'platform_id': self.platform_id,
                'platform_user_id': domain,
                'username': domain,
                'full_name': article_data.get('source') or domain,
                'profile_picture_url': (
                    article_data.get('images', [''])[0]
                    if article_data.get('images') else None
                ),
            }

            influencer_id = await self.db.upsert_influencer(influencer_data)

            # Analyze sentiment
            content = (
                f"{article_data.get('title', '')} {article_data.get('content', '')}"
            ).strip()
            sentiment, sentiment_score = sentiment_analyzer.analyze(content)

            # Platform post ID: hash URL stabil agar dedupe antar run bekerja
            post_id = hashlib.sha1(url.encode('utf-8')).hexdigest()

            article_insert_data = {
                'platform_id': self.platform_id,
                'influencer_id': influencer_id,
                'platform_post_id': post_id,
                'post_type': 'article',
                'content': content[:5000],
                'media_urls': article_data.get('images', []),
                'post_url': url,
                'likes_count': 0,
                'comments_count': 0,
                'shares_count': 0,
                'views_count': 0,
                'sentiment': sentiment,
                'sentiment_score': sentiment_score,
                'hashtags': [],
                'mentions': [],
                'location': '',
                'posted_at': article_data.get('published_at') or datetime.utcnow(),
                'metadata': {
                    'title': article_data.get('title'),
                    'source': domain,
                    'source_name': article_data.get('source'),
                    'published_at': (
                        article_data.get('published_at').isoformat()
                        if article_data.get('published_at') else None
                    ),
                },
            }

            # Insert article (dedupe ON CONFLICT DO NOTHING)
            article_id = await self.db.insert_post(article_insert_data)

            if article_id:
                self.audit.inc('db_saved')
                logger.info(
                    f"✓ Saved article dari {domain}: "
                    f"{article_data.get('title', '')[:60]}"
                )
                return 'saved'

            self.audit.inc('db_duplicate')
            self.audit.reject(
                'db_duplicate',
                title=title,
                url=url,
                detail='ON CONFLICT DO NOTHING - artikel sudah ada di tabel posts (run sebelumnya)',
            )
            return 'duplicate'

        except Exception as e:
            self.audit.inc('db_error')
            self.audit.reject(
                'db_error',
                title=title,
                url=url,
                detail=f'{type(e).__name__}: {str(e)[:200]}',
            )
            logger.error(f"Error processing article: {e}")
            return 'error'

    async def run(self):
        """Main worker loop"""
        logger.info("=" * 60)
        logger.info("Starting Website scraper run...")
        logger.info("=" * 60)

        # Cross-process lock: cegah dua instance website scraper berjalan
        # bersamaan (manual Terminal + run_all.py + backend trigger).
        lock = WorkerLock('website')
        if not await lock.acquire(self.db):
            logger.warning(
                "Website scraper dilewati: instance lain sudah berjalan "
                "(lock aktif). Jalankan setelah proses sebelumnya selesai."
            )
            return

        job_id = None
        articles_collected = 0
        duplicates = 0
        errors = 0

        try:
            job_id = await self.db.create_scraping_job(self.platform_id)

            # Load semua kandidat (feed situs + Bing News + Google News)
            candidates = await self._load_all_candidates()

            if not candidates:
                logger.warning(
                    "Tidak ada kandidat artikel relevan - scrape selesai"
                )
            else:
                # Urutkan dari artikel TERBARU dulu (kualitas hasil).
                # Sebelumnya ascending (terlama diproses duluan) sehingga
                # artikel fresh terlewat saat quota tercapai.
                candidates.sort(
                    key=lambda item: (
                        item.get('published_at') is None,
                        -(item.get('published_at').timestamp())
                        if item.get('published_at') else 0,
                    ),
                )

                logger.info(f"Memproses {len(candidates)} kandidat artikel unik")

                for keyword in self.keywords:
                    logger.info(f"\n📍 Processing keyword: {keyword}")

                    articles = await self.scrape_keyword(keyword, candidates)

                    logger.info(f"Found {len(articles)} articles for {keyword}")

                    for article in articles:
                        result = await self.process_article(article)
                        if result == 'saved':
                            articles_collected += 1
                        elif result == 'duplicate':
                            duplicates += 1
                        else:
                            errors += 1

                    # Rate limiting antar keyword
                    await asyncio.sleep(2)

            if job_id:
                await self.db.update_scraping_job(
                    job_id, 'completed', articles_collected, errors
                )

            logger.info("=" * 60)
            logger.info(
                f"✓ Website scraper completed! Articles saved: {articles_collected}, "
                f"Duplicates: {duplicates}, Errors: {errors}"
            )
            logger.info("=" * 60)

            # Laporan audit angka per tahap pipeline + alasan penolakan
            self.audit.report()

        except Exception as e:
            logger.error(f"Website scraper failed: {e}")
            if job_id:
                await self.db.update_scraping_job(
                    job_id, 'failed', articles_collected, errors, str(e)
                )
        finally:
            await lock.release()


async def main():
    """Main entry point"""
    logger.add("logs/website_scraper.log", rotation="1 day", retention="7 days")
    logger.info("=" * 60)
    logger.info("Website Scraper - Festival Mbois Intelligence Platform")
    logger.info("=" * 60)

    scraper = WebsiteScraper()

    try:
        await scraper.initialize()
        await scraper.run()
    except Exception as e:
        logger.error(f"Scraper error: {e}")
    finally:
        await scraper.close()


if __name__ == "__main__":
    asyncio.run(main())
