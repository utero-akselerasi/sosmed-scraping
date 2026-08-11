"""
TikTok Apify Provider - clockworks/tiktok-scraper (pay-per-event).
Festival Mbois Intelligence Platform

Provider koleksi data TikTok via Apify REST API v2 menggunakan Actor
pay-per-event `clockworks/tiktok-scraper` (TANPA langganan bulanan).

Hanya data REAL yang dikembalikan:
- Item error dari Actor (memiliki field errorCode) dilewati.
- Tidak ada fallback dummy/sample data.

Pengaman biaya (hard safety):
- `maxChargePerRun` dikirim sebagai run option - Actor berhenti
  otomatis saat mencapai batas biaya per run.
- `resultsPerPage` dibatasi oleh TIKTOK_MAX_POSTS_PER_KEYWORD.
- Semua opsi download (video/cover/avatar/music) = false.
- Token Apify TIDAK PERNAH dicetak ke log / error message.
"""

import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from loguru import logger

try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False
    logger.warning("aiohttp not available. Install with: pip install aiohttp")

APIFY_API_BASE = "https://api.apify.com/v2"
DEFAULT_ACTOR_ID = "clockworks/tiktok-scraper"

FINAL_STATUSES = {"SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"}
RUN_START_FEE_CAP = 1.0


class ApifyTikTokError(Exception):
    """Error dari Apify dengan kategori jelas (tanpa credential)."""


class ApifyTikTokProvider:
    """Provider koleksi TikTok via Apify Actor clockworks/tiktok-scraper.

    Antarmuka: prepare() / initialize() / search_keyword(keyword) / close().
    search_keyword mengembalikan list post data dengan struktur yang sama
    dengan worker lain (lihat normalize_item).
    """

    def __init__(self, worker):
        self.worker = worker
        self.token = worker.apify_token
        self.actor_id = worker.actor_id
        self.max_posts_per_keyword = worker.max_posts_per_keyword
        self.max_charge_per_run = worker.max_charge_per_run
        self.run_timeout_seconds = worker.run_timeout_seconds
        self.max_retries = worker.max_retries
        self._session: Optional[Any] = None
        self.run_costs: List[Dict[str, Any]] = []

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def prepare(self) -> Optional[str]:
        """Cek prasyarat (token + aiohttp). None jika siap."""
        if not self.token:
            return (
                "TikTok worker dihentikan: APIFY_TOKEN tidak diatur "
                "di environment"
            )
        if not AIOHTTP_AVAILABLE:
            return (
                "TikTok worker dihentikan: aiohttp tidak tersedia "
                "(pip install aiohttp)"
            )
        return None

    async def initialize(self) -> None:
        """Buka session HTTP untuk semua permintaan pada run ini."""
        self._session = aiohttp.ClientSession()

    async def close(self) -> None:
        """Tutup session HTTP."""
        if self._session is not None:
            try:
                await self._session.close()
            except Exception:
                pass
            self._session = None

    # ------------------------------------------------------------------
    # HTTP helpers
    # ------------------------------------------------------------------

    def _headers(self) -> Dict[str, str]:
        # Token dikirim via header Authorization - TIDAK pernah di-log.
        return {
            'Authorization': f'Bearer {self.token}',
            'User-Agent': (
                'FestivalMboisIntelligencePlatform/1.0 '
                '(compatible; +https://festivalmbois.example)'
            ),
        }

    async def _request_json(
        self,
        method: str,
        url: str,
        params: Optional[Dict[str, str]] = None,
        json_body: Optional[Dict[str, Any]] = None,
        timeout_seconds: int = 60,
    ) -> Any:
        """Request JSON ke Apify API dengan retry sederhana."""
        last_error: Optional[Exception] = None

        for attempt in range(1, self.max_retries + 1):
            try:
                async with self._session.request(
                    method,
                    url,
                    params=params,
                    headers=self._headers(),
                    json=json_body,
                    timeout=aiohttp.ClientTimeout(total=timeout_seconds),
                ) as response:
                    status = response.status
                    body = ''
                    try:
                        body = (await response.text())[:400]
                    except Exception:
                        pass

                    if status in (200, 201):
                        return await response.json()

                    if status == 401:
                        raise ApifyTikTokError(
                            "Autentikasi Apify gagal (HTTP 401) - "
                            "periksa APIFY_TOKEN"
                        )
                    if status == 403:
                        raise ApifyTikTokError(
                            "Akses Apify ditolak (HTTP 403) - token tidak "
                            "memiliki izin atau plan tidak mencukupi"
                        )
                    if status == 429:
                        if attempt < self.max_retries:
                            await asyncio.sleep(10 * attempt)
                            continue
                        raise ApifyTikTokError(
                            "Apify rate limit tercapai (HTTP 429) - "
                            "coba lagi nanti"
                        )
                    if status in (400, 422):
                        raise ApifyTikTokError(
                            f"Request Apify ditolak (HTTP {status}): {body}"
                        )
                    if status == 500:
                        raise ApifyTikTokError(
                            "Apify server error (HTTP 500) - coba lagi nanti"
                        )
                    raise ApifyTikTokError(
                        f"Apify unexpected response (HTTP {status})"
                    )
            except ApifyTikTokError:
                raise
            except asyncio.TimeoutError as e:
                last_error = e
                if attempt < self.max_retries:
                    await asyncio.sleep(2 ** (attempt - 1) * 2)
                    continue
                raise ApifyTikTokError(
                    "Timeout menghubungi Apify API"
                ) from e
            except aiohttp.ClientError as e:
                last_error = e
                if attempt < self.max_retries:
                    await asyncio.sleep(2 ** (attempt - 1) * 2)
                    continue
                raise ApifyTikTokError(
                    f"Gagal terhubung ke Apify API: {type(e).__name__}"
                ) from e
            except Exception as e:
                raise ApifyTikTokError(
                    f"Error Apify tak terduga: {type(e).__name__}"
                ) from e

        if last_error is not None:
            raise ApifyTikTokError(
                f"Request Apify gagal setelah {self.max_retries} percobaan"
            )
        raise ApifyTikTokError("Request Apify gagal tanpa detail")

    # ------------------------------------------------------------------
    # Informasi akun (gratis, tanpa biaya)
    # ------------------------------------------------------------------

    async def get_account_info(self) -> Dict[str, Any]:
        """Ambil info akun Apify (plan) + usage bulanan.

        Gratis (bukan run Actor). Dipakai hanya untuk pelaporan sisa
        kuota; nilai apa pun yang tersedia dibaca defensif.
        """
        info: Dict[str, Any] = {}
        try:
            payload = await self._request_json(
                'GET', f"{APIFY_API_BASE}/users/me"
            )
            if isinstance(payload, dict):
                payload = payload.get('data') or payload
                plan = payload.get('plan') or {}
                profile = payload.get('profile') or {}
                info['username'] = (
                    payload.get('username')
                    or profile.get('username')
                    or profile.get('name')
                )
                info['plan_id'] = plan.get('id')
                info['plan_name'] = plan.get('name')
                info['monthly_usage_credits_usd'] = (
                    plan.get('monthlyUsageCreditsUsd')
                )
                info['max_monthly_usage_usd'] = (
                    plan.get('maxMonthlyUsageUsd')
                )
        except Exception as e:
            logger.debug(f"Gagal membaca info akun Apify: {e}")

        try:
            payload = await self._request_json(
                'GET', f"{APIFY_API_BASE}/users/me/usage"
            )
            if isinstance(payload, dict):
                for key in (
                    'monthlyUsageUsd', 'availableCreditsUsd',
                    'remainingCreditsUsd', 'usageUsd', 'platformUsageUsd',
                ):
                    if payload.get(key) is not None:
                        info[key] = payload[key]
        except Exception as e:
            logger.debug(f"Gagal membaca usage Apify: {e}")

        return info

    # ------------------------------------------------------------------
    # Build input Actor
    # ------------------------------------------------------------------

    def _actor_path(self) -> str:
        """Path REST untuk Actor: username~name (bukan username/name)."""
        return self.actor_id.replace('/', '~')

    def build_run_input(self, keyword: str) -> Dict[str, Any]:
        """Bangun input Actor dari keyword.

        Keyword berawalan '#' -> hashtag scrape (lebih presisi).
        Keyword lain -> search query TikTok (hasil video publik).
        """
        limit = max(1, int(self.max_posts_per_keyword))

        base: Dict[str, Any] = {
            "resultsPerPage": limit,
            "maxFollowersPerProfile": 0,
            "maxFollowingPerProfile": 0,
            "commentsPerPost": 0,
            "topLevelCommentsPerPost": 0,
            "maxRepliesPerComment": 0,
            "excludePinnedPosts": False,
            "scrapeRelatedVideos": False,
            "scrapeRelatedSearchWords": False,
            "scrapeAdditionalAuthorMeta": False,
            "shouldDownloadVideos": False,
            "shouldDownloadCovers": False,
            "shouldDownloadSlideshowImages": False,
            "shouldDownloadAvatars": False,
            "shouldDownloadMusicCovers": False,
            "downloadSubtitlesOptions": "NEVER_DOWNLOAD_SUBTITLES",
            "proxyCountryCode": "None",
        }

        stripped = keyword.strip().lstrip('#')
        if not stripped:
            return {}

        if keyword.strip().startswith('#'):
            base["hashtags"] = [stripped]
        else:
            base["searchQueries"] = [keyword.strip()]
            base["searchSection"] = ""
            base["maxProfilesPerQuery"] = 1

        return base

    # ------------------------------------------------------------------
    # Normalisasi item TikTok -> post data
    # ------------------------------------------------------------------

    def normalize_item(
        self,
        item: Dict[str, Any],
        keyword: str,
        apify_run_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Map satu item hasil Actor ke worker post data (format internal).

        Item error (errorCode) dilewati - bukan post.
        """
        if not isinstance(item, dict):
            return None
        if item.get('errorCode'):
            logger.debug(
                f"Item error TikTok dilewati: "
                f"{item.get('errorCode')} ({item.get('input')})"
            )
            return None

        post_id = str(item.get('id') or '')
        if not post_id:
            return None

        author = item.get('authorMeta') or {}
        username = (author.get('name') or '').lower()
        full_name = author.get('nickName') or username or ''
        profile_picture_url = author.get('avatar') or ''
        is_verified = bool(author.get('verified'))
        followers_count = int(author.get('fans') or 0)

        text = item.get('text') or ''
        create_time_iso = item.get('createTimeISO')
        posted_at = None
        if create_time_iso:
            try:
                parsed = datetime.fromisoformat(
                    str(create_time_iso).replace('Z', '+00:00')
                )
                posted_at = parsed.astimezone(timezone.utc).replace(tzinfo=None)
            except (ValueError, TypeError) as e:
                logger.warning(
                    f"TikTok {post_id} createTimeISO tidak valid "
                    f"({create_time_iso}): {e}"
                )

        video_meta = item.get('videoMeta') or {}
        cover_url = video_meta.get('coverUrl') or video_meta.get(
            'originalCoverUrl'
        ) or ''

        # URL kanonik TikTok asli
        post_url = item.get('webVideoUrl') or ''
        if not post_url:
            post_url = item.get('videoUrl') or ''

        # Hashtags dari struktur Actor
        raw_hashtags = item.get('hashtags') or []
        hashtags: List[str] = []
        if isinstance(raw_hashtags, list):
            for tag in raw_hashtags:
                if isinstance(tag, dict):
                    name = tag.get('name') or ''
                else:
                    name = str(tag)
                name = name.strip().lstrip('#')
                if name:
                    hashtags.append(name)

        # URL media: thumbnail/cover ditempatkan di index 0 agar
        # frontend (mediaUrls[0]) menampilkan cover video.
        media_urls: List[str] = []
        if cover_url:
            media_urls.append(cover_url)

        music_meta = item.get('musicMeta') or {}

        return {
            'platform_user_id': str(author.get('id') or ''),
            'username': username,
            'full_name': full_name,
            'profile_picture_url': profile_picture_url,
            'followers_count': followers_count,
            'is_verified': is_verified,

            'platform_post_id': post_id,
            'post_type': 'video',
            'content': text,
            'media_urls': media_urls,
            'post_url': post_url,

            'likes_count': int(item.get('diggCount') or 0),
            'comments_count': int(item.get('commentCount') or 0),
            'shares_count': int(item.get('shareCount') or 0),
            'views_count': int(item.get('playCount') or 0),

            'location': '',
            'posted_at': posted_at,

            'metadata': {
                'source': 'apify-clockworks-tiktok-scraper',
                'keyword': keyword,
                'search_query': item.get('searchQuery') or '',
                'apify_run_id': apify_run_id,
                'is_ad': bool(item.get('isAd')),
                'is_pinned': bool(item.get('isPinned')),
                'is_slideshow': bool(item.get('isSlideshow')),
                'music_name': music_meta.get('musicName') or '',
                'video_duration_seconds': int(
                    video_meta.get('duration') or 0
                ),
                'video_definition': video_meta.get('definition') or '',
            },
        }

    # ------------------------------------------------------------------
    # Jalankan Actor
    # ------------------------------------------------------------------

    async def start_run(self, run_input: Dict[str, Any]) -> Dict[str, Any]:
        """Mulai run Actor dan tunggu hingga selesai (polling).

        Mengembalikan dict run detail Apify (termasuk dataset id, status,
        dan biaya bila tersedia).
        """
        if not run_input:
            raise ApifyTikTokError("Input Actor TikTok kosong")

        run_options: Dict[str, Any] = {}
        if self.max_charge_per_run and self.max_charge_per_run > 0:
            run_options['maxChargePerRun'] = str(self.max_charge_per_run)
        if self.run_timeout_seconds and self.run_timeout_seconds > 0:
            run_options['timeout'] = str(self.run_timeout_seconds)

        url = f"{APIFY_API_BASE}/acts/{self._actor_path()}/runs"
        logger.info(
            f"Menjalankan Actor Apify '{self.actor_id}' "
            f"(maxChargePerRun=${self.max_charge_per_run}, "
            f"timeout={self.run_timeout_seconds}s)"
        )

        payload = await self._request_json(
            'POST', url, params=run_options, json_body=run_input,
            timeout_seconds=120,
        )
        if not isinstance(payload, dict):
            raise ApifyTikTokError("Respons start run Apify tidak valid")

        run_data = payload.get('data') or payload
        run_id = run_data.get('id')
        if not run_id:
            raise ApifyTikTokError(
                "Start run Apify tidak mengembalikan run id"
            )

        logger.info(f"Apify run dimulai: {run_id}")
        run = await self.wait_for_run(run_id)
        return run

    async def wait_for_run(self, run_id: str) -> Dict[str, Any]:
        """Polling status run hingga final atau timeout."""
        run_url = f"{APIFY_API_BASE}/actor-runs/{run_id}"
        deadline = asyncio.get_event_loop().time() + self.run_timeout_seconds + 60

        while True:
            payload = await self._request_json('GET', run_url)
            if not isinstance(payload, dict):
                raise ApifyTikTokError(
                    f"Respons run detail tidak valid ({run_id})"
                )

            status = payload.get('status') or ''
            if status in FINAL_STATUSES:
                self.run_costs.append(self.extract_run_cost(payload))
                self._log_run_cost(payload)
                return payload

            if asyncio.get_event_loop().time() > deadline:
                self._log_run_cost(payload)
                raise ApifyTikTokError(
                    f"Apify run {run_id} melewati batas waktu tunggu "
                    f"(status terakhir: {status})"
                )

            await asyncio.sleep(10)

    def _log_run_cost(self, run: Dict[str, Any]) -> None:
        """Log biaya run (PPE + platform usage) tanpa credential."""
        cost_fields = {
            'totalChargeUsd': run.get('totalChargeUsd'),
            'usageUsd': run.get('usageUsd'),
            'usageTotalUsd': run.get('usageTotalUsd'),
            'chargedEventCount': run.get('chargedEventCount'),
        }
        present = {k: v for k, v in cost_fields.items() if v is not None}
        if present:
            logger.info(
                f"Apify run {run.get('id')} biaya: "
                f"{', '.join(f'{k}={v}' for k, v in present.items())} USD"
            )

    def extract_run_cost(self, run: Dict[str, Any]) -> Dict[str, Any]:
        """Ekstrak info biaya run untuk disimpan ke scraping_jobs metadata."""
        cost: Dict[str, Any] = {}
        for key in (
            'totalChargeUsd', 'usageUsd', 'usageTotalUsd',
            'chargedEventCount',
        ):
            if run.get(key) is not None:
                cost[key] = run[key]
        return cost

    # ------------------------------------------------------------------
    # Fetch dataset items
    # ------------------------------------------------------------------

    async def fetch_dataset_items(
        self, dataset_id: str
    ) -> List[Dict[str, Any]]:
        """Ambil seluruh item dari dataset hasil run."""
        items_url = f"{APIFY_API_BASE}/datasets/{dataset_id}/items"
        payload = await self._request_json(
            'GET', items_url, params={'format': 'json'},
            timeout_seconds=120,
        )
        if not isinstance(payload, list):
            raise ApifyTikTokError(
                f"Respons dataset items tidak valid ({dataset_id})"
            )
        return [item for item in payload if isinstance(item, dict)]

    # ------------------------------------------------------------------
    # Public: search_keyword
    # ------------------------------------------------------------------

    async def search_keyword(self, keyword: str) -> List[Dict[str, Any]]:
        """Scrape post TikTok real untuk satu keyword via Actor Apify."""
        run_input = self.build_run_input(keyword)
        if not run_input:
            logger.error(
                f"Keyword '{keyword}' tidak menghasilkan input TikTok "
                f"yang valid"
            )
            return []

        logger.info(
            f"Scraping TikTok keyword: {keyword} "
            f"(max {self.max_posts_per_keyword} post)"
        )

        try:
            run = await self.start_run(run_input)
        except ApifyTikTokError as e:
            logger.error(f"Gagal menjalankan Apify untuk '{keyword}': {e}")
            self.worker.failures.append(str(e))
            return []

        run_id = run.get('id') or ''
        status = run.get('status') or ''

        if status != 'SUCCEEDED':
            message = run.get('statusMessage') or run.get('error')
            logger.error(
                f"Apify run {run_id} untuk '{keyword}' berakhir "
                f"{status}: {message or 'tanpa pesan'}"
            )
            self.worker.failures.append(
                f"Apify run {status}: {message or 'tanpa pesan'}"
            )
            return []

        dataset_id = run.get('defaultDatasetId')
        if not dataset_id:
            logger.error(
                f"Apify run {run_id} sukses tanpa defaultDatasetId"
            )
            self.worker.failures.append(
                "Apify run sukses tanpa dataset id"
            )
            return []

        try:
            items = await self.fetch_dataset_items(dataset_id)
        except ApifyTikTokError as e:
            logger.error(
                f"Gagal mengambil dataset {dataset_id} "
                f"untuk '{keyword}': {e}"
            )
            self.worker.failures.append(str(e))
            return []

        logger.info(
            f"Apify mengembalikan {len(items)} item untuk '{keyword}' "
            f"(run {run_id})"
        )

        posts_data = []
        for item in items:
            try:
                post_data = self.normalize_item(item, keyword, run_id)
            except Exception as e:
                logger.warning(
                    f"Item TikTok gagal dinormalisasi "
                    f"({item.get('id')}): {e}"
                )
                continue
            if post_data is None:
                continue
            if len(posts_data) >= self.max_posts_per_keyword:
                logger.info(
                    f"Mencapai batas TIKTOK_MAX_POSTS_PER_KEYWORD "
                    f"({self.max_posts_per_keyword}) untuk '{keyword}'"
                )
                break
            posts_data.append(post_data)

        logger.info(
            f"Scraped {len(posts_data)} post TikTok baru untuk '{keyword}'"
        )
        return posts_data
